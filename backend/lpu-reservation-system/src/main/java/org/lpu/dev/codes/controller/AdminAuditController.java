package org.lpu.dev.codes.controller;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.lpu.dev.codes.model.apiresponse.AdminAuditLogResponse;
import org.lpu.dev.codes.services.AdminAuditService;
import org.lpu.dev.codes.services.AuthenticationService;
import org.lpu.dev.codes.services.JWTService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/audit")
@CrossOrigin("*")
public class AdminAuditController {

    private static final Logger logger = LogManager.getLogger(AdminAuditController.class);

    @Autowired private AuthenticationService auth;
    @Autowired private JWTService jwtService;
    @Autowired private AdminAuditService auditService;

    @GetMapping("/logs")
    public ResponseEntity<AdminAuditLogResponse> getLogs(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam String service,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size,
            @RequestParam(required = false) String actionType,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate) {

        AdminAuditLogResponse res = new AdminAuditLogResponse();
        String token = authHeader.replace("LpuL ", "");

        if (!auth.userActive(jwtService.getUsername(token))) {
            res.setSuccess(false);
            res.setMessage("USER NOT ACTIVE!");
            return ResponseEntity.status(401).body(res);
        }

        if (!"SUPERADMIN".equals(jwtService.getRole(token))) {
            res.setSuccess(false);
            res.setMessage("Access denied");
            return ResponseEntity.status(403).body(res);
        }

        try {
            int safeSize = Math.min(Math.max(size, 1), 100);
            int safePage = Math.max(page, 0);

            res.setLogs(auditService.getLogs(service, actionType, search, fromDate, toDate, safePage, safeSize));
            res.setTotalCount(auditService.getTotalCount(service, actionType, search, fromDate, toDate));
            res.setSuccess(true);
            res.setMessage("Audit logs fetched successfully");
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            logger.error("Error fetching audit logs for service {}", service, e);
            res.setSuccess(false);
            res.setMessage("Failed to fetch audit logs");
            return ResponseEntity.internalServerError().body(res);
        }
    }

    @GetMapping("/action-types")
    public ResponseEntity<AdminAuditLogResponse> getActionTypes(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam String service) {

        AdminAuditLogResponse res = new AdminAuditLogResponse();
        String token = authHeader.replace("LpuL ", "");

        if (!auth.userActive(jwtService.getUsername(token))) {
            res.setSuccess(false);
            res.setMessage("USER NOT ACTIVE!");
            return ResponseEntity.status(401).body(res);
        }

        if (!"SUPERADMIN".equals(jwtService.getRole(token))) {
            res.setSuccess(false);
            res.setMessage("Access denied");
            return ResponseEntity.status(403).body(res);
        }

        try {
            res.setSuccess(true);
            res.setMessage("Action types fetched");
            res.setActionTypes(auditService.getActionTypes(service));
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.setSuccess(false);
            res.setMessage("Failed to fetch action types");
            return ResponseEntity.internalServerError().body(res);
        }
    }
}
