package org.lpu.dev.codes.services;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.lpu.dev.codes.model.data.PendingOutboundEmail;
import org.lpu.dev.codes.repository.PendingOutboundEmailRepository;
import org.lpu.dev.codes.util.AppDateTimes;
import org.lpu.dev.codes.util.ReservationEmailThreadUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;

/**
 * Sends mail immediately, and when SMTP fails stores the message and retries
 * on a growing interval until it is accepted.
 */
@Service
public class EmailDeliveryService {

    private static final Logger logger = LogManager.getLogger(EmailDeliveryService.class);
    private static final int RETRY_BATCH = 15;
    private static final int ERROR_MAX = 500;

    @Autowired
    private JavaMailSender mailSender;

    @Autowired
    private PendingOutboundEmailRepository pendingRepository;

    @Autowired
    private AdminAuditService auditService;

    @Value("${spring.mail.username}")
    private String fromAddress;

    /**
     * @return true when Office 365 accepted the message on this attempt
     */
    public boolean sendReservationEmail(
            String to,
            String subject,
            String htmlBody,
            String serviceKey,
            Long reservationId,
            boolean threadRoot,
            String logLabel) {
        if (to == null || to.isBlank()) {
            return false;
        }
        String rootId = ReservationEmailThreadUtil.rootMessageId(serviceKey, reservationId);
        PendingOutboundEmail email = baseEmail(to, subject, htmlBody, logLabel);
        email.setReservationId(reservationId);
        email.setThreadTopic(subject);
        if (threadRoot) {
            email.setMessageId(rootId);
        } else {
            email.setMessageId(ReservationEmailThreadUtil.messageId(serviceKey, reservationId));
            email.setInReplyTo(rootId);
            email.setReferencesHeader(rootId);
        }
        return deliverNowOrQueue(email);
    }

    /**
     * Mail that is useless after a deadline (verification codes, reset links).
     * Retries stop once {@code retryFor} has elapsed.
     *
     * @return true when Office 365 accepted the message on this attempt
     */
    public boolean sendPlainEmail(String to, String subject, String htmlBody, String logLabel, Duration retryFor) {
        if (to == null || to.isBlank()) {
            return false;
        }
        PendingOutboundEmail email = baseEmail(to, subject, htmlBody, logLabel);
        if (retryFor != null) {
            email.setExpiresAt(AppDateTimes.nowUtc().plus(retryFor));
        }
        return deliverNowOrQueue(email);
    }

    @Scheduled(fixedDelay = 30_000, initialDelay = 15_000)
    public void retryPendingEmails() {
        List<PendingOutboundEmail> due = pendingRepository.findDue(AppDateTimes.nowUtc(), RETRY_BATCH);
        for (PendingOutboundEmail email : due) {
            retryOne(email);
        }
    }

    private boolean deliverNowOrQueue(PendingOutboundEmail email) {
        try {
            mailSender.send(toMessage(email));
            logger.info("{} email sent to {} — {}", email.getLogLabel(), email.getRecipient(), email.getSubject());
            audit(email, "EMAIL_SUCCESS", 1, null, null);
            return true;
        } catch (Exception e) {
            logger.error("Failed to send {} email to {} — {}: {}",
                    email.getLogLabel(), email.getRecipient(), email.getSubject(), e.getMessage(), e);
            queue(email, e);
            return false;
        }
    }

    private void retryOne(PendingOutboundEmail email) {
        LocalDateTime now = AppDateTimes.nowUtc();
        if (expired(email, now)) {
            pendingRepository.deleteById(email.getId());
            logger.warn("Stopped retrying {} email to {} — {} because it expired before it could be sent",
                    email.getLogLabel(), email.getRecipient(), email.getSubject());
            audit(email, "EMAIL_RETRY_FAILED", email.getAttemptCount(), "Expired before it could be sent", null);
            return;
        }
        try {
            mailSender.send(toMessage(email));
            int attempt = email.getAttemptCount() + 1;
            pendingRepository.deleteById(email.getId());
            logger.info("{} email sent to {} — {} after {} failed attempt(s)",
                    email.getLogLabel(), email.getRecipient(), email.getSubject(), email.getAttemptCount());
            audit(email, "EMAIL_RETRY_SUCCESS", attempt, null, null);
        } catch (Exception e) {
            int attempts = email.getAttemptCount() + 1;
            LocalDateTime next = now.plus(delayAfterFailure(attempts));
            if (email.getExpiresAt() != null && !next.isBefore(email.getExpiresAt())) {
                pendingRepository.deleteById(email.getId());
                logger.warn("Stopped retrying {} email to {} — {} after {} attempt(s); the message would arrive expired. Cause: {}",
                        email.getLogLabel(), email.getRecipient(), email.getSubject(), attempts, e.getMessage());
                audit(email, attempts > 1 ? "EMAIL_RETRY_FAILED" : "EMAIL_FAILED", attempts, e.getMessage(), null);
                return;
            }
            pendingRepository.reschedule(email.getId(), attempts, next, truncate(e.getMessage()));
            logger.warn("Failed to send {} email to {} — {} (attempt {}). Next try at {}. Cause: {}",
                    email.getLogLabel(), email.getRecipient(), email.getSubject(), attempts, next, e.getMessage());
            audit(email, "EMAIL_RETRY_FAILED", attempts, e.getMessage(), next);
        }
    }

    private void queue(PendingOutboundEmail email, Exception error) {
        LocalDateTime now = AppDateTimes.nowUtc();
        if (expired(email, now)) {
            logger.warn("Not queueing {} email to {} — {}; it is already expired",
                    email.getLogLabel(), email.getRecipient(), email.getSubject());
            audit(email, "EMAIL_FAILED", 1, error.getMessage(), null);
            return;
        }
        int attempts = 1;
        LocalDateTime next = now.plus(delayAfterFailure(attempts));
        if (email.getExpiresAt() != null && !next.isBefore(email.getExpiresAt())) {
            next = now.plusSeconds(30);
            if (!next.isBefore(email.getExpiresAt())) {
                logger.warn("Not queueing {} email to {} — {}; not enough time left to retry",
                        email.getLogLabel(), email.getRecipient(), email.getSubject());
                audit(email, "EMAIL_FAILED", 1, error.getMessage(), null);
                return;
            }
        }
        email.setAttemptCount(attempts);
        email.setNextAttemptAt(next);
        email.setLastError(truncate(error.getMessage()));
        email.setCreatedAt(now);
        try {
            pendingRepository.save(email);
            logger.warn("Queued {} email to {} — {} for retry at {}",
                    email.getLogLabel(), email.getRecipient(), email.getSubject(), next);
            audit(email, "EMAIL_FAILED", attempts, error.getMessage(), next);
        } catch (Exception saveError) {
            logger.error("Failed to queue {} email to {} — {} for retry: {}",
                    email.getLogLabel(), email.getRecipient(), email.getSubject(), saveError.getMessage(), saveError);
            audit(email, "EMAIL_FAILED", attempts, error.getMessage(), null);
        }
    }

    private void audit(
            PendingOutboundEmail email,
            String actionType,
            int attempt,
            String error,
            LocalDateTime nextRetryAt) {
        try {
            String subject = email.getSubject() == null ? "" : email.getSubject().trim();
            if (subject.length() > 255) {
                subject = subject.substring(0, 255);
            }
            auditService.log(
                    "EMAIL",
                    actionType,
                    "email-service",
                    "email",
                    email.getReservationId(),
                    subject,
                    AdminAuditService.detailsOf(
                            "recipient", email.getRecipient(),
                            "facility", email.getLogLabel(),
                            "attempt", attempt,
                            "retried", attempt > 1,
                            "error", error == null ? null : truncate(error),
                            "nextRetryAt", nextRetryAt == null ? null : nextRetryAt.toString()));
        } catch (Exception e) {
            logger.error("Failed to write email audit log for {}: {}", email.getRecipient(), e.getMessage(), e);
        }
    }

    /** 1 min, 2 min, 5 min, 10 min, then every 15 min until success. */
    static Duration delayAfterFailure(int failedAttempts) {
        return switch (failedAttempts) {
            case 1 -> Duration.ofMinutes(1);
            case 2 -> Duration.ofMinutes(2);
            case 3 -> Duration.ofMinutes(5);
            case 4 -> Duration.ofMinutes(10);
            default -> Duration.ofMinutes(15);
        };
    }

    private static boolean expired(PendingOutboundEmail email, LocalDateTime now) {
        return email.getExpiresAt() != null && !email.getExpiresAt().isAfter(now);
    }

    private static PendingOutboundEmail baseEmail(String to, String subject, String htmlBody, String logLabel) {
        PendingOutboundEmail email = new PendingOutboundEmail();
        email.setRecipient(to.trim());
        email.setSubject(subject);
        email.setHtmlBody(htmlBody);
        email.setLogLabel(logLabel);
        return email;
    }

    private MimeMessage toMessage(PendingOutboundEmail email) throws Exception {
        MimeMessage msg = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(msg, false, "UTF-8");
        helper.setFrom(fromAddress);
        helper.setTo(email.getRecipient());
        helper.setSubject(email.getSubject());
        helper.setText(email.getHtmlBody(), true);
        if (email.getMessageId() != null) {
            msg.setHeader("Message-ID", email.getMessageId());
        }
        if (email.getInReplyTo() != null) {
            msg.setHeader("In-Reply-To", email.getInReplyTo());
            msg.setHeader("References", email.getReferencesHeader());
        }
        if (email.getThreadTopic() != null) {
            msg.setHeader("Thread-Topic", email.getThreadTopic());
        }
        return msg;
    }

    private static String truncate(String message) {
        if (message == null || message.isBlank()) {
            return "send failed";
        }
        String trimmed = message.trim();
        return trimmed.length() <= ERROR_MAX ? trimmed : trimmed.substring(0, ERROR_MAX);
    }
}
