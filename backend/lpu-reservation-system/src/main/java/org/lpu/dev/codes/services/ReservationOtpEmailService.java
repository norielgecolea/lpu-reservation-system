package org.lpu.dev.codes.services;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;

@Service
public class ReservationOtpEmailService {

    private static final Logger logger = LogManager.getLogger(ReservationOtpEmailService.class);

    @Autowired private JavaMailSender mailSender;
    @Value("${spring.mail.username}") private String fromAddress;

    @Async
    public void sendOtpEmail(String toEmail, String contactPerson, String code) {
        String subject = "[LPU Laguna] Reservation verification code";
        String name = contactPerson != null && !contactPerson.isBlank() ? contactPerson.trim() : "there";
        String body = "<!DOCTYPE html><html><body style='font-family:Arial,sans-serif;background:#f3f4f6;padding:24px;'>"
                + "<div style='max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;'>"
                + "<p style='margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:2px;color:#7a2342;text-transform:uppercase;'>LPU Laguna Reservation System</p>"
                + "<h1 style='margin:0 0 16px;font-size:22px;color:#111827;'>Verify your email</h1>"
                + "<p style='color:#374151;font-size:15px;line-height:1.5;'>Hi " + escape(name) + ",</p>"
                + "<p style='color:#374151;font-size:15px;line-height:1.5;'>Use this one-time code to confirm your reservation request. "
                + "It expires in <strong>10 minutes</strong>.</p>"
                + "<p style='margin:28px 0;text-align:center;'>"
                + "<span style='display:inline-block;letter-spacing:8px;font-size:28px;font-weight:800;color:#7a2342;"
                + "background:#fdf2f4;border-radius:12px;padding:14px 22px;'>" + escape(code) + "</span></p>"
                + "<p style='color:#6b7280;font-size:13px;line-height:1.5;'>If you did not start a reservation, you can ignore this email.</p>"
                + "</div></body></html>";

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(body, true);
            mailSender.send(message);
            logger.info("Reservation OTP email sent to {}", toEmail);
        } catch (Exception e) {
            logger.error("Failed to send reservation OTP email to {}", toEmail, e);
        }
    }

    private static String escape(String value) {
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
