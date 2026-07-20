package org.lpu.dev.codes.util;

import java.time.YearMonth;

/**
 * Resolves month vs date-range params for admin reservation list queries.
 * Range (fromDate + toDate) wins; otherwise month defaults to the current YYYY-MM.
 */
public final class ReservationListQuery {

    private final String month;
    private final String fromDate;
    private final String toDate;

    private ReservationListQuery(String month, String fromDate, String toDate) {
        this.month = month;
        this.fromDate = fromDate;
        this.toDate = toDate;
    }

    public static ReservationListQuery of(String month, String fromDate, String toDate) {
        boolean hasRange = present(fromDate) && present(toDate);
        if (hasRange) {
            return new ReservationListQuery(null, fromDate.trim(), toDate.trim());
        }
        String resolvedMonth = present(month) ? month.trim() : YearMonth.now().toString();
        return new ReservationListQuery(resolvedMonth, null, null);
    }

    public String month() {
        return month;
    }

    public String fromDate() {
        return fromDate;
    }

    public String toDate() {
        return toDate;
    }

    private static boolean present(String value) {
        return value != null && !value.isBlank();
    }
}
