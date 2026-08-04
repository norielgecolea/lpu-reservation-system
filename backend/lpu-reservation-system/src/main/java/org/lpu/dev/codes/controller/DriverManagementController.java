package org.lpu.dev.codes.controller;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.lpu.dev.codes.model.apiresponse.EquipmentResponse;
import org.lpu.dev.codes.model.apiresponse.VanReservationResponse;
import org.lpu.dev.codes.model.dto.CreateDriverRequest;
import org.lpu.dev.codes.model.dto.UpdateDriverRequest;
import org.lpu.dev.codes.services.AuthenticationService;
import org.lpu.dev.codes.services.DriverService;
import org.lpu.dev.codes.services.JWTService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/facilities/drivers")
@CrossOrigin("*")
public class DriverManagementController {

    private static final Logger logger = LogManager.getLogger(DriverManagementController.class);

    @Autowired private AuthenticationService auth;
    @Autowired private JWTService jwtService;
    @Autowired private DriverService driverService;
    @Autowired private org.lpu.dev.codes.services.RoleAccessService roleAccessService;

    private boolean isAllowed(String token) {
        String role = jwtService.getRole(token);
        return roleAccessService.roleHasAnyService(role)
                && !"FLTTECH".equalsIgnoreCase(role);
    }

    private String tok(String header) { return header.replace("LpuL ", ""); }

    @GetMapping
    public VanReservationResponse list(@RequestHeader("Authorization") String authHeader) {
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
            res.setMessage("Drivers fetched successfully");
            res.setDrivers(driverService.getAllDrivers());
        } catch (Exception e) {
            logger.error("Error fetching drivers", e);
            res.setSuccess(false); res.setMessage("Failed to fetch drivers");
        }
        return res;
    }

    @PostMapping
    public EquipmentResponse create(@RequestHeader("Authorization") String authHeader,
            @RequestBody CreateDriverRequest request) {
        EquipmentResponse res = new EquipmentResponse();
        String token = tok(authHeader);
        if (!auth.userActive(jwtService.getUsername(token))) {
            res.setSuccess(false); res.setMessage("USER NOT ACTIVE!"); return res;
        }
        if (!isAllowed(token)) {
            res.setSuccess(false); res.setMessage("Access denied"); return res;
        }
        boolean ok = driverService.createDriver(request, jwtService.getUsername(token));
        res.setSuccess(ok);
        res.setMessage(ok ? "Driver created successfully" : "Failed to create driver");
        return res;
    }

    @PutMapping
    public EquipmentResponse update(@RequestHeader("Authorization") String authHeader,
            @RequestBody UpdateDriverRequest request) {
        EquipmentResponse res = new EquipmentResponse();
        String token = tok(authHeader);
        if (!auth.userActive(jwtService.getUsername(token))) {
            res.setSuccess(false); res.setMessage("USER NOT ACTIVE!"); return res;
        }
        if (!isAllowed(token)) {
            res.setSuccess(false); res.setMessage("Access denied"); return res;
        }
        boolean ok = driverService.updateDriver(request, jwtService.getUsername(token));
        res.setSuccess(ok);
        res.setMessage(ok ? "Driver updated successfully" : "Failed to update driver");
        return res;
    }

    @PatchMapping("/toggle-status")
    public EquipmentResponse toggle(@RequestHeader("Authorization") String authHeader,
            @RequestParam Long id) {
        EquipmentResponse res = new EquipmentResponse();
        String token = tok(authHeader);
        if (!auth.userActive(jwtService.getUsername(token))) {
            res.setSuccess(false); res.setMessage("USER NOT ACTIVE!"); return res;
        }
        if (!isAllowed(token)) {
            res.setSuccess(false); res.setMessage("Access denied"); return res;
        }
        boolean ok = driverService.toggleStatus(id, jwtService.getUsername(token));
        res.setSuccess(ok);
        res.setMessage(ok ? "Driver status updated" : "Failed to update driver status");
        return res;
    }

    @DeleteMapping
    public EquipmentResponse delete(@RequestHeader("Authorization") String authHeader,
            @RequestParam Long id) {
        EquipmentResponse res = new EquipmentResponse();
        String token = tok(authHeader);
        if (!auth.userActive(jwtService.getUsername(token))) {
            res.setSuccess(false); res.setMessage("USER NOT ACTIVE!"); return res;
        }
        if (!isAllowed(token)) {
            res.setSuccess(false); res.setMessage("Access denied"); return res;
        }
        boolean ok = driverService.deleteDriver(id, jwtService.getUsername(token));
        res.setSuccess(ok);
        res.setMessage(ok ? "Driver deleted successfully" : "Failed to delete driver");
        return res;
    }
}
