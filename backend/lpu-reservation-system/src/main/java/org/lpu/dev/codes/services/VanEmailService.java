package org.lpu.dev.codes.services;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.lpu.dev.codes.model.data.VanReservation;
import org.lpu.dev.codes.util.EmailTimeFormat;
import org.lpu.dev.codes.util.ReservationEmailThreadUtil;
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
    private static final String SERVICE_KEY = "van";
    private static final String SERVICE_LABEL = "University Van";

    @Autowired private JavaMailSender mailSender;
    @Value("${spring.mail.username}") private String fromAddress;

    @Async
    public void sendReservationConfirmation(VanReservation r) {
        String body = buildBase("Reservation Received", "We've received your van reservation request", "#1d4ed8", r,
            "<p style='color:#374151;font-size:15px;margin:0 0 12px;'>Your request is <strong>pending review</strong>. "
            + "We will notify you once vehicle(s) have been assigned.</p>"
            + "<p style='color:#374151;font-size:15px;margin:0;'>Please expect a response within <strong>3–5 business days</strong>.</p>",
            null);
        send(r.getContactEmail(), threadSubject(r), body, r.getId(), true);
    }

    @Async
    public void sendApprovalEmail(VanReservation r) {
        String vehicleInfo = r.formatVehicleLabels();
        if (vehicleInfo == null || vehicleInfo.isBlank()) {
            vehicleInfo = "—";
        }
        String driverInfo = r.formatDriverNames();
        if (driverInfo == null || driverInfo.isBlank()) {
            driverInfo = "—";
        }
        String extra = detailRow("Assigned Vehicle(s)", vehicleInfo) + detailRow("Assigned Driver(s)", driverInfo);
        String body = buildBase("Reservation Approved", "Your van reservation has been approved", "#059669", r,
            "<p style='color:#374151;font-size:15px;margin:0 0 12px;'>Your trip has been approved. Vehicle and driver details are below.</p>"
            + "<p style='color:#92400e;font-size:14px;margin:0 0 12px;padding:12px 14px;background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;'>"
            + "<strong>Important:</strong> You must visit the office to sign the vehicle reservation form. "
            + "Failure to sign the form will result in cancellation of your reservation.</p>",
            "<table role='presentation' cellpadding='0' cellspacing='0' border='0' width='100%' style='border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-top:12px;'>"
            + extra + "</table>");
        send(r.getContactEmail(), threadSubject(r), body, r.getId(), false);
    }

    @Async
    public void sendRejectionEmail(VanReservation r) {
        String body = buildBase("Reservation Declined", "Your van reservation was not approved", "#dc2626", r,
            "<p style='color:#374151;font-size:15px;margin:0;'>We regret to inform you that your request could not be approved at this time.</p>", null);
        send(r.getContactEmail(), threadSubject(r), body, r.getId(), false);
    }

    @Async
    public void sendCancellationEmail(VanReservation r) {
        String body = buildBase("Reservation Cancelled", "Your van reservation has been cancelled", "#6b7280", r,
            "<p style='color:#374151;font-size:15px;margin:0;'>Your reservation has been cancelled by the administration.</p>", null);
        send(r.getContactEmail(), threadSubject(r), body, r.getId(), false);
    }

    @Async
    public void sendRescheduleEmail(VanReservation r, String previousDatesJson) {
        String previousDisplay = formatDates(previousDatesJson);
        String body = buildBase(
            "Reservation Rescheduled",
            "Your van reservation has been rescheduled",
            "#0369a1",
            r,
            "<p style='color:#374151;font-size:15px;margin:0 0 12px;'>"
            + "Your van reservation has been <strong>rescheduled</strong>. "
            + "Please review the updated date(s) and time(s) below.</p>"
            + "<div style='background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:16px 20px;margin:0 0 16px;'>"
            + "<p style='margin:0 0 6px;font-size:13px;font-weight:700;color:#075985;text-transform:uppercase;letter-spacing:.5px;'>Previous schedule</p>"
            + "<p style='margin:0;font-size:14px;color:#0c4a6e;'>" + escHtml(previousDisplay) + "</p>"
            + "</div>"
            + "<p style='color:#374151;font-size:15px;margin:0;'>"
            + "If you have any questions about this change, please contact the Facilities Office.</p>",
            null
        );
        send(r.getContactEmail(), threadSubject(r), body, r.getId(), false);
    }

    /**
     * Reminds the requestor to cancel if the booking will not push through,
     * or visit the Facilities Office. Returns true when the email was sent.
     */
    public boolean sendReminderEmail(VanReservation r, int daysBefore) {
        String whenLabel = reminderWhenLabel(daysBefore);
        String body = buildBase(
            "Upcoming Reservation Reminder",
            "Reminder: your reservation is in " + whenLabel,
            "#b45309",
            r,
            reminderMessageHtml(whenLabel),
            null
        );
        return send(r.getContactEmail(), threadSubject(r), body, r.getId(), false);
    }

    @Async
    public void sendSatisfactionSurvey(VanReservation r) {
        String body = buildBase("Thank You", "Thank you for booking with us", "#7c3aed", r,
            "<p style='color:#374151;font-size:15px;margin:0;line-height:1.6;'>"
            + "Thank you for booking the LPU Laguna University Van service. "
            + "We appreciate the opportunity to support your trip and look forward to serving you again.</p>", null);
        send(r.getContactEmail(), threadSubject(r), body, r.getId(), false);
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
            + detailRow("Return Time", EmailTimeFormat.format12(r.getReturnTime()))
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
                    sb.append(date);
                    if (!start.isEmpty()) {
                        sb.append(" ").append(EmailTimeFormat.formatRange(start, end));
                    }
                }
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
            + "If your trip is still confirmed, no further action is needed — we look forward to serving you.</p>";
    }

    private static String threadSubject(VanReservation r) {
        return ReservationEmailThreadUtil.threadSubject(r.getTravelDestination(), SERVICE_LABEL);
    }

    private boolean send(String to, String subject, String htmlBody, Long reservationId, boolean threadRoot) {
        if (to == null || to.isBlank()) {
            logger.warn("Skipping van email — blank recipient for subject: {}", subject);
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
            logger.info("Van email sent to {} — {}", to, subject);
            return true;
        } catch (Exception e) {
            logger.error("Failed to send van email to {}: {}", to, e.getMessage(), e);
            return false;
        }
    }
}
