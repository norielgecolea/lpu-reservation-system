package org.lpu.dev.codes.model.data;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

/**
 * An email whose first SMTP attempt failed. Retried until it is accepted,
 * or until {@link #expiresAt} when the message is only useful for a short time.
 */
@Entity
@Table(
        name = "pending_outbound_emails",
        indexes = @Index(name = "idx_pending_outbound_email_next", columnList = "next_attempt_at"))
public class PendingOutboundEmail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "recipient", nullable = false, length = 320)
    private String recipient;

    @Column(name = "subject", nullable = false, length = 500)
    private String subject;

    @Column(name = "html_body", nullable = false, columnDefinition = "TEXT")
    private String htmlBody;

    @Column(name = "message_id", length = 255)
    private String messageId;

    @Column(name = "in_reply_to", length = 255)
    private String inReplyTo;

    @Column(name = "references_header", length = 255)
    private String referencesHeader;

    @Column(name = "thread_topic", length = 500)
    private String threadTopic;

    /** Short name used in logs, such as FLT or Reservation OTP. */
    @Column(name = "log_label", nullable = false, length = 40)
    private String logLabel;

    /** Reservation this message belongs to, when it is a reservation email. */
    @Column(name = "reservation_id")
    private Long reservationId;

    @Column(name = "attempt_count", nullable = false)
    private int attemptCount;

    @Column(name = "next_attempt_at", nullable = false)
    private LocalDateTime nextAttemptAt;

    /** When set, retries stop once this UTC time has passed. Null retries until success. */
    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "last_error", length = 500)
    private String lastError;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getRecipient() { return recipient; }
    public void setRecipient(String recipient) { this.recipient = recipient; }

    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }

    public String getHtmlBody() { return htmlBody; }
    public void setHtmlBody(String htmlBody) { this.htmlBody = htmlBody; }

    public String getMessageId() { return messageId; }
    public void setMessageId(String messageId) { this.messageId = messageId; }

    public String getInReplyTo() { return inReplyTo; }
    public void setInReplyTo(String inReplyTo) { this.inReplyTo = inReplyTo; }

    public String getReferencesHeader() { return referencesHeader; }
    public void setReferencesHeader(String referencesHeader) { this.referencesHeader = referencesHeader; }

    public String getThreadTopic() { return threadTopic; }
    public void setThreadTopic(String threadTopic) { this.threadTopic = threadTopic; }

    public String getLogLabel() { return logLabel; }
    public void setLogLabel(String logLabel) { this.logLabel = logLabel; }

    public Long getReservationId() { return reservationId; }
    public void setReservationId(Long reservationId) { this.reservationId = reservationId; }

    public int getAttemptCount() { return attemptCount; }
    public void setAttemptCount(int attemptCount) { this.attemptCount = attemptCount; }

    public LocalDateTime getNextAttemptAt() { return nextAttemptAt; }
    public void setNextAttemptAt(LocalDateTime nextAttemptAt) { this.nextAttemptAt = nextAttemptAt; }

    public LocalDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }

    public String getLastError() { return lastError; }
    public void setLastError(String lastError) { this.lastError = lastError; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
