package org.lpu.dev.codes.services;

import jakarta.mail.internet.MimeMessage;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.lpu.dev.codes.model.data.EoReservation;
import org.lpu.dev.codes.util.EmailTimeFormat;
import org.lpu.dev.codes.util.ReservationEmailThreadUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.PropertySource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@PropertySource("classpath:application.properties")
public class EoEmailService {

    private static final Logger logger = LogManager.getLogger(EoEmailService.class);
    private static final String SERVICE_KEY = "eo";

    @Autowired
    private JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromAddress;

    @Async
    public void sendConfirmation(EoReservation r) {
        if (!hasContact(r)) return;
        String body = buildBase(
                "✅ Your Executive Office reservation is confirmed",
                "#059669",
                r,
                "<p style='color:#374151;font-size:15px;margin:0 0 12px;'>The Executive Office has <strong>confirmed</strong> your "
                        + roomLabel(r.getRoomType())
                        + " reservation. Please arrive on time for the scheduled date(s).</p>");
        send(r.getContactEmail(), threadSubject(r), body, r.getId(), true);
    }

    @Async
    public void sendCancellation(EoReservation r) {
        if (!hasContact(r)) return;
        String body = buildBase(
                "❌ Your reservation has been cancelled",
                "#6b7280",
                r,
                "<p style='color:#374151;font-size:15px;margin:0 0 12px;'>Your "
                        + roomLabel(r.getRoomType())
                        + " reservation has been <strong>cancelled</strong> by the Executive Office.</p>");
        send(r.getContactEmail(), threadSubject(r), body, r.getId(), false);
    }

    public boolean sendReminderEmail(EoReservation r, int daysBefore) {
        if (!hasContact(r)) return false;
        String whenLabel = switch (daysBefore) {
            case 7 -> "1 week";
            case 3 -> "3 days";
            case 1 -> "1 day";
            default -> daysBefore + " days";
        };
        String body = buildBase(
                "⏰ Reminder: your reservation is in " + whenLabel,
                "#b45309",
                r,
                "<p style='color:#374151;font-size:15px;margin:0 0 12px;'>"
                        + "This is a friendly reminder that your confirmed "
                        + roomLabel(r.getRoomType())
                        + " reservation is coming up in <strong>" + whenLabel + "</strong>.</p>");
        return send(r.getContactEmail(), threadSubject(r), body, r.getId(), false);
    }

    private String buildBase(String headline, String accentColor,
                             EoReservation r, String messageHtml) {
        String datesDisplay = formatDates(r.getReservedDates());
        return "<!DOCTYPE html><html><head><meta charset='UTF-8'></head>"
                + "<body style='margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;'>"
                + "<table role='presentation' cellpadding='0' cellspacing='0' border='0' width='100%' style='background:#f3f4f6;'>"
                + "<tr><td align='center' style='padding:32px 16px;'>"
                + "<table role='presentation' cellpadding='0' cellspacing='0' border='0' width='600' style='background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,.07);'>"
                + "<tr><td style='background:" + accentColor + ";padding:28px 32px;'>"
                + "<p style='margin:0;font-size:11px;font-weight:700;letter-spacing:2px;color:rgba(255,255,255,.7);text-transform:uppercase;'>LPU Laguna — Executive Office</p>"
                + "<h1 style='margin:6px 0 0;font-size:24px;font-weight:900;color:#fff;'>" + headline + "</h1></td></tr>"
                + "<tr><td style='padding:32px;'>" + messageHtml
                + "<hr style='border:none;border-top:1px solid #e5e7eb;margin:24px 0;'>"
                + "<h3 style='margin:0 0 14px;font-size:14px;font-weight:700;color:#111827;text-transform:uppercase;letter-spacing:.5px;'>Reservation Details</h3>"
                + "<table role='presentation' cellpadding='0' cellspacing='0' border='0' width='100%' style='border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;'>"
                + detailRow("Room", roomLabel(r.getRoomType()))
                + detailRow("Agenda", r.getAgenda())
                + detailRow("Organization", r.getOrganization())
                + detailRow("Department", r.getDepartment())
                + detailRow("Scheduled Date(s)", datesDisplay)
                + detailRow("Contact Person", r.getContactPerson())
                + detailRow("Contact Number", r.getContactNumber())
                + (r.getNotes() != null && !r.getNotes().isBlank() ? detailRow("Notes", r.getNotes()) : "")
                + "</table>"
                + "</td></tr>"
                + "<tr><td style='background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 32px;text-align:center;'>"
                + "<p style='margin:0;font-size:12px;color:#9ca3af;'>This is an automated message from the LPU Laguna Reservation System.</p>"
                + "</td></tr></table></td></tr></table></body></html>";
    }

    private static String detailRow(String label, String value) {
        if (value == null || value.isBlank()) return "";
        return "<tr><td style='padding:9px 14px;font-size:13px;font-weight:700;color:#6b7280;background:#f9fafb;border-bottom:1px solid #e5e7eb;white-space:nowrap;width:40%;'>"
                + escHtml(label) + "</td>"
                + "<td style='padding:9px 14px;font-size:13px;color:#111827;border-bottom:1px solid #e5e7eb;'>" + escHtml(value) + "</td></tr>";
    }

    private static String escHtml(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
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
                    sb.append(date);
                    if (!start.isEmpty()) {
                        sb.append(" ").append(EmailTimeFormat.formatRange(start, end));
                    }
                }
            }
            return sb.length() > 0 ? sb.toString() : "—";
        } catch (Exception e) {
            return json;
        }
    }

    private static String roomLabel(String roomType) {
        if ("CONFERENCE".equalsIgnoreCase(roomType)) return "Conference Room";
        return "Boardroom";
    }

    private static String threadSubject(EoReservation r) {
        return ReservationEmailThreadUtil.threadSubject(r.getAgenda(), roomLabel(r.getRoomType()));
    }

    private static boolean hasContact(EoReservation r) {
        return r.getContactEmail() != null && !r.getContactEmail().isBlank();
    }

    private boolean send(String to, String subject, String htmlBody, Long reservationId, boolean threadRoot) {
        if (to == null || to.isBlank()) {
            return false;
        }
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, false, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);

            String rootId = ReservationEmailThreadUtil.rootMessageId(SERVICE_KEY, reservationId);
            if (threadRoot) {
                msg.setHeader("Message-ID", rootId);
            } else {
                msg.setHeader("Message-ID", ReservationEmailThreadUtil.messageId(SERVICE_KEY, reservationId));
                msg.setHeader("In-Reply-To", rootId);
                msg.setHeader("References", rootId);
            }
            msg.setHeader("Thread-Topic", subject);

            mailSender.send(msg);
            logger.info("EO email sent to {} — {}", to, subject);
            return true;
        } catch (Exception e) {
            logger.error("Failed to send EO email to {}: {}", to, e.getMessage(), e);
            return false;
        }
    }
}
