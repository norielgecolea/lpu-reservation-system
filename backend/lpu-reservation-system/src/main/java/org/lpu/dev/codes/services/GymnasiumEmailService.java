package org.lpu.dev.codes.services;

import jakarta.mail.internet.MimeMessage;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.lpu.dev.codes.model.data.GymnasiumReservation;
import org.lpu.dev.codes.util.ExternalEventNoticeUtil;
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
public class GymnasiumEmailService {

    private static final Logger logger = LogManager.getLogger(GymnasiumEmailService.class);
    private static final String SERVICE_KEY = "gymnasium";
    private static final String SERVICE_LABEL = "Gymnasium";

    @Autowired
    private JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromAddress;

    @Value("${app.base-url:http://localhost:8080/lpu-reservation-system}")
    private String baseUrl;

    @Async
    public void sendReservationConfirmation(GymnasiumReservation r) {
        String messageHtml =
            "<p style='color:#374151;font-size:15px;margin:0 0 12px;'>Your reservation is now <strong>pending review</strong> by the Gymnasium team. "
            + "We will notify you once it has been approved.</p>"
            + "<p style='color:#374151;font-size:15px;margin:0;'>Please expect a response within <strong>3–5 business days</strong>.</p>";
        if (ExternalEventNoticeUtil.isExternalDepartment(r.getDepartment())) {
            messageHtml += ExternalEventNoticeUtil.buildConfirmationNoticeHtml();
        }
        String body = buildBase("Reservation Received", "🎉 We've received your reservation request!", "#1d4ed8", r,
            messageHtml, null);
        send(r.getContactEmail(), threadSubject(r), body, r.getId(), true);
    }

    @Async
    public void sendApprovalEmail(GymnasiumReservation r) {
        String body = buildBase("Reservation Approved", "✅ Your reservation has been approved!", "#059669", r,
            "<p style='color:#374151;font-size:15px;margin:0 0 12px;'>Great news! The Gymnasium team has <strong>approved</strong> your reservation. "
            + "Please make sure your team is ready on the scheduled date(s).</p>", null);
        send(r.getContactEmail(), threadSubject(r), body, r.getId(), false);
    }

    @Async
    public void sendRejectionEmail(GymnasiumReservation r) {
        String body = buildBase("Reservation Declined", "⚠️ Your reservation was not approved", "#dc2626", r,
            "<p style='color:#374151;font-size:15px;margin:0 0 12px;'>We regret to inform you that your reservation request could not be approved at this time. "
            + "You are welcome to submit a new reservation for a different date.</p>", null);
        send(r.getContactEmail(), threadSubject(r), body, r.getId(), false);
    }

    @Async
    public void sendConflictEmail(GymnasiumReservation r) {
        String body = buildBase("Scheduling Conflict", "⚠️ Your reservation conflicts with an approved booking", "#ea580c", r,
            "<p style='color:#374151;font-size:15px;margin:0 0 12px;'>Your reservation request could not be approved because the requested date and time "
            + "overlaps with another reservation that was approved first.</p>"
            + "<p style='color:#374151;font-size:15px;margin:0;'>You are welcome to submit a new reservation for a different date and time.</p>", null);
        send(r.getContactEmail(), threadSubject(r), body, r.getId(), false);
    }

    @Async
    public void sendCancellationEmail(GymnasiumReservation r) {
        String body = buildBase("Reservation Cancelled", "❌ Your reservation has been cancelled", "#6b7280", r,
            "<p style='color:#374151;font-size:15px;margin:0 0 12px;'>Your reservation has been <strong>cancelled</strong> by the Gymnasium administration. "
            + "You may submit a new reservation if you still need to use the facility.</p>", null);
        send(r.getContactEmail(), threadSubject(r), body, r.getId(), false);
    }

    @Async
    public void sendRescheduleEmail(GymnasiumReservation r, String previousDatesJson) {
        String previousDisplay = formatDates(previousDatesJson);
        String body = buildBase(
            "Reservation Rescheduled",
            "📅 Your reservation has been rescheduled",
            "#0369a1",
            r,
            "<p style='color:#374151;font-size:15px;margin:0 0 12px;'>"
            + "The Gymnasium team has <strong>rescheduled</strong> your reservation. "
            + "Please review the updated date(s) and time(s) below.</p>"
            + "<div style='background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:16px 20px;margin:0 0 16px;'>"
            + "<p style='margin:0 0 6px;font-size:13px;font-weight:700;color:#075985;text-transform:uppercase;letter-spacing:.5px;'>Previous schedule</p>"
            + "<p style='margin:0;font-size:14px;color:#0c4a6e;'>" + escHtml(previousDisplay) + "</p>"
            + "</div>"
            + "<p style='color:#374151;font-size:15px;margin:0;'>"
            + "If you have any questions about this change, please contact the Gymnasium office.</p>",
            null
        );
        send(r.getContactEmail(), threadSubject(r), body, r.getId(), false);
    }

    @Async
    public void sendCoordinationEmail(GymnasiumReservation r, String coordDate, String coordStart, String coordEnd) {
        String formattedDate = coordDate;
        try {
            java.time.LocalDate ld = java.time.LocalDate.parse(coordDate);
            formattedDate = ld.format(java.time.format.DateTimeFormatter.ofPattern("MMMM d, yyyy (EEEE)"));
        } catch (Exception ignored) {}

        String meetingInfo =
            "<div style='background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:16px 20px;margin:16px 0;'>"
            + "<p style='margin:0 0 8px;font-size:13px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:.5px;'>📋 Coordination Meeting Details</p>"
            + "<table role='presentation' cellpadding='0' cellspacing='0' border='0' width='100%'>"
            + "<tr><td style='padding:3px 0;font-size:13px;font-weight:700;color:#78350f;width:90px;'>Date:</td>"
            + "<td style='padding:3px 0;font-size:13px;color:#1c1917;'>" + escHtml(formattedDate) + "</td></tr>"
            + "<tr><td style='padding:3px 0;font-size:13px;font-weight:700;color:#78350f;'>Time:</td>"
            + "<td style='padding:3px 0;font-size:13px;color:#1c1917;'>" + escHtml(coordStart) + " – " + escHtml(coordEnd) + "</td></tr>"
            + "</table></div>";

        String body = buildBase("Coordination Meeting Scheduled", "📋 A coordination meeting has been set", "#d97706", r,
            "<p style='color:#374151;font-size:15px;margin:0 0 12px;'>The Gymnasium team has scheduled a <strong>coordination meeting</strong> for your upcoming event.</p>"
            + meetingInfo, null);
        send(r.getContactEmail(), threadSubject(r), body, r.getId(), false);
    }

    /**
     * Reminds the requestor to cancel if the booking will not push through,
     * or visit the Facilities Office. Returns true when the email was sent.
     */
    public boolean sendReminderEmail(GymnasiumReservation r, int daysBefore) {
        String whenLabel = reminderWhenLabel(daysBefore);
        String body = buildBase(
            "Upcoming Reservation Reminder",
            "⏰ Reminder: your reservation is in " + whenLabel,
            "#b45309",
            r,
            reminderMessageHtml(whenLabel),
            null
        );
        return send(r.getContactEmail(), threadSubject(r), body, r.getId(), false);
    }

    @Async
    public void sendSatisfactionSurvey(GymnasiumReservation r) {
        String body = buildBase("Thank You", "Thank you for booking with us", "#7c3aed", r,
            "<p style='color:#374151;font-size:15px;margin:0;line-height:1.6;'>"
            + "Thank you for booking the LPU Laguna Gymnasium for your event. "
            + "We appreciate your trust in our facility and look forward to serving you again.</p>", null);
        send(r.getContactEmail(), threadSubject(r), body, r.getId(), false);
    }

    private String buildSurveyStars(Long id) {
        String[] labels = {"😞 Very Poor", "😕 Poor", "😐 Fair", "🙂 Good", "😄 Excellent"};
        String[] colors = {"#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e"};
        StringBuilder sb = new StringBuilder();
        sb.append("<table role='presentation' cellpadding='0' cellspacing='0' border='0' style='margin:0 auto;'><tr>");
        for (int i = 1; i <= 5; i++) {
            String url = baseUrl + "/api/gymnasium/survey?id=" + id + "&rating=" + i;
            sb.append("<td style='padding:4px;text-align:center;'>")
              .append("<a href='").append(url).append("' ")
              .append("style='display:inline-block;text-decoration:none;background:").append(colors[i-1]).append(";")
              .append("color:#fff;font-size:13px;font-weight:bold;padding:10px 14px;border-radius:8px;'>★ ").append(i).append("</a>")
              .append("<br><span style='font-size:10px;color:#6b7280;'>").append(labels[i-1]).append("</span></td>");
        }
        sb.append("</tr></table>");
        return sb.toString();
    }

    private String buildBase(String title, String headline, String accentColor,
                             GymnasiumReservation r, String messageHtml, String extraHtml) {
        String datesDisplay = formatDates(r.getReservedDates());
        return "<!DOCTYPE html><html><head><meta charset='UTF-8'></head>"
            + "<body style='margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;'>"
            + "<table role='presentation' cellpadding='0' cellspacing='0' border='0' width='100%' style='background:#f3f4f6;'>"
            + "<tr><td align='center' style='padding:32px 16px;'>"
            + "<table role='presentation' cellpadding='0' cellspacing='0' border='0' width='600' style='background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,.07);'>"
            + "<tr><td style='background:" + accentColor + ";padding:28px 32px;'>"
            + "<p style='margin:0;font-size:11px;font-weight:700;letter-spacing:2px;color:rgba(255,255,255,.7);text-transform:uppercase;'>LPU Laguna — Gymnasium</p>"
            + "<h1 style='margin:6px 0 0;font-size:24px;font-weight:900;color:#fff;'>" + headline + "</h1></td></tr>"
            + "<tr><td style='padding:32px;'>" + messageHtml
            + "<hr style='border:none;border-top:1px solid #e5e7eb;margin:24px 0;'>"
            + "<h3 style='margin:0 0 14px;font-size:14px;font-weight:700;color:#111827;text-transform:uppercase;letter-spacing:.5px;'>Reservation Details</h3>"
            + "<table role='presentation' cellpadding='0' cellspacing='0' border='0' width='100%' style='border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;'>"
            + detailRow("Event Title", r.getEventTitle())
            + detailRow("Organization", r.getOrganization())
            + detailRow("Department", r.getDepartment())
            + (r.getNumberOfAttendees() != null ? detailRow("Attendees", r.getNumberOfAttendees() + " pax") : "")
            + detailRow("Scheduled Date(s)", datesDisplay)
            + detailRow("Contact Person", r.getContactPerson())
            + detailRow("Contact Number", r.getContactNumber())
            + "</table>"
            + (extraHtml != null ? extraHtml : "")
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
                if (!date.isEmpty()) { if (sb.length() > 0) sb.append("; "); sb.append(date).append(" ").append(start).append("–").append(end); }
            }
            return sb.length() > 0 ? sb.toString() : "—";
        } catch (Exception e) { return json; }
    }

    private static String reminderWhenLabel(int daysBefore) {
        return switch (daysBefore) {
            case 7 -> "1 week";
            case 3 -> "3 days";
            case 1 -> "1 day";
            default -> daysBefore + " days";
        };
    }

    private static String reminderMessageHtml(String whenLabel) {
        return "<p style='color:#374151;font-size:15px;margin:0 0 12px;'>"
            + "This is a friendly reminder that your approved reservation is coming up in <strong>"
            + whenLabel + "</strong>.</p>"
            + "<div style='background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:16px 20px;margin:0 0 16px;'>"
            + "<p style='margin:0 0 10px;font-size:14px;font-weight:700;color:#9a3412;'>Important notice</p>"
            + "<p style='margin:0 0 10px;font-size:14px;color:#7c2d12;line-height:1.55;'>"
            + "If this reservation <strong>will not push through</strong>, please <strong>cancel your reservation</strong> as soon as possible. "
            + "Otherwise, you may be <strong>penalized</strong>.</p>"
            + "<p style='margin:0;font-size:14px;color:#7c2d12;line-height:1.55;'>"
            + "If you wish not to push through, please go to the <strong>Facilities Office</strong>.</p>"
            + "</div>"
            + "<p style='color:#374151;font-size:15px;margin:0;'>"
            + "If your event is still confirmed, no further action is needed — we look forward to serving you.</p>";
    }

    private static String threadSubject(GymnasiumReservation r) {
        return ReservationEmailThreadUtil.threadSubject(r.getEventTitle(), SERVICE_LABEL);
    }

    private boolean send(String to, String subject, String htmlBody, Long reservationId, boolean threadRoot) {
        if (to == null || to.isBlank()) {
            logger.warn("Skipping gymnasium email — blank recipient for subject: {}", subject);
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
            logger.info("Gymnasium email sent to {} — {}", to, subject);
            return true;
        } catch (Exception e) {
            logger.error("Failed to send gymnasium email to {}: {}", to, e.getMessage(), e);
            return false;
        }
    }
}
