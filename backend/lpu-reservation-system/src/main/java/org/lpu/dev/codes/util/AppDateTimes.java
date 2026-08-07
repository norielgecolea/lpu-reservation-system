package org.lpu.dev.codes.util;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

/**
 * Reservation timestamps are stored as UTC wall-clock {@link LocalDateTime}
 * and exposed to the API as ISO-8601 with a {@code Z} suffix so the frontend
 * can render them in Asia/Manila without an 8-hour drift.
 */
public final class AppDateTimes {

    public static final ZoneId MANILA = ZoneId.of("Asia/Manila");

    private static final DateTimeFormatter LOCAL = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private AppDateTimes() {}

    /** Current UTC wall-clock time for TIMESTAMP columns (no zone stored in DB). */
    public static LocalDateTime nowUtc() {
        return LocalDateTime.now(ZoneOffset.UTC);
    }

    /**
     * Format a JDBC/native-query timestamp for the API as {@code 2026-08-07T03:45:12Z}.
     * Zoneless values are treated as UTC.
     */
    public static String toApiUtc(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Timestamp ts) {
            return ts.toLocalDateTime().format(LOCAL) + "Z";
        }
        if (value instanceof LocalDateTime ldt) {
            return ldt.format(LOCAL) + "Z";
        }
        String s = value.toString().trim();
        if (s.isEmpty()) {
            return null;
        }
        // Timestamp#toString → "yyyy-mm-dd hh:mm:ss.fffffffff"
        s = s.replace(' ', 'T');
        if (s.endsWith("Z") || s.matches(".*[+-]\\d{2}:\\d{2}$") || s.matches(".*[+-]\\d{4}$")) {
            return s;
        }
        // Drop trailing ".0" / excess fractional zeros from JDBC
        s = s.replaceAll("(\\.\\d*?)0+$", "$1").replaceAll("\\.$", "");
        return s + "Z";
    }
}
