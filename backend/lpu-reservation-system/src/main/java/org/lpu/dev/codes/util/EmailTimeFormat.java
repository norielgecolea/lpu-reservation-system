package org.lpu.dev.codes.util;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Formats reservation clock times for email bodies as 12-hour am/pm. */
public final class EmailTimeFormat {

    private static final Pattern TIME =
            Pattern.compile("^(\\d{1,2})(?::(\\d{2}))?(?::\\d{2})?\\s*([AaPp][Mm])?$");

    private EmailTimeFormat() {}

    /**
     * Formats a stored time ({@code "09:00"}, {@code "9:00"}, {@code "17"}, {@code "5:00 pm"})
     * as {@code "9:00 am"} / {@code "5:00 pm"}.
     */
    public static String format12(String time) {
        if (time == null || time.isBlank()) {
            return "";
        }
        String trimmed = time.trim();
        Matcher m = TIME.matcher(trimmed);
        if (!m.matches()) {
            return trimmed;
        }
        int hour = Integer.parseInt(m.group(1));
        String minute = m.group(2) != null ? m.group(2) : "00";
        String periodHint = m.group(3);

        if (periodHint != null) {
            String period = periodHint.toLowerCase();
            if (hour == 0) hour = 12;
            else if (hour > 12) hour -= 12;
            return hour + ":" + minute + " " + period;
        }

        // 24-hour (or hour-only) input
        if (hour < 0 || hour > 23) {
            return trimmed;
        }
        String period = hour >= 12 ? "pm" : "am";
        int display = hour % 12;
        if (display == 0) display = 12;
        return display + ":" + minute + " " + period;
    }

    /** e.g. {@code "9:00 am – 5:00 pm"} */
    public static String formatRange(String start, String end) {
        String s = format12(start);
        String e = format12(end);
        if (s.isEmpty() && e.isEmpty()) return "";
        if (s.isEmpty()) return e;
        if (e.isEmpty()) return s;
        return s + " – " + e;
    }
}
