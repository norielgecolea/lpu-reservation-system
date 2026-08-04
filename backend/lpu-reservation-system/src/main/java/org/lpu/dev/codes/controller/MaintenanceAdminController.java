package org.lpu.dev.codes.controller;

import java.util.Map;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.lpu.dev.codes.model.apiresponse.MaintenanceBlockResponse;
import org.lpu.dev.codes.model.dto.MaintenanceBlockDto;
import org.lpu.dev.codes.services.AuthenticationService;
import org.lpu.dev.codes.services.JWTService;
import org.lpu.dev.codes.services.MaintenanceBlockService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/maintenance")
@CrossOrigin("*")
public class MaintenanceAdminController {

    private static final Logger logger = LogManager.getLogger(MaintenanceAdminController.class);

    @Autowired private AuthenticationService auth;
    @Autowired private JWTService jwtService;
    @Autowired private MaintenanceBlockService svc;
    @Autowired private org.lpu.dev.codes.services.RoleAccessService roleAccessService;

    @GetMapping
    public ResponseEntity<MaintenanceBlockResponse> getBlocks(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam String facility) {

        MaintenanceBlockResponse res = new MaintenanceBlockResponse();
        String token = authHeader.replace("LpuL ", "");
        if (!auth.userActive(jwtService.getUsername(token))) {
            res.setSuccess(false); res.setMessage("USER NOT ACTIVE!"); return ResponseEntity.ok(res);
        }
        String role = jwtService.getRole(token);
        if (!isAllowed(role)) {
            res.setSuccess(false); res.setMessage("Access denied"); return ResponseEntity.ok(res);
        }
        if (!canAccessFacility(role, facility)) {
            res.setSuccess(false); res.setMessage("Access denied for this facility"); return ResponseEntity.ok(res);
        }
        try {
            res.setSuccess(true);
            res.setBlocks(svc.getByFacility(facility));
        } catch (Exception e) {
            logger.error("Error fetching maintenance blocks for {}", facility, e);
            res.setSuccess(false); res.setMessage("Failed to fetch blocks");
        }
        return ResponseEntity.ok(res);
    }

    @PostMapping
    public ResponseEntity<MaintenanceBlockResponse> createBlock(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, String> body) {

        MaintenanceBlockResponse res = new MaintenanceBlockResponse();
        String token = authHeader.replace("LpuL ", "");
        if (!auth.userActive(jwtService.getUsername(token))) {
            res.setSuccess(false); res.setMessage("USER NOT ACTIVE!"); return ResponseEntity.ok(res);
        }
        String role = jwtService.getRole(token);
        if (!canMutate(role)) {
            res.setSuccess(false); res.setMessage("Access denied"); return ResponseEntity.ok(res);
        }

        String facility  = body.get("facility");
        String blockDate = body.get("blockDate");
        String startTime = body.get("startTime");
        String endTime   = body.get("endTime");
        String reason    = body.getOrDefault("reason", "Under Maintenance");

        if (facility == null || blockDate == null || startTime == null || endTime == null) {
            res.setSuccess(false); res.setMessage("facility, blockDate, startTime, endTime are required");
            return ResponseEntity.ok(res);
        }
        if (!canAccessFacility(role, facility)) {
            res.setSuccess(false); res.setMessage("Access denied for this facility");
            return ResponseEntity.ok(res);
        }

        try {
            res.setBlock(svc.create(facility, blockDate, startTime, endTime, reason,
                    jwtService.getUsername(token)));
            res.setSuccess(true);
            res.setMessage("Maintenance block created");
        } catch (Exception e) {
            logger.error("Failed to create maintenance block", e);
            res.setSuccess(false); res.setMessage("Failed to create maintenance block");
        }
        return ResponseEntity.ok(res);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<MaintenanceBlockResponse> deleteBlock(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id) {

        MaintenanceBlockResponse res = new MaintenanceBlockResponse();
        String token = authHeader.replace("LpuL ", "");
        if (!auth.userActive(jwtService.getUsername(token))) {
            res.setSuccess(false); res.setMessage("USER NOT ACTIVE!"); return ResponseEntity.ok(res);
        }
        String role = jwtService.getRole(token);
        if (!canMutate(role)) {
            res.setSuccess(false); res.setMessage("Access denied"); return ResponseEntity.ok(res);
        }

        try {
            MaintenanceBlockDto existing = svc.findDtoById(id);
            if (existing == null) {
                res.setSuccess(false); res.setMessage("Block not found"); return ResponseEntity.ok(res);
            }
            if (!canAccessFacility(role, existing.getFacilityType())) {
                res.setSuccess(false); res.setMessage("Access denied for this facility");
                return ResponseEntity.ok(res);
            }
            boolean ok = svc.delete(id, jwtService.getUsername(token));
            res.setSuccess(ok);
            res.setMessage(ok ? "Block removed" : "Block not found");
        } catch (Exception e) {
            logger.error("Failed to delete maintenance block {}", id, e);
            res.setSuccess(false); res.setMessage("Failed to delete block");
        }
        return ResponseEntity.ok(res);
    }

    private boolean isAllowed(String role) {
        return roleAccessService.roleHasAnyService(role);
    }

    private boolean canMutate(String role) {
        return roleAccessService.roleHasAnyService(role);
    }

    private boolean canAccessFacility(String role, String facility) {
        String service = facilityToService(facility);
        if (service == null) {
            return false;
        }
        return roleAccessService.roleHasService(role, service);
    }

    private static String facilityToService(String facility) {
        if (facility == null || facility.isBlank()) {
            return null;
        }
        String f = facility.trim().toUpperCase();
        if ("FLT".equals(f)) return org.lpu.dev.codes.services.RoleAccessService.SERVICE_FLT;
        if ("GYMNASIUM".equals(f) || "GYM".equals(f)) {
            return org.lpu.dev.codes.services.RoleAccessService.SERVICE_GYMNASIUM;
        }
        if ("VAN".equals(f) || "UNIVERSITY_VAN".equals(f)) {
            return org.lpu.dev.codes.services.RoleAccessService.SERVICE_VAN;
        }
        return null;
    }
}
