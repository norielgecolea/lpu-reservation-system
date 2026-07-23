package org.lpu.dev.codes.util;

public final class ExternalEventNoticeUtil {

    public static final String EXTERNAL_DEPARTMENT = "EXTERNAL";
    public static final String FACILITIES_OFFICE_EMAIL = "facilitiesoffice@lpulaguna.edu.ph";

    private ExternalEventNoticeUtil() {
    }

    public static boolean isExternalDepartment(String department) {
        return department != null && EXTERNAL_DEPARTMENT.equalsIgnoreCase(department.trim());
    }

    public static String buildConfirmationNoticeHtml() {
        return "<div style='background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:16px 20px;margin:16px 0 0;'>"
                + "<p style='margin:0 0 8px;font-size:13px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:.5px;'>"
                + "External Event Payments</p>"
                + "<p style='margin:0;font-size:14px;line-height:1.6;color:#78350f;'>"
                + "For external events, please contact the Facilities Office regarding payments after booking your reservation. "
                + "Please contact <a href='mailto:" + FACILITIES_OFFICE_EMAIL + "' style='color:#7a2342;font-weight:700;'>"
                + FACILITIES_OFFICE_EMAIL + "</a>.</p>"
                + "</div>";
    }
}
