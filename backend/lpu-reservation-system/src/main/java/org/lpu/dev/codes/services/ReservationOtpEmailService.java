package org.lpu.dev.codes.services;

import java.time.Duration;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class ReservationOtpEmailService {

    @Autowired private EmailDeliveryService emailDeliveryService;

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

        emailDeliveryService.sendPlainEmail(
                toEmail, subject, body, "Reservation OTP", Duration.ofMinutes(10));
    }

    private static String escape(String value) {
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
