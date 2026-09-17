package org.lpu.dev.codes.util;

public final class CancellationRemarksUtil {

    private static final int MAX_LENGTH = 2000;

    private CancellationRemarksUtil() {}

    public static String normalize(String remarks) {
        if (remarks == null) return null;
        String trimmed = remarks.trim();
        if (trimmed.isEmpty()) return null;
        return trimmed.length() > MAX_LENGTH ? trimmed.substring(0, MAX_LENGTH) : trimmed;
    }

    public static boolean requiredMissing(String status, String remarks) {
        return ("REJECTED".equals(status) || "CANCELLED".equals(status)) && remarks == null;
    }
}
