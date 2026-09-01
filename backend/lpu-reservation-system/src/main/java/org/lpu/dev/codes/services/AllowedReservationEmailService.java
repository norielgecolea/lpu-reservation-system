package org.lpu.dev.codes.services;

import java.util.regex.Pattern;

import org.springframework.stereotype.Service;

@Service
public class AllowedReservationEmailService {

    public static final String ALLOWED_DOMAINS_LABEL = "@lpulaguna.edu.ph or @lpusc.edu.ph";

    private static final Pattern UNIVERSITY_EMAIL =
            Pattern.compile("^[a-z0-9._%+-]+@(lpulaguna|lpusc)\\.edu\\.ph$");

    public String normalizeEmail(String email) {
        if (email == null) {
            return null;
        }
        return email.trim().toLowerCase();
    }

    public boolean hasAllowedDomain(String email) {
        String normalized = normalizeEmail(email);
        return normalized != null && UNIVERSITY_EMAIL.matcher(normalized).matches();
    }

    public String validateRestrictedServiceEmail(String email) {
        String normalized = normalizeEmail(email);
        if (normalized == null || normalized.isBlank()) {
            return "Contact email is required.";
        }
        if (!UNIVERSITY_EMAIL.matcher(normalized).matches()) {
            return "Only " + ALLOWED_DOMAINS_LABEL + " email addresses are allowed for this reservation.";
        }
        return null;
    }
}
