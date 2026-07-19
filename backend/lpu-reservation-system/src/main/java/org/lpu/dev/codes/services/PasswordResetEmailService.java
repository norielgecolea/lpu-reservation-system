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
public class PasswordResetEmailService {

    private static final Logger logger = LogManager.getLogger(PasswordResetEmailService.class);

    @Autowired private JavaMailSender mailSender;
    @Value("${spring.mail.username}") private String fromAddress;
    @Value("${app.frontend.url:http://localhost:4200}") private String frontendUrl;

    @Async
    public void sendPasswordResetEmail(String toEmail, String fullname, String token) {
        String resetLink = frontendUrl.replaceAll("/$", "") + "/reset-password?token=" + token;
        String subject = "[LPU Laguna] Password Reset Request";
        String body = "<!DOCTYPE html><html><body style='font-family:Arial,sans-serif;background:#f3f4f6;padding:24px;'>"
                + "<div style='max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;'>"
                + "<p style='margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:2px;color:#7a2342;text-transform:uppercase;'>LPU Laguna Reservation System</p>"
                + "<h1 style='margin:0 0 16px;font-size:22px;color:#111827;'>Reset your password</h1>"
                + "<p style='color:#374151;font-size:15px;line-height:1.5;'>Hi "
                + escape(fullname != null ? fullname : "there")
                + ",</p>"
                + "<p style='color:#374151;font-size:15px;line-height:1.5;'>We received a request to reset your account password. "
                + "Click the button below to choose a new password. This link expires in <strong>1 hour</strong>.</p>"
                + "<p style='margin:28px 0;'><a href='" + resetLink + "' style='display:inline-block;background:#7a2342;color:#fff;"
                + "padding:12px 24px;border-radius:8px;font-weight:700;text-decoration:none;'>Reset Password</a></p>"
                + "<p style='color:#6b7280;font-size:13px;line-height:1.5;'>If you did not request this, you can ignore this email. "
                + "Your password will not change until you use the link above.</p>"
                + "<p style='color:#9ca3af;font-size:12px;margin-top:24px;word-break:break-all;'>" + resetLink + "</p>"
                + "</div></body></html>";

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(body, true);
            mailSender.send(message);
            logger.info("Password reset email sent to {}", toEmail);
        } catch (Exception e) {
            logger.error("Failed to send password reset email to {}", toEmail, e);
        }
    }

    private static String escape(String value) {
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
