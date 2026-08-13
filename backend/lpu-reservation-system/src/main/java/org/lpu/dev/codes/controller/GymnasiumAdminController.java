package org.lpu.dev.codes.controller;

import java.util.List;
import java.util.Map;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.lpu.dev.codes.model.apiresponse.ReservationActionResponse;
import org.lpu.dev.codes.model.apiresponse.EquipmentResponse;
import org.lpu.dev.codes.model.apiresponse.GymnasiumReservationResponse;
import org.lpu.dev.codes.model.dto.GymnasiumReservationAdminDto;
import org.lpu.dev.codes.services.AuthenticationService;
import org.lpu.dev.codes.services.GymnasiumReservationService;
import org.lpu.dev.codes.services.JWTService;
import org.lpu.dev.codes.util.ReservationListQuery;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/gymnasium")
@CrossOrigin("*")
public class GymnasiumAdminController {

    private static final Logger logger = LogManager.getLogger(GymnasiumAdminController.class);

    @Autowired private AuthenticationService auth;
    @Autowired private JWTService jwtService;
    @Autowired private GymnasiumReservationService gymService;
    @Autowired private org.lpu.dev.codes.services.RoleAccessService roleAccessService;

    private boolean isAllowed(String token) {
        String role = jwtService.getRole(token);
        return roleAccessService.roleHasService(role, org.lpu.dev.codes.services.RoleAccessService.SERVICE_GYMNASIUM);
    }

    private String tok(String header) { return header.replace("LpuL ", ""); }

    @GetMapping("/reservations")
    public GymnasiumReservationResponse getAllReservations(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam(required = false) String month,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate) {
        GymnasiumReservationResponse res = new GymnasiumReservationResponse();
        String token = tok(authHeader);
        if (!auth.userActive(jwtService.getUsername(token))) {
            res.setSuccess(false); res.setMessage("USER NOT ACTIVE!"); return res;
        }
        if (!isAllowed(token)) {
            res.setSuccess(false); res.setMessage("Access denied"); return res;
        }
        try {
            ReservationListQuery query = ReservationListQuery.of(month, fromDate, toDate);
            List<GymnasiumReservationAdminDto> reservations = gymService.getAllReservations(
                    query.month(), query.fromDate(), query.toDate());
            res.setSuccess(true);
            res.setMessage("Reservations fetched successfully");
            res.setReservations(reservations);
        } catch (Exception e) {
            logger.error("Error fetching gymnasium reservations", e);
            res.setSuccess(false); res.setMessage("Failed to fetch reservations");
        }
        return res;
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
        res = gymService.updateStatus(id, status, jwtService.getUsername(token));
        if (!res.isSuccess() && res.getBlockedReason() != null) {
            return ResponseEntity.status(409).body(res);
        }
        return res.isSuccess() ? ResponseEntity.ok(res) : ResponseEntity.badRequest().body(res);
    }

    @PostMapping("/reservations/{id}/coordination")
    public EquipmentResponse setCoordination(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        EquipmentResponse res = new EquipmentResponse();
        String token = tok(authHeader);
        if (!auth.userActive(jwtService.getUsername(token))) {
            res.setSuccess(false); res.setMessage("USER NOT ACTIVE!"); return res;
        }
        if (!isAllowed(token)) {
            res.setSuccess(false); res.setMessage("Access denied"); return res;
        }
        String date = body.get("date");
        String startTime = body.get("startTime");
        String endTime = body.get("endTime");
        if (date == null || startTime == null || endTime == null) {
            res.setSuccess(false); res.setMessage("date, startTime, and endTime are required"); return res;
        }
        boolean ok = gymService.setCoordination(id, date, startTime, endTime,
                jwtService.getUsername(token));
        res.setSuccess(ok);
        res.setMessage(ok ? "Coordination meeting set" : "Failed to set coordination meeting");
        return res;
    }

    @PutMapping("/reservations/{id}/reschedule")
    public ResponseEntity<ReservationActionResponse> reschedule(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        ReservationActionResponse res = new ReservationActionResponse();
        String token = tok(authHeader);
        if (!auth.userActive(jwtService.getUsername(token))) {
            res.setSuccess(false); res.setMessage("USER NOT ACTIVE!"); return ResponseEntity.ok(res);
        }
        if (!isAllowed(token)) {
            res.setSuccess(false); res.setMessage("Access denied"); return ResponseEntity.ok(res);
        }
        Object reservedDates = body.get("reservedDates");
        if (reservedDates == null) {
            res.setSuccess(false); res.setMessage("reservedDates is required"); return ResponseEntity.ok(res);
        }
        res = gymService.reschedule(id, reservedDates, jwtService.getUsername(token));
        return ResponseEntity.ok(res);
    }

    @PutMapping("/reservations/{id}/details")
    public ResponseEntity<ReservationActionResponse> updateDetails(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id,
            @RequestBody org.lpu.dev.codes.model.dto.GymnasiumReservationDetailsEditRequest body) {
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
        res = gymService.updateDetails(id, body, jwtService.getUsername(token));
        return ResponseEntity.ok(res);
    }

    @DeleteMapping("/reservations/{id}")
    public ResponseEntity<ReservationActionResponse> deleteReservation(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id) {
        ReservationActionResponse res = new ReservationActionResponse();
        String token = tok(authHeader);
        if (!auth.userActive(jwtService.getUsername(token))) {
            res.setSuccess(false);
            res.setMessage("USER NOT ACTIVE!");
            return ResponseEntity.status(401).body(res);
        }
        if (!"SUPERADMIN".equals(jwtService.getRole(token))) {
            res.setSuccess(false);
            res.setMessage("Only Super Admin can delete reservations");
            return ResponseEntity.status(403).body(res);
        }
        if (!isAllowed(token)) {
            res.setSuccess(false);
            res.setMessage("Access denied");
            return ResponseEntity.status(403).body(res);
        }
        res = gymService.deleteReservation(id, jwtService.getUsername(token));
        return ResponseEntity.ok(res);
    }
}
