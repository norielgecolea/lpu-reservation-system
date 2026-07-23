package org.lpu.dev.codes.controller;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.lpu.dev.codes.model.apiresponse.EquipmentResponse;
import org.lpu.dev.codes.model.apiresponse.PopulateAllowedEmailsResponse;
import org.lpu.dev.codes.model.dto.CreateAllowedEmailRequest;
import org.lpu.dev.codes.model.dto.ImportAllowedEmailsRequest;
import org.lpu.dev.codes.services.AuthenticationService;
import org.lpu.dev.codes.services.JWTService;
import org.lpu.dev.codes.services.superadmin.SuperAdminAllowedEmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/")
@CrossOrigin("*")
public class AllowedEmailManagementController {

    private static final Logger logger = LogManager.getLogger(AllowedEmailManagementController.class);

    @Autowired
    private AuthenticationService auth;

    @Autowired
    private JWTService jwtService;

    @Autowired
    private SuperAdminAllowedEmailService allowedEmailService;

    @GetMapping("/admin/allowed-emails")
    public PopulateAllowedEmailsResponse list(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size,
            @RequestParam(required = false) String search) {
        String token = authHeader.replace("LpuL ", "");
        if (!auth.userActive(jwtService.getUsername(token))) {
            PopulateAllowedEmailsResponse res = new PopulateAllowedEmailsResponse();
            logger.error("User not Active! Possible Hacking!");
            res.setSuccess(false);
            res.setMessage("USER NOT ACTIVE!");
            return res;
        }
        return allowedEmailService.getAll(authHeader, page, size, search);
    }

    @PostMapping("/admin/allowed-emails")
    public EquipmentResponse create(@RequestHeader("Authorization") String authHeader,
            @RequestBody CreateAllowedEmailRequest request) {
        String token = authHeader.replace("LpuL ", "");
        if (!auth.userActive(jwtService.getUsername(token))) {
            EquipmentResponse res = new EquipmentResponse();
            logger.error("User not Active! Possible Hacking!");
            res.setSuccess(false);
            res.setMessage("USER NOT ACTIVE!");
            return res;
        }
        return allowedEmailService.create(authHeader, request);
    }

    @PatchMapping("/admin/allowed-emails/toggle")
    public EquipmentResponse toggle(@RequestHeader("Authorization") String authHeader,
            @RequestParam("id") Long id) {
        String token = authHeader.replace("LpuL ", "");
        if (!auth.userActive(jwtService.getUsername(token))) {
            EquipmentResponse res = new EquipmentResponse();
            logger.error("User not Active! Possible Hacking!");
            res.setSuccess(false);
            res.setMessage("USER NOT ACTIVE!");
            return res;
        }
        return allowedEmailService.toggleStatus(id, authHeader);
    }

    @DeleteMapping("/admin/allowed-emails")
    public EquipmentResponse delete(@RequestHeader("Authorization") String authHeader,
            @RequestParam("id") Long id) {
        String token = authHeader.replace("LpuL ", "");
        if (!auth.userActive(jwtService.getUsername(token))) {
            EquipmentResponse res = new EquipmentResponse();
            logger.error("User not Active! Possible Hacking!");
            res.setSuccess(false);
            res.setMessage("USER NOT ACTIVE!");
            return res;
        }
        return allowedEmailService.delete(id, authHeader);
    }

    @PostMapping("/admin/allowed-emails/import")
    public EquipmentResponse importCsv(@RequestHeader("Authorization") String authHeader,
            @RequestBody ImportAllowedEmailsRequest request) {
        String token = authHeader.replace("LpuL ", "");
        if (!auth.userActive(jwtService.getUsername(token))) {
            EquipmentResponse res = new EquipmentResponse();
            logger.error("User not Active! Possible Hacking!");
            res.setSuccess(false);
            res.setMessage("USER NOT ACTIVE!");
            return res;
        }
        return allowedEmailService.replaceAll(authHeader, request);
    }
}
