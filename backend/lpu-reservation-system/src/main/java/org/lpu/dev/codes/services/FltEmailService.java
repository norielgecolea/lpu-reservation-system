package org.lpu.dev.codes.services;

import jakarta.mail.internet.MimeMessage;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.lpu.dev.codes.model.data.FltReservation;
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
public class FltEmailService {

    private static final Logger logger = LogManager.getLogger(FltEmailService.class);
    private static final String SERVICE_KEY = "flt";
    private static final String SERVICE_LABEL = "FLT";

    @Autowired
    private JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromAddress;

    /** Base URL used to construct survey links — override in properties if needed. */
    @Value("${app.base-url:http://localhost:8080/lpu-reservation-system}")
    private String baseUrl;

    // ─────────────────────────────────────────────────────────────────────────
    //  1. Reservation submitted (PENDING)
    // ─────────────────────────────────────────────────────────────────────────
    @Async
    public void sendReservationConfirmation(FltReservation r) {
        String messageHtml =
            "<p style='color:#374151;font-size:15px;margin:0 0 12px;'>"
            + "Your reservation is now <strong>pending review</strong> by the FLT team. "
            + "We will notify you once it has been approved or if any additional information is needed.</p>"
            + "<p style='color:#374151;font-size:15px;margin:0;'>"
            + "Please expect a response within <strong>3–5 business days</strong>.</p>";
        if (ExternalEventNoticeUtil.isExternalDepartment(r.getDepartment())) {
            messageHtml += ExternalEventNoticeUtil.buildConfirmationNoticeHtml();
        }
        String body = buildBase(
            "Reservation Received",
            "🎉 We've received your reservation request!",
            "#1d4ed8",
            r,
            messageHtml,
            null
        );
        send(r.getContactEmail(), threadSubject(r), body, r.getId(), true);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  2. Approved
    // ─────────────────────────────────────────────────────────────────────────
    @Async
    public void sendApprovalEmail(FltReservation r) {
        String body = buildBase(
            "Reservation Approved",
            "✅ Your reservation has been approved!",
            "#059669",
            r,
            "<p style='color:#374151;font-size:15px;margin:0 0 12px;'>"
            + "Great news! The FLT team has <strong>approved</strong> your reservation. "
            + "Please make sure your team is ready on the scheduled date(s).</p>"
            + "<p style='color:#374151;font-size:15px;margin:0;'>"
            + "If you have any questions or need to make changes, please contact the FLT office directly.</p>",
            null
        );
        send(r.getContactEmail(), threadSubject(r), body, r.getId(), false);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  3. Rejected / Declined
    // ─────────────────────────────────────────────────────────────────────────
    @Async
    public void sendRejectionEmail(FltReservation r) {
        String body = buildBase(
            "Reservation Declined",
            "⚠️ Your reservation was not approved",
            "#dc2626",
            r,
            "<p style='color:#374151;font-size:15px;margin:0 0 12px;'>"
            + "We regret to inform you that your reservation request could not be approved at this time. "
            + "This may be due to a scheduling conflict or other operational constraints.</p>"
            + "<p style='color:#374151;font-size:15px;margin:0;'>"
            + "You are welcome to submit a new reservation for a different date. "
            + "If you believe this was an error, please contact the FLT office for clarification.</p>",
            null
        );
        send(r.getContactEmail(), threadSubject(r), body, r.getId(), false);
    }

    @Async
    public void sendConflictEmail(FltReservation r) {
        String body = buildBase(
            "Scheduling Conflict",
            "⚠️ Your reservation conflicts with an approved booking",
            "#ea580c",
            r,
            "<p style='color:#374151;font-size:15px;margin:0 0 12px;'>"
            + "Your reservation request could not be approved because the requested date and time "
            + "overlaps with another reservation that was approved first.</p>"
            + "<p style='color:#374151;font-size:15px;margin:0;'>"
            + "You are welcome to submit a new reservation for a different date and time.</p>",
            null
        );
        send(r.getContactEmail(), threadSubject(r), body, r.getId(), false);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  4. Cancelled
    // ─────────────────────────────────────────────────────────────────────────
    @Async
    public void sendCancellationEmail(FltReservation r) {
        String body = buildBase(
            "Reservation Cancelled",
            "❌ Your reservation has been cancelled",
            "#6b7280",
            r,
            "<p style='color:#374151;font-size:15px;margin:0 0 12px;'>"
            + "Your reservation has been <strong>cancelled</strong> by the FLT administration. "
            + "If this was unexpected, please reach out to the FLT office as soon as possible.</p>"
            + "<p style='color:#374151;font-size:15px;margin:0;'>"
            + "You may submit a new reservation if you still need to use the facility.</p>",
            null
        );
        send(r.getContactEmail(), threadSubject(r), body, r.getId(), false);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  5b. Rescheduled
    // ─────────────────────────────────────────────────────────────────────────
    @Async
    public void sendRescheduleEmail(FltReservation r, String previousDatesJson) {
        String previousDisplay = formatDates(previousDatesJson);
        String body = buildBase(
            "Reservation Rescheduled",
            "📅 Your reservation has been rescheduled",
            "#0369a1",
            r,
            "<p style='color:#374151;font-size:15px;margin:0 0 12px;'>"
            + "The FLT team has <strong>rescheduled</strong> your reservation. "
            + "Please review the updated date(s) and time(s) below.</p>"
            + "<div style='background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:16px 20px;margin:0 0 16px;'>"
            + "<p style='margin:0 0 6px;font-size:13px;font-weight:700;color:#075985;text-transform:uppercase;letter-spacing:.5px;'>Previous schedule</p>"
            + "<p style='margin:0;font-size:14px;color:#0c4a6e;'>" + escHtml(previousDisplay) + "</p>"
            + "</div>"
            + "<p style='color:#374151;font-size:15px;margin:0;'>"
            + "If you have any questions about this change, please contact the FLT office.</p>",
            null
        );
        send(r.getContactEmail(), threadSubject(r), body, r.getId(), false);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  5. Coordination Meeting Scheduled
    // ─────────────────────────────────────────────────────────────────────────
    @Async
    public void sendCoordinationEmail(FltReservation r, String coordDate, String coordStart, String coordEnd) {
        String formattedCoordDate = coordDate;
        try {
            java.time.LocalDate ld = java.time.LocalDate.parse(coordDate);
            formattedCoordDate = ld.format(java.time.format.DateTimeFormatter.ofPattern("MMMM d, yyyy (EEEE)"));
        } catch (Exception ignored) { /* keep raw string */ }

        String meetingInfo =
            "<div style='background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:16px 20px;margin:16px 0;'>"
            + "<p style='margin:0 0 8px;font-size:13px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:.5px;'>📋 Coordination Meeting Details</p>"
            + "<table role='presentation' cellpadding='0' cellspacing='0' border='0' width='100%'>"
            + "<tr><td style='padding:3px 0;font-size:13px;font-weight:700;color:#78350f;width:90px;'>Date:</td>"
            + "<td style='padding:3px 0;font-size:13px;color:#1c1917;'>" + escHtml(formattedCoordDate) + "</td></tr>"
            + "<tr><td style='padding:3px 0;font-size:13px;font-weight:700;color:#78350f;'>Time:</td>"
            + "<td style='padding:3px 0;font-size:13px;color:#1c1917;'>" + escHtml(coordStart) + " – " + escHtml(coordEnd) + "</td></tr>"
            + "</table>"
            + "</div>";

        String body = buildBase(
            "Coordination Meeting Scheduled",
            "📋 A coordination meeting has been set",
            "#d97706",
            r,
            "<p style='color:#374151;font-size:15px;margin:0 0 12px;'>"
            + "The FLT team has scheduled a <strong>coordination meeting</strong> for your upcoming event. "
            + "Please ensure the event organizers attend this meeting to finalize logistics and setup requirements.</p>"
            + meetingInfo
            + "<p style='color:#374151;font-size:15px;margin:0;'>"
            + "If you have any conflicts with this schedule, please contact the FLT office as soon as possible.</p>",
            null
        );
        send(r.getContactEmail(), threadSubject(r), body, r.getId(), false);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  6. Upcoming reservation reminder (1 week / 3 days / 1 day before)
    // ─────────────────────────────────────────────────────────────────────────
    /**
     * Reminds the requestor to cancel if the booking will not push through,
     * or visit the Facilities Office. Returns true when the email was sent.
     */
    public boolean sendReminderEmail(FltReservation r, int daysBefore) {
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

    // ─────────────────────────────────────────────────────────────────────────
    //  7. Completed — Satisfaction Survey
    // ─────────────────────────────────────────────────────────────────────────
    @Async
    public void sendSatisfactionSurvey(FltReservation r) {
        String body = buildBase(
            "Thank You for Choosing FLT Theater",
            "Thank you for booking with us",
            "#7c3aed",
            r,
            "<p style='color:#374151;font-size:15px;line-height:1.6;margin:0 0 14px;'>"
            + "Thank you for choosing the FLT Theater for your recent event. We sincerely appreciate the trust and confidence you have placed in our team and facilities.</p>"
            + "<p style='color:#374151;font-size:15px;line-height:1.6;margin:0 0 14px;'>"
            + "As part of our commitment to continuous improvement and service excellence, we are conducting a Performance Evaluation Survey for the FLT Theater Technical Team. "
            + "The purpose of this survey is to assess key aspects of our service delivery, including timeliness, technical operations management, responsiveness, coordination, and professionalism throughout your event.</p>"
            + "<p style='color:#374151;font-size:15px;line-height:1.6;margin:0 0 8px;'>"
            + "Your feedback is invaluable in helping us:</p>"
            + "<ul style='margin:0 0 14px 18px;padding:0;color:#374151;font-size:15px;line-height:1.6;'>"
            + "<li>Maintain and enhance the quality of our technical support services.</li>"
            + "<li>Identify strengths and areas for improvement.</li>"
            + "<li>Improve the overall event experience for future clients and stakeholders; and</li>"
            + "<li>Support institutional quality assurance and continuous improvement initiatives.</li>"
            + "</ul>"
            + "<p style='color:#374151;font-size:15px;line-height:1.6;margin:0 0 14px;'>"
            + "We kindly request that you complete the attached evaluation form at your earliest convenience. "
            + "Please be assured that all information provided will be treated with confidentiality and used solely for performance assessment and service enhancement purposes.</p>"
            + "<p style='margin:0 0 14px;'><a href='https://forms.office.com/r/WWpjWbFsje' style='color:#7c3aed;font-weight:700;text-decoration:underline;'>https://forms.office.com/r/WWpjWbFsje</a></p>"
            + "<p style='color:#374151;font-size:15px;line-height:1.6;margin:0;'>"
            + "Thank you for your time, cooperation, and continued support. We look forward to serving you again in the future.</p>",
            null
        );
        send(r.getContactEmail(), threadSubject(r), body, r.getId(), false);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private String buildSurveyStars(Long id) {
        String[] labels = {"😞 Very Poor", "😕 Poor", "😐 Fair", "🙂 Good", "😄 Excellent"};
        String[] colors = {"#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e"};
        StringBuilder sb = new StringBuilder();
        sb.append("<table role='presentation' cellpadding='0' cellspacing='0' border='0' style='margin:0 auto;'><tr>");
        for (int i = 1; i <= 5; i++) {
            String url = baseUrl + "/api/flt/survey?id=" + id + "&rating=" + i;
            sb.append("<td style='padding:4px;text-align:center;'>")
              .append("<a href='").append(url).append("' ")
              .append("style='display:inline-block;text-decoration:none;background:").append(colors[i-1]).append(";")
              .append("color:#fff;font-size:13px;font-weight:bold;padding:10px 14px;border-radius:8px;'>"
              + "★ ").append(i).append("</a>")
              .append("<br><span style='font-size:10px;color:#6b7280;'>").append(labels[i-1]).append("</span>")
              .append("</td>");
        }
        sb.append("</tr></table>");
        return sb.toString();
    }

    private String buildBase(String title, String headline, String accentColor,
                             FltReservation r, String messageHtml, String extraHtml) {
        String datesDisplay = formatDates(r.getReservedDates());
        String roomLabel = roomLabel(r.getRoomType());

        return "<!DOCTYPE html><html><head><meta charset='UTF-8'>"
            + "<meta name='viewport' content='width=device-width,initial-scale=1'></head>"
            + "<body style='margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;'>"

            // outer wrapper
            + "<table role='presentation' cellpadding='0' cellspacing='0' border='0' width='100%' style='background:#f3f4f6;'>"
            + "<tr><td align='center' style='padding:32px 16px;'>"

            // card
            + "<table role='presentation' cellpadding='0' cellspacing='0' border='0' width='600' style='background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,.07);'>"

            // header band
            + "<tr><td style='background:" + accentColor + ";padding:28px 32px;'>"
            + "<p style='margin:0;font-size:11px;font-weight:700;letter-spacing:2px;color:rgba(255,255,255,.7);text-transform:uppercase;'>LPU Laguna — FLT Facility</p>"
            + "<h1 style='margin:6px 0 0;font-size:24px;font-weight:900;color:#fff;line-height:1.2;'>" + headline + "</h1>"
            + "</td></tr>"

            // body
            + "<tr><td style='padding:32px;'>"

            // message
            + messageHtml

            // divider
            + "<hr style='border:none;border-top:1px solid #e5e7eb;margin:24px 0;'>"

            // reservation detail table
            + "<h3 style='margin:0 0 14px;font-size:14px;font-weight:700;color:#111827;text-transform:uppercase;letter-spacing:.5px;'>Reservation Details</h3>"
            + "<table role='presentation' cellpadding='0' cellspacing='0' border='0' width='100%' style='border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;'>"
            + detailRow("Event Title", r.getEventTitle())
            + detailRow("Event Type", r.getEventType())
            + detailRow("Organization", r.getOrganization())
            + detailRow("Department", r.getDepartment())
            + detailRow("Room", roomLabel)
            + (r.getExpectedAttendees() != null ? detailRow("Attendees", r.getExpectedAttendees() + " pax") : "")
            + detailRow("Scheduled Date(s)", datesDisplay)
            + detailRow("Contact Person", r.getContactPerson())
            + detailRow("Contact Number", r.getContactNumber())
            + "</table>"

            + (extraHtml != null ? extraHtml : "")

            + "</td></tr>"

            // footer
            + "<tr><td style='background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 32px;text-align:center;'>"
            + "<p style='margin:0;font-size:12px;color:#9ca3af;'>This is an automated message from the LPU Laguna FLT Reservation System.</p>"
            + "<p style='margin:4px 0 0;font-size:12px;color:#9ca3af;'>Lyceum of the Philippines University — Laguna Campus</p>"
            + "</td></tr>"

            + "</table></td></tr></table></body></html>";
    }

    private static String detailRow(String label, String value) {
        if (value == null || value.isBlank()) return "";
        return "<tr>"
            + "<td style='padding:9px 14px;font-size:13px;font-weight:700;color:#6b7280;background:#f9fafb;border-bottom:1px solid #e5e7eb;white-space:nowrap;width:40%;'>" + escHtml(label) + "</td>"
            + "<td style='padding:9px 14px;font-size:13px;color:#111827;border-bottom:1px solid #e5e7eb;'>" + escHtml(value) + "</td>"
            + "</tr>";
    }

    private static String escHtml(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }

    /** Parses the JSON reservedDates and produces a human-readable string. */
    private static String formatDates(String reservedDatesJson) {
        if (reservedDatesJson == null || reservedDatesJson.isBlank()) return "—";
        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            com.fasterxml.jackson.databind.JsonNode arr = mapper.readTree(reservedDatesJson);
            StringBuilder sb = new StringBuilder();
            for (com.fasterxml.jackson.databind.JsonNode slot : arr) {
                String date = slot.has("date") ? slot.get("date").asText() : "";
                String start = slot.has("startTime") ? slot.get("startTime").asText() : "";
                String end = slot.has("endTime") ? slot.get("endTime").asText() : "";
                if (!date.isEmpty()) {
                    if (sb.length() > 0) sb.append("; ");
                    sb.append(date);
                    if (!start.isEmpty()) sb.append(" ").append(start).append("–").append(end);
                }
            }
            return sb.length() > 0 ? sb.toString() : "—";
        } catch (Exception e) {
            return reservedDatesJson;
        }
    }

    private static String roomLabel(String roomType) {
        if (roomType == null) return "—";
        return switch (roomType) {
            case "flt_theater" -> "FLT Theater (max 300 pax)";
            case "amphitheater" -> "Amphitheater (max 150 pax)";
            case "banquet_hall" -> "Banquet Hall (max 100 pax)";
            default -> roomType;
        };
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

    private static String threadSubject(FltReservation r) {
        return ReservationEmailThreadUtil.threadSubject(r.getEventTitle(), SERVICE_LABEL);
    }

    /**
     * @param threadRoot true for the first email of the reservation (confirmation);
     *                   later updates reply into the same thread.
     */
    private boolean send(String to, String subject, String htmlBody, Long reservationId, boolean threadRoot) {
        if (to == null || to.isBlank()) {
            logger.warn("Skipping email — blank recipient for subject: {}", subject);
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
            logger.info("Email sent to {} — {}", to, subject);
            return true;
        } catch (Exception e) {
            logger.error("Failed to send email to {} — {}: {}", to, subject, e.getMessage(), e);
            return false;
        }
    }
}
