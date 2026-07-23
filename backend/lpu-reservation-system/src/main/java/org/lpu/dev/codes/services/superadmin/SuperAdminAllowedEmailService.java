package org.lpu.dev.codes.services.superadmin;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.lpu.dev.codes.model.apiresponse.EquipmentResponse;
import org.lpu.dev.codes.model.apiresponse.PopulateAllowedEmailsResponse;
import org.lpu.dev.codes.model.data.AllowedReservationEmail;
import org.lpu.dev.codes.model.dto.AllowedEmailDto;
import org.lpu.dev.codes.model.dto.CreateAllowedEmailRequest;
import org.lpu.dev.codes.model.dto.ImportAllowedEmailsRequest;
import org.lpu.dev.codes.repository.AllowedReservationEmailRepository;
import org.lpu.dev.codes.services.AdminAuditService;
import org.lpu.dev.codes.services.AllowedReservationEmailService;
import org.lpu.dev.codes.services.JWTService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SuperAdminAllowedEmailService {

    private static final Logger logger = LogManager.getLogger(SuperAdminAllowedEmailService.class);

    @Autowired
    private AllowedReservationEmailRepository repository;

    @Autowired
    private AllowedReservationEmailService emailService;

    @Autowired
    private JWTService jwtService;

    @Autowired
    private AdminAuditService auditService;

    private String extractToken(String authHeader) {
        return authHeader.replace("LpuL ", "");
    }

    private boolean isSuperAdmin(String token) {
        return jwtService.validateToken(token) && "SUPERADMIN".equals(jwtService.getRole(token));
    }

    @Transactional(readOnly = true)
    public PopulateAllowedEmailsResponse getAll(String authHeader, int page, int size, String search) {
        PopulateAllowedEmailsResponse response = new PopulateAllowedEmailsResponse();
        String token = extractToken(authHeader);

        if (!isSuperAdmin(token)) {
            response.setSuccess(false);
            response.setMessage("Unauthorized");
            return response;
        }

        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 200);

        List<AllowedEmailDto> emails = repository.findPageProjected(search, safePage, safeSize);
        long totalCount = repository.countAll(search);
        response.setSuccess(true);
        response.setMessage("Allowed emails fetched successfully");
        response.setEmails(emails);
        response.setTotalCount(totalCount);
        return response;
    }

    @Transactional
    public EquipmentResponse create(String authHeader, CreateAllowedEmailRequest request) {
        EquipmentResponse response = new EquipmentResponse();
        String token = extractToken(authHeader);

        if (!isSuperAdmin(token)) {
            response.setSuccess(false);
            response.setMessage("Unauthorized");
            return response;
        }

        String validationError = emailService.validateAdminEmailInput(request.getEmail());
        if (validationError != null) {
            response.setSuccess(false);
            response.setMessage(validationError);
            return response;
        }

        String normalized = emailService.normalizeEmail(request.getEmail());
        AllowedReservationEmail existing = repository.findByEmail(normalized);
        if (existing != null) {
            response.setSuccess(false);
            response.setMessage("This email is already on the list.");
            return response;
        }

        String adminUsername = jwtService.getUsername(token);
        AllowedReservationEmail entry = new AllowedReservationEmail();
        entry.setEmail(normalized);
        entry.setStatus("ACTIVE");
        entry.setCreatedBy(adminUsername);
        repository.save(entry);

        auditService.log("ALLOWED_EMAILS", "CREATE", adminUsername, "allowed_email", entry.getId(),
                normalized, AdminAuditService.detailsOf("email", normalized));

        logger.info("Allowed email added: {} by {}", normalized, adminUsername);
        response.setSuccess(true);
        response.setMessage("Email added successfully");
        return response;
    }

    @Transactional
    public EquipmentResponse toggleStatus(Long id, String authHeader) {
        EquipmentResponse response = new EquipmentResponse();
        String token = extractToken(authHeader);

        if (!isSuperAdmin(token)) {
            response.setSuccess(false);
            response.setMessage("Unauthorized");
            return response;
        }

        AllowedReservationEmail entry = repository.findById(id);
        if (entry == null) {
            response.setSuccess(false);
            response.setMessage("Email entry not found");
            return response;
        }

        String newStatus = "ACTIVE".equals(entry.getStatus()) ? "INACTIVE" : "ACTIVE";
        repository.updateStatus(id, newStatus);

        String adminUsername = jwtService.getUsername(token);
        auditService.log("ALLOWED_EMAILS", "UPDATE", adminUsername, "allowed_email", id, entry.getEmail(),
                AdminAuditService.detailsOf("status", newStatus));

        response.setSuccess(true);
        response.setMessage("Email status updated");
        return response;
    }

    @Transactional
    public EquipmentResponse delete(Long id, String authHeader) {
        EquipmentResponse response = new EquipmentResponse();
        String token = extractToken(authHeader);

        if (!isSuperAdmin(token)) {
            response.setSuccess(false);
            response.setMessage("Unauthorized");
            return response;
        }

        AllowedReservationEmail entry = repository.findById(id);
        if (entry == null) {
            response.setSuccess(false);
            response.setMessage("Email entry not found");
            return response;
        }

        repository.deleteById(id);

        String adminUsername = jwtService.getUsername(token);
        auditService.log("ALLOWED_EMAILS", "DELETE", adminUsername, "allowed_email", id, entry.getEmail(),
                AdminAuditService.detailsOf("email", entry.getEmail()));

        response.setSuccess(true);
        response.setMessage("Email removed successfully");
        return response;
    }

    @Transactional
    public EquipmentResponse replaceAll(String authHeader, ImportAllowedEmailsRequest request) {
        EquipmentResponse response = new EquipmentResponse();
        String token = extractToken(authHeader);

        if (!isSuperAdmin(token)) {
            response.setSuccess(false);
            response.setMessage("Unauthorized");
            return response;
        }

        if (request == null || request.getEmails() == null || request.getEmails().isEmpty()) {
            response.setSuccess(false);
            response.setMessage("No emails were provided for import.");
            return response;
        }

        Set<String> normalizedEmails = new LinkedHashSet<>();
        for (String rawEmail : request.getEmails()) {
            String validationError = emailService.validateAdminEmailInput(rawEmail);
            if (validationError != null) {
                continue;
            }
            normalizedEmails.add(emailService.normalizeEmail(rawEmail));
        }

        if (normalizedEmails.isEmpty()) {
            response.setSuccess(false);
            response.setMessage("No valid @lpulaguna.edu.ph emails were found in the import.");
            return response;
        }

        int deletedRows = repository.deleteAll();
        String adminUsername = jwtService.getUsername(token);

        List<AllowedReservationEmail> entries = new java.util.ArrayList<>(normalizedEmails.size());
        for (String email : normalizedEmails) {
            AllowedReservationEmail entry = new AllowedReservationEmail();
            entry.setEmail(email);
            entry.setStatus("ACTIVE");
            entry.setCreatedBy(adminUsername);
            entries.add(entry);
        }
        repository.saveAllBatch(entries);

        auditService.log("ALLOWED_EMAILS", "IMPORT_REPLACE", adminUsername, "allowed_email", null,
                "Bulk import",
                AdminAuditService.detailsOf(
                        "deletedRows", deletedRows,
                        "importedCount", normalizedEmails.size()));

        logger.info("Allowed emails replaced by {}: {} imported, {} old removed",
                adminUsername, normalizedEmails.size(), deletedRows);

        response.setSuccess(true);
        response.setMessage("Imported " + normalizedEmails.size() + " email(s). Previous records were replaced.");
        return response;
    }
}
