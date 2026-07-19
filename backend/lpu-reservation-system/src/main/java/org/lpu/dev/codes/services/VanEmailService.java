package org.lpu.dev.codes.services;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.lpu.dev.codes.model.data.VanReservation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.PropertySource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;

@Service
@PropertySource("classpath:application.properties")
public class VanEmailService {

    private static final Logger logger = LogManager.getLogger(VanEmailService.class);

    @Autowired private JavaMailSender mailSender;
    @Value("${spring.mail.username}") private String fromAddress;

    @Async
    public void sendReservationConfirmation(VanReservation r) {
        String subject = "[LPU Laguna Van] Reservation Received — " + r.getTravelDestination();
        String body = buildBase("Reservation Received", "We've received your van reservation request", "#1d4ed8", r,
            "<p style='color:#374151;font-size:15px;margin:0 0 12px;'>Your request is <strong>pending review</strong>. "
            + "We will notify you once a vehicle and driver have been assigned.</p>"
            + "<p style='color:#374151;font-size:15px;margin:0;'>Please expect a response within <strong>3–5 business days</strong>.</p>",
            null);
        send(r.getContactEmail(), subject, body);
    }

    @Async
    public void sendApprovalEmail(VanReservation r) {
        String vehicleInfo = r.getVehicle() != null
                ? r.getVehicle().getBrand() + " (" + r.getVehicle().getPlateNum() + ")" : "—";
        String driverInfo = r.getDriver() != null ? r.getDriver().getFullName() : "—";
        String extra = detailRow("Assigned Vehicle", vehicleInfo) + detailRow("Assigned Driver", driverInfo);
        String subject = "[LPU Laguna Van] Reservation APPROVED — " + r.getTravelDestination();
        String body = buildBase("Reservation Approved", "Your van reservation has been approved", "#059669", r,
            "<p style='color:#374151;font-size:15px;margin:0 0 12px;'>Your trip has been approved. Vehicle and driver details are below.</p>"
            + "<p style='color:#92400e;font-size:14px;margin:0 0 12px;padding:12px 14px;background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;'>"
            + "<strong>Important:</strong> You must visit the office to sign the vehicle reservation form. "
            + "Failure to sign the form will result in cancellation of your reservation.</p>",
            "<table role='presentation' cellpadding='0' cellspacing='0' border='0' width='100%' style='border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-top:12px;'>"
            + extra + "</table>");
        send(r.getContactEmail(), subject, body);
    }

    @Async
    public void sendRejectionEmail(VanReservation r) {
        String subject = "[LPU Laguna Van] Reservation Declined — " + r.getTravelDestination();
        String body = buildBase("Reservation Declined", "Your van reservation was not approved", "#dc2626", r,
            "<p style='color:#374151;font-size:15px;margin:0;'>We regret to inform you that your request could not be approved at this time.</p>", null);
        send(r.getContactEmail(), subject, body);
    }

    @Async
    public void sendCancellationEmail(VanReservation r) {
        String subject = "[LPU Laguna Van] Reservation Cancelled — " + r.getTravelDestination();
        String body = buildBase("Reservation Cancelled", "Your van reservation has been cancelled", "#6b7280", r,
            "<p style='color:#374151;font-size:15px;margin:0;'>Your reservation has been cancelled by the administration.</p>", null);
        send(r.getContactEmail(), subject, body);
    }

    @Async
    public void sendSatisfactionSurvey(VanReservation r) {
        String subject = "[LPU Laguna Van] Thank You for Booking — " + r.getTravelDestination();
        String body = buildBase("Thank You", "Thank you for booking with us", "#7c3aed", r,
            "<p style='color:#374151;font-size:15px;margin:0;line-height:1.6;'>"
            + "Thank you for booking the LPU Laguna University Van service. "
            + "We appreciate the opportunity to support your trip and look forward to serving you again.</p>", null);
        send(r.getContactEmail(), subject, body);
    }

    private String buildBase(String title, String headline, String accentColor,
            VanReservation r, String messageHtml, String extraHtml) {
        return "<!DOCTYPE html><html><head><meta charset='UTF-8'></head>"
            + "<body style='margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;'>"
            + "<table role='presentation' cellpadding='0' cellspacing='0' border='0' width='100%' style='background:#f3f4f6;'>"
            + "<tr><td align='center' style='padding:32px 16px;'>"
            + "<table role='presentation' cellpadding='0' cellspacing='0' border='0' width='600' style='background:#ffffff;border-radius:12px;overflow:hidden;'>"
            + "<tr><td style='background:" + accentColor + ";padding:28px 32px;'>"
            + "<p style='margin:0;font-size:11px;font-weight:700;letter-spacing:2px;color:rgba(255,255,255,.7);text-transform:uppercase;'>LPU Laguna — University Van</p>"
            + "<h1 style='margin:6px 0 0;font-size:24px;font-weight:900;color:#fff;'>" + headline + "</h1></td></tr>"
            + "<tr><td style='padding:32px;'>" + messageHtml
            + "<hr style='border:none;border-top:1px solid #e5e7eb;margin:24px 0;'>"
            + "<table role='presentation' cellpadding='0' cellspacing='0' border='0' width='100%' style='border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;'>"
            + detailRow("Destination", r.getTravelDestination())
            + detailRow("Organization", r.getOrganization())
            + detailRow("Department", r.getDepartment())
            + detailRow("Passengers", r.getPassengerNames())
            + detailRow("Number of Passengers", r.getNumberOfPassengers() != null ? String.valueOf(r.getNumberOfPassengers()) : null)
            + detailRow("Scheduled Date(s)", formatDates(r.getReservedDates()))
            + detailRow("Return Time", r.getReturnTime())
            + detailRow("Contact Person", r.getContactPerson())
            + detailRow("Contact Number", r.getContactNumber())
            + detailRow("Additional Remarks", r.getAdditionalRemarks())
            + "</table>" + (extraHtml != null ? extraHtml : "")
            + "</td></tr></table></td></tr></table></body></html>";
    }

    private static String detailRow(String label, String value) {
        if (value == null || value.isBlank()) return "";
        return "<tr><td style='padding:9px 14px;font-size:13px;font-weight:700;color:#6b7280;background:#f9fafb;border-bottom:1px solid #e5e7eb;width:40%;'>"
            + escHtml(label) + "</td><td style='padding:9px 14px;font-size:13px;color:#111827;border-bottom:1px solid #e5e7eb;'>"
            + escHtml(value) + "</td></tr>";
    }

    private static String escHtml(String s) {
        if (s == null) return "";
        return s.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;").replace("\"","&quot;");
    }

    private static String formatDates(String json) {
        if (json == null || json.isBlank()) return "—";
        try {
            com.fasterxml.jackson.databind.JsonNode arr = new com.fasterxml.jackson.databind.ObjectMapper().readTree(json);
            StringBuilder sb = new StringBuilder();
            for (com.fasterxml.jackson.databind.JsonNode slot : arr) {
                String date = slot.has("date") ? slot.get("date").asText() : "";
                String start = slot.has("startTime") ? slot.get("startTime").asText() : "";
                String end = slot.has("endTime") ? slot.get("endTime").asText() : "";
                if (!date.isEmpty()) {
                    if (sb.length() > 0) sb.append("; ");
                    sb.append(date).append(" ").append(start).append("–").append(end);
                }
            }
            return sb.length() > 0 ? sb.toString() : "—";
        } catch (Exception e) { return json; }
    }

    private void send(String to, String subject, String htmlBody) {
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, false, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            mailSender.send(msg);
            logger.info("Van email sent to {} — {}", to, subject);
        } catch (Exception e) {
            logger.error("Failed to send van email to {}: {}", to, e.getMessage(), e);
        }
    }
}
