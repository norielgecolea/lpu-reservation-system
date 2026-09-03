package org.lpu.dev.codes.controller;

import java.util.List;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.lpu.dev.codes.model.apiresponse.EoReservationResponse;
import org.lpu.dev.codes.model.apiresponse.ReservationActionResponse;
import org.lpu.dev.codes.model.dto.EoReservationAdminDto;
import org.lpu.dev.codes.model.dto.EoReservationRequest;
import org.lpu.dev.codes.services.AuthenticationService;
import org.lpu.dev.codes.services.EoReservationService;
import org.lpu.dev.codes.services.JWTService;
import org.lpu.dev.codes.services.RoleAccessService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/eo")
@CrossOrigin("*")
public class EoAdminController {

    private static final Logger logger = LogManager.getLogger(EoAdminController.class);

    @Autowired private AuthenticationService auth;
    @Autowired private JWTService jwtService;
    @Autowired private EoReservationService eoService;
    @Autowired private RoleAccessService roleAccessService;

    private String tok(String header) {
        return header.replace("LpuL ", "");
    }

    private boolean canAccessRoom(String token, String roomType) {
        String role = jwtService.getRole(token);
        if (RoleAccessService.ROLE_EOADMIN.equals(role)
                || RoleAccessService.ROLE_SUPERADMIN.equals(role)) {
            return true;
        }
        String room = EoReservationService.normalizeRoom(roomType);
        if (room == null) {
            return roleAccessService.roleHasService(role, RoleAccessService.SERVICE_BOARDROOM)
                    || roleAccessService.roleHasService(role, RoleAccessService.SERVICE_CONFERENCE);
        }
        return roleAccessService.roleHasService(role, room);
    }

    private boolean isUserActive(String token) {
        return auth.userActive(jwtService.getUsername(token));
    }

    @GetMapping("/events")
    public EoReservationResponse listEvents(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam(required = false) String month,
            @RequestParam(required = false) String roomType) {
        EoReservationResponse res = new EoReservationResponse();
        String token = tok(authHeader);
        if (!isUserActive(token)) {
            res.setSuccess(false);
            res.setMessage("USER NOT ACTIVE!");
            return res;
        }
        if (!canAccessRoom(token, roomType)) {
            res.setSuccess(false);
            res.setMessage("Access denied");
            return res;
        }
        try {
            String room = EoReservationService.normalizeRoom(roomType);
            String role = jwtService.getRole(token);
            if (room == null
                    && !RoleAccessService.ROLE_EOADMIN.equals(role)
                    && !RoleAccessService.ROLE_SUPERADMIN.equals(role)) {
                boolean board = roleAccessService.roleHasService(role, RoleAccessService.SERVICE_BOARDROOM);
                boolean conf = roleAccessService.roleHasService(role, RoleAccessService.SERVICE_CONFERENCE);
                if (board && !conf) room = RoleAccessService.SERVICE_BOARDROOM;
                else if (conf && !board) room = RoleAccessService.SERVICE_CONFERENCE;
            }
            List<EoReservationAdminDto> reservations = eoService.listEvents(month, room);
            res.setSuccess(true);
            res.setMessage("Events fetched");
            res.setReservations(reservations);
        } catch (Exception e) {
            logger.error("Error fetching EO events", e);
            res.setSuccess(false);
            res.setMessage("Failed to fetch events");
        }
        return res;
    }

    @GetMapping("/{id}")
    public EoReservationResponse getOne(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id) {
        EoReservationResponse res = new EoReservationResponse();
        String token = tok(authHeader);
        if (!isUserActive(token)) {
            res.setSuccess(false);
            res.setMessage("USER NOT ACTIVE!");
            return res;
        }
        EoReservationAdminDto dto = eoService.getById(id);
        if (dto == null) {
            res.setSuccess(false);
            res.setMessage("Reservation not found");
            return res;
        }
        if (!canAccessRoom(token, dto.getRoomType())) {
            res.setSuccess(false);
            res.setMessage("Access denied");
            return res;
        }
        res.setSuccess(true);
        res.setMessage("OK");
        res.setReservation(dto);
        return res;
    }

    @PostMapping("/reserve")
    public ResponseEntity<ReservationActionResponse> reserve(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody EoReservationRequest body) {
        ReservationActionResponse res = new ReservationActionResponse();
        String token = tok(authHeader);
        if (!isUserActive(token)) {
            res.setSuccess(false);
            res.setMessage("USER NOT ACTIVE!");
            return ResponseEntity.status(401).body(res);
        }
        if (!canAccessRoom(token, body.getRoomType())) {
            res.setSuccess(false);
            res.setMessage("Access denied");
            return ResponseEntity.status(403).body(res);
        }
        res = eoService.create(body, jwtService.getUsername(token));
        if (!res.isSuccess() && res.getBlockedReason() != null) {
            return ResponseEntity.status(409).body(res);
        }
        return res.isSuccess() ? ResponseEntity.ok(res) : ResponseEntity.badRequest().body(res);
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<ReservationActionResponse> cancel(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id) {
        ReservationActionResponse res = new ReservationActionResponse();
        String token = tok(authHeader);
        if (!isUserActive(token)) {
            res.setSuccess(false);
            res.setMessage("USER NOT ACTIVE!");
            return ResponseEntity.status(401).body(res);
        }
        EoReservationAdminDto existing = eoService.getById(id);
        if (existing == null) {
            res.setSuccess(false);
            res.setMessage("Reservation not found");
            return ResponseEntity.status(404).body(res);
        }
        if (!canAccessRoom(token, existing.getRoomType())) {
            res.setSuccess(false);
            res.setMessage("Access denied");
            return ResponseEntity.status(403).body(res);
        }
        res = eoService.cancel(id, jwtService.getUsername(token));
        return res.isSuccess() ? ResponseEntity.ok(res) : ResponseEntity.badRequest().body(res);
    }
}
