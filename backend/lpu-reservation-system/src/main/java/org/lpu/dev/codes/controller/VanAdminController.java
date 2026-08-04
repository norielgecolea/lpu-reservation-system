package org.lpu.dev.codes.controller;

import java.util.List;
import java.util.Map;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.lpu.dev.codes.model.apiresponse.ReservationActionResponse;
import org.lpu.dev.codes.model.apiresponse.VanReservationResponse;
import org.lpu.dev.codes.model.dto.VanApproveRequest;
import org.lpu.dev.codes.model.dto.VanApprovedEventDto;
import org.lpu.dev.codes.model.dto.VanReservationAdminDto;
import org.lpu.dev.codes.services.AuthenticationService;
import org.lpu.dev.codes.services.JWTService;
import org.lpu.dev.codes.services.VanReservationService;
import org.lpu.dev.codes.util.ReservationListQuery;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/van")
@CrossOrigin("*")
public class VanAdminController {

    private static final Logger logger = LogManager.getLogger(VanAdminController.class);

    @Autowired private AuthenticationService auth;
    @Autowired private JWTService jwtService;
    @Autowired private VanReservationService vanService;
    @Autowired private org.lpu.dev.codes.services.RoleAccessService roleAccessService;

    private boolean isAllowed(String token) {
        String role = jwtService.getRole(token);
        return roleAccessService.roleHasService(role, org.lpu.dev.codes.services.RoleAccessService.SERVICE_VAN);
    }

    private String tok(String header) { return header.replace("LpuL ", ""); }

    @GetMapping("/reservations")
    public VanReservationResponse getAllReservations(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam(required = false) String month,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate) {
        VanReservationResponse res = new VanReservationResponse();
        String token = tok(authHeader);
        if (!auth.userActive(jwtService.getUsername(token))) {
            res.setSuccess(false); res.setMessage("USER NOT ACTIVE!"); return res;
        }
        if (!isAllowed(token)) {
            res.setSuccess(false); res.setMessage("Access denied"); return res;
        }
        try {
            ReservationListQuery query = ReservationListQuery.of(month, fromDate, toDate);
            List<VanReservationAdminDto> reservations = vanService.getAllReservations(
                    query.month(), query.fromDate(), query.toDate());
            res.setSuccess(true);
            res.setMessage("Reservations fetched successfully");
            res.setReservations(reservations);
        } catch (Exception e) {
            logger.error("Error fetching van reservations", e);
            res.setSuccess(false); res.setMessage("Failed to fetch reservations");
        }
        return res;
    }

    @GetMapping("/vehicles")
    public VanReservationResponse getVehicles(@RequestHeader("Authorization") String authHeader) {
        VanReservationResponse res = new VanReservationResponse();
        String token = tok(authHeader);
        if (!auth.userActive(jwtService.getUsername(token))) {
            res.setSuccess(false); res.setMessage("USER NOT ACTIVE!"); return res;
        }
        if (!isAllowed(token)) {
            res.setSuccess(false); res.setMessage("Access denied"); return res;
        }
        try {
            res.setSuccess(true);
            res.setMessage("Vehicles fetched successfully");
            res.setVehicles(vanService.getAvailableVehicles());
        } catch (Exception e) {
            logger.error("Error fetching van vehicles", e);
            res.setSuccess(false);
            res.setMessage("Failed to load vehicles");
        }
        return res;
    }

    @GetMapping("/drivers")
    public VanReservationResponse getDrivers(@RequestHeader("Authorization") String authHeader) {
        VanReservationResponse res = new VanReservationResponse();
        String token = tok(authHeader);
        if (!auth.userActive(jwtService.getUsername(token))) {
            res.setSuccess(false); res.setMessage("USER NOT ACTIVE!"); return res;
        }
        if (!isAllowed(token)) {
            res.setSuccess(false); res.setMessage("Access denied"); return res;
        }
        res.setSuccess(true);
        res.setDrivers(vanService.getActiveDrivers());
        return res;
    }

    @GetMapping("/reservations/{id}/available-vehicles")
    public VanReservationResponse getAvailableVehiclesForReservation(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id) {
        VanReservationResponse res = new VanReservationResponse();
        String token = tok(authHeader);
        if (!auth.userActive(jwtService.getUsername(token))) {
            res.setSuccess(false); res.setMessage("USER NOT ACTIVE!"); return res;
        }
        if (!isAllowed(token)) {
            res.setSuccess(false); res.setMessage("Access denied"); return res;
        }
        try {
            res.setSuccess(true);
            res.setMessage("Available vehicles fetched successfully");
            res.setVehicles(vanService.getAvailableVehiclesForReservation(id));
        } catch (Exception e) {
            logger.error("Error fetching available vehicles for reservation {}", id, e);
            res.setSuccess(false);
            res.setMessage("Failed to load available vehicles");
        }
        return res;
    }

    @GetMapping("/reservations/{id}/available-drivers")
    public VanReservationResponse getAvailableDriversForReservation(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id) {
        VanReservationResponse res = new VanReservationResponse();
        String token = tok(authHeader);
        if (!auth.userActive(jwtService.getUsername(token))) {
            res.setSuccess(false); res.setMessage("USER NOT ACTIVE!"); return res;
        }
        if (!isAllowed(token)) {
            res.setSuccess(false); res.setMessage("Access denied"); return res;
        }
        try {
            res.setSuccess(true);
            res.setMessage("Available drivers fetched successfully");
            res.setDrivers(vanService.getAvailableDriversForReservation(id));
        } catch (Exception e) {
            logger.error("Error fetching available drivers for reservation {}", id, e);
            res.setSuccess(false);
            res.setMessage("Failed to load available drivers");
        }
        return res;
    }

    @GetMapping("/vehicles/{id}/schedule")
    public VanReservationResponse getVehicleSchedule(@RequestHeader("Authorization") String authHeader,
            @PathVariable Long id,
            @RequestParam(required = false) Long excludeReservationId) {
        VanReservationResponse res = new VanReservationResponse();
        String token = tok(authHeader);
        if (!auth.userActive(jwtService.getUsername(token))) {
            res.setSuccess(false); res.setMessage("USER NOT ACTIVE!"); return res;
        }
        if (!isAllowed(token)) {
            res.setSuccess(false); res.setMessage("Access denied"); return res;
        }
        res.setSuccess(true);
        res.setApprovedEvents(vanService.getVehicleSchedule(id, excludeReservationId));
        return res;
    }

    @GetMapping("/drivers/{id}/schedule")
    public VanReservationResponse getDriverSchedule(@RequestHeader("Authorization") String authHeader,
            @PathVariable Long id,
            @RequestParam(required = false) Long excludeReservationId) {
        VanReservationResponse res = new VanReservationResponse();
        String token = tok(authHeader);
        if (!auth.userActive(jwtService.getUsername(token))) {
            res.setSuccess(false); res.setMessage("USER NOT ACTIVE!"); return res;
        }
        if (!isAllowed(token)) {
            res.setSuccess(false); res.setMessage("Access denied"); return res;
        }
        res.setSuccess(true);
        res.setApprovedEvents(vanService.getDriverSchedule(id, excludeReservationId));
        return res;
    }

    @PostMapping("/reservations/{id}/approve")
    public ResponseEntity<ReservationActionResponse> approve(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id,
            @RequestBody VanApproveRequest request) {
        ReservationActionResponse res = new ReservationActionResponse();
        String token = tok(authHeader);
        if (!auth.userActive(jwtService.getUsername(token))) {
            res.setSuccess(false); res.setMessage("USER NOT ACTIVE!");
            return ResponseEntity.status(401).body(res);
        }
        if (!isAllowed(token)) {
            res.setSuccess(false); res.setMessage("Access denied");
            return ResponseEntity.status(403).body(res);
        }
        if (request.getVehicleId() == null || request.getDriverId() == null) {
            res.setSuccess(false); res.setMessage("vehicleId and driverId are required");
            return ResponseEntity.badRequest().body(res);
        }
        res = vanService.approveReservation(id, request.getVehicleId(), request.getDriverId(),
                jwtService.getUsername(token));
        if (!res.isSuccess() && res.getBlockedReason() != null) {
            return ResponseEntity.status(409).body(res);
        }
        return res.isSuccess() ? ResponseEntity.ok(res) : ResponseEntity.badRequest().body(res);
    }

    @PutMapping("/reservations/{id}/reassign")
    public ResponseEntity<ReservationActionResponse> reassign(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id,
            @RequestBody VanApproveRequest request) {
        ReservationActionResponse res = new ReservationActionResponse();
        String token = tok(authHeader);
        if (!auth.userActive(jwtService.getUsername(token))) {
            res.setSuccess(false); res.setMessage("USER NOT ACTIVE!");
            return ResponseEntity.status(401).body(res);
        }
        if (!isAllowed(token)) {
            res.setSuccess(false); res.setMessage("Access denied");
            return ResponseEntity.status(403).body(res);
        }
        if (request.getVehicleId() == null || request.getDriverId() == null) {
            res.setSuccess(false); res.setMessage("vehicleId and driverId are required");
            return ResponseEntity.badRequest().body(res);
        }
        res = vanService.reassignVehicleAndDriver(id, request.getVehicleId(), request.getDriverId(),
                jwtService.getUsername(token));
        if (!res.isSuccess() && res.getBlockedReason() != null) {
            return ResponseEntity.status(409).body(res);
        }
        return res.isSuccess() ? ResponseEntity.ok(res) : ResponseEntity.badRequest().body(res);
    }

    @PatchMapping("/reservations/{id}/status")
    public ResponseEntity<ReservationActionResponse> updateStatus(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id,
            @RequestParam String status) {
        ReservationActionResponse res = new ReservationActionResponse();
        String token = tok(authHeader);
        if (!auth.userActive(jwtService.getUsername(token))) {
            res.setSuccess(false); res.setMessage("USER NOT ACTIVE!");
            return ResponseEntity.status(401).body(res);
        }
        if (!isAllowed(token)) {
            res.setSuccess(false); res.setMessage("Access denied");
            return ResponseEntity.status(403).body(res);
        }
        res = vanService.updateStatus(id, status, jwtService.getUsername(token));
        return res.isSuccess() ? ResponseEntity.ok(res) : ResponseEntity.badRequest().body(res);
    }

    @PutMapping("/reservations/{id}/reschedule")
    public ResponseEntity<ReservationActionResponse> reschedule(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        ReservationActionResponse res = new ReservationActionResponse();
        String token = tok(authHeader);
        if (!auth.userActive(jwtService.getUsername(token))) {
            res.setSuccess(false); res.setMessage("USER NOT ACTIVE!");
            return ResponseEntity.ok(res);
        }
        if (!isAllowed(token)) {
            res.setSuccess(false); res.setMessage("Access denied");
            return ResponseEntity.ok(res);
        }
        Object reservedDates = body.get("reservedDates");
        if (reservedDates == null) {
            res.setSuccess(false); res.setMessage("reservedDates is required");
            return ResponseEntity.ok(res);
        }
        res = vanService.reschedule(id, reservedDates, jwtService.getUsername(token));
        if (!res.isSuccess() && res.getBlockedReason() != null) {
            return ResponseEntity.status(409).body(res);
        }
        return ResponseEntity.ok(res);
    }

    @PutMapping("/reservations/{id}/details")
    public ResponseEntity<ReservationActionResponse> updateDetails(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id,
            @RequestBody org.lpu.dev.codes.model.dto.VanReservationDetailsEditRequest body) {
        ReservationActionResponse res = new ReservationActionResponse();
        String token = tok(authHeader);
        if (!auth.userActive(jwtService.getUsername(token))) {
            res.setSuccess(false);
            res.setMessage("USER NOT ACTIVE!");
            return ResponseEntity.status(401).body(res);
        }
        if (!"SUPERADMIN".equals(jwtService.getRole(token))) {
            res.setSuccess(false);
            res.setMessage("Only Super Admin can edit event details");
            return ResponseEntity.status(403).body(res);
        }
        if (!isAllowed(token)) {
            res.setSuccess(false);
            res.setMessage("Access denied");
            return ResponseEntity.status(403).body(res);
        }
        res = vanService.updateDetails(id, body, jwtService.getUsername(token));
        return ResponseEntity.ok(res);
    }
}
