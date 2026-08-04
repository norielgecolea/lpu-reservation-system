package org.lpu.dev.codes.controller;

import java.util.List;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.lpu.dev.codes.model.apiresponse.EquipmentResponse;
import org.lpu.dev.codes.model.apiresponse.PopulateEquipmentResponse;
import org.lpu.dev.codes.model.data.Facility;
import org.lpu.dev.codes.model.dto.CreateEquipmentRequest;
import org.lpu.dev.codes.model.dto.UpdateEquipmentRequest;
import org.lpu.dev.codes.services.AuthenticationService;
import org.lpu.dev.codes.services.JWTService;
import org.lpu.dev.codes.services.facilities.FacilitiesEquipmentService;
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
@RequestMapping("/api/facilities")
@CrossOrigin("*")
public class FacilitiesEquipmentController {

    private static final Logger logger = LogManager.getLogger(FacilitiesEquipmentController.class);

    @Autowired private AuthenticationService auth;
    @Autowired private JWTService jwtService;
    @Autowired private FacilitiesEquipmentService facilitiesEquipmentService;
    @Autowired private org.lpu.dev.codes.services.RoleAccessService roleAccessService;

    private String tok(String header) {
        return header.replace("LpuL ", "");
    }

    private boolean isAllowed(String token) {
        String role = jwtService.getRole(token);
        return roleAccessService.roleHasAnyService(role)
                && !"FLTTECH".equalsIgnoreCase(role);
    }

    private PopulateEquipmentResponse unauthorizedList() {
        PopulateEquipmentResponse res = new PopulateEquipmentResponse();
        res.setSuccess(false);
        res.setMessage("Unauthorized");
        return res;
    }

    private EquipmentResponse unauthorizedAction() {
        EquipmentResponse res = new EquipmentResponse();
        res.setSuccess(false);
        res.setMessage("Unauthorized");
        return res;
    }

    @GetMapping("/equipment")
    public PopulateEquipmentResponse list(@RequestHeader("Authorization") String authHeader) {
        String token = tok(authHeader);
        if (!auth.userActive(jwtService.getUsername(token))) {
            PopulateEquipmentResponse res = new PopulateEquipmentResponse();
            logger.error("User not Active! Possible Hacking!");
            res.setSuccess(false);
            res.setMessage("USER NOT ACTIVE!");
            return res;
        }
        if (!isAllowed(token)) {
            return unauthorizedList();
        }
        return facilitiesEquipmentService.getEquipment();
    }

    @GetMapping("/facility")
    public List<Facility> listFacilities(@RequestHeader("Authorization") String authHeader) {
        String token = tok(authHeader);
        if (!isAllowed(token)) {
            return List.of();
        }
        return facilitiesEquipmentService.getFacilities();
    }

    @PatchMapping("/toggleequipmentstat")
    public EquipmentResponse toggleStatus(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam("id") Long id) {
        String token = tok(authHeader);
        if (!auth.userActive(jwtService.getUsername(token))) {
            EquipmentResponse res = new EquipmentResponse();
            res.setSuccess(false);
            res.setMessage("USER NOT ACTIVE!");
            return res;
        }
        if (!isAllowed(token)) {
            return unauthorizedAction();
        }
        return facilitiesEquipmentService.toggleEquipmentStatus(id, jwtService.getUsername(token));
    }

    @DeleteMapping("/deleteequipment")
    public EquipmentResponse delete(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam("id") Long id) {
        String token = tok(authHeader);
        if (!isAllowed(token)) {
            return unauthorizedAction();
        }
        return facilitiesEquipmentService.deleteEquipment(id, jwtService.getUsername(token));
    }

    @PostMapping("/createequipment")
    public EquipmentResponse create(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody CreateEquipmentRequest equipment) {
        String token = tok(authHeader);
        if (!isAllowed(token)) {
            return unauthorizedAction();
        }
        return facilitiesEquipmentService.createEquipment(equipment, jwtService.getUsername(token));
    }

    @PutMapping("/updateequipment")
    public EquipmentResponse update(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody UpdateEquipmentRequest equipment) {
        String token = tok(authHeader);
        if (!isAllowed(token)) {
            return unauthorizedAction();
        }
        return facilitiesEquipmentService.updateEquipment(equipment, jwtService.getUsername(token));
    }
}
