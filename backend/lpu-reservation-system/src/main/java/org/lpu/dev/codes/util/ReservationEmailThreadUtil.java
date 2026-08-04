package org.lpu.dev.codes.util;

/**
 * Keeps all emails for one reservation in a single mailbox thread:
 * stable subject + deterministic Message-ID / References headers.
 */
public final class ReservationEmailThreadUtil {

    private static final String MESSAGE_DOMAIN = "lpu-reservation.system";

    private ReservationEmailThreadUtil() {}

    /** Subject format: "{Event Title} — {Service} Reservation" */
    public static String threadSubject(String eventTitle, String serviceLabel) {
        String title = (eventTitle == null || eventTitle.isBlank()) ? "Reservation" : eventTitle.trim();
        return title + " — " + serviceLabel + " Reservation";
    }

    /** Stable root Message-ID for the reservation conversation. */
    public static String rootMessageId(String serviceKey, Long reservationId) {
        return "<" + serviceKey + "-reservation-" + safeId(reservationId) + "@" + MESSAGE_DOMAIN + ">";
    }

    /** Unique Message-ID for one outbound message in the thread. */
    public static String messageId(String serviceKey, Long reservationId) {
        return "<" + serviceKey + "-reservation-" + safeId(reservationId)
                + "." + System.currentTimeMillis() + "." + (int) (Math.random() * 1_000_000)
                + "@" + MESSAGE_DOMAIN + ">";
    }

    private static String safeId(Long reservationId) {
        return reservationId != null ? reservationId.toString() : "unknown";
    }
}
