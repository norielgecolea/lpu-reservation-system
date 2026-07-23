package org.lpu.dev.codes.services;

import org.lpu.dev.codes.repository.AllowedReservationEmailRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class AllowedReservationEmailService {

    public static final String ALLOWED_DOMAIN = "@lpulaguna.edu.ph";

    @Autowired
    private AllowedReservationEmailRepository repository;

    public String normalizeEmail(String email) {
        if (email == null) {
            return null;
        }
        return email.trim().toLowerCase();
    }

    public boolean hasAllowedDomain(String email) {
        String normalized = normalizeEmail(email);
        return normalized != null && normalized.endsWith(ALLOWED_DOMAIN);
    }

    public String validateRestrictedServiceEmail(String email) {
        String normalized = normalizeEmail(email);
        if (normalized == null || normalized.isBlank()) {
            return "Contact email is required.";
        }
        if (!normalized.endsWith(ALLOWED_DOMAIN)) {
            return "Only " + ALLOWED_DOMAIN + " email addresses are allowed for this reservation.";
        }
        if (!repository.existsActiveByEmail(normalized)) {
            return "This email is not on the approved list. Please contact the administrator.";
        }
        return null;
    }

    public boolean isEmailAuthorized(String email) {
        return validateRestrictedServiceEmail(email) == null;
    }

    public String validateAdminEmailInput(String email) {
        String normalized = normalizeEmail(email);
        if (normalized == null || normalized.isBlank()) {
            return "Email is required.";
        }
        if (!normalized.endsWith(ALLOWED_DOMAIN)) {
            return "Only " + ALLOWED_DOMAIN + " email addresses can be added.";
        }
        if (!normalized.matches("^[a-z0-9._%+-]+@lpulaguna\\.edu\\.ph$")) {
            return "Enter a valid " + ALLOWED_DOMAIN + " email address.";
        }
        return null;
    }
}
