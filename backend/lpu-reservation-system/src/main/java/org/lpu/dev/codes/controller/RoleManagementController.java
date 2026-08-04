package org.lpu.dev.codes.controller;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.lpu.dev.codes.model.apiresponse.RoleManagementResponse;
import org.lpu.dev.codes.model.dto.CreateAppRoleRequest;
import org.lpu.dev.codes.model.dto.UpdateAppRoleRequest;
import org.lpu.dev.codes.services.AuthenticationService;
import org.lpu.dev.codes.services.JWTService;
import org.lpu.dev.codes.services.RoleAccessService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/roles")
@CrossOrigin("*")
public class RoleManagementController {

    private static final Logger logger = LogManager.getLogger(RoleManagementController.class);

    @Autowired private AuthenticationService auth;
    @Autowired private JWTService jwtService;
    @Autowired private RoleAccessService roleAccessService;

    @GetMapping
    public ResponseEntity<RoleManagementResponse> list(
            @RequestHeader("Authorization") String authHeader) {
        RoleManagementResponse res = new RoleManagementResponse();
        if (!isSuperAdmin(authHeader, res)) {
            return ResponseEntity.ok(res);
        }
        try {
            res.setSuccess(true);
            res.setRoles(roleAccessService.listRoles());
            res.setMessage("OK");
        } catch (Exception e) {
            logger.error("Failed to list roles", e);
            res.setSuccess(false);
            res.setMessage("Failed to list roles");
        }
        return ResponseEntity.ok(res);
    }

    @PostMapping
    public ResponseEntity<RoleManagementResponse> create(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody CreateAppRoleRequest body) {
        RoleManagementResponse res = new RoleManagementResponse();
        if (!isSuperAdmin(authHeader, res)) {
            return ResponseEntity.ok(res);
        }
        try {
            res.setRole(roleAccessService.createRole(body));
            res.setSuccess(true);
            res.setMessage("Role created");
            res.setRoles(roleAccessService.listRoles());
        } catch (IllegalArgumentException e) {
            res.setSuccess(false);
            res.setMessage(e.getMessage());
        } catch (Exception e) {
            logger.error("Failed to create role", e);
            res.setSuccess(false);
            res.setMessage("Failed to create role");
        }
        return ResponseEntity.ok(res);
    }

    @PutMapping("/{code}")
    public ResponseEntity<RoleManagementResponse> update(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable String code,
            @RequestBody UpdateAppRoleRequest body) {
        RoleManagementResponse res = new RoleManagementResponse();
        if (!isSuperAdmin(authHeader, res)) {
            return ResponseEntity.ok(res);
        }
        try {
            res.setRole(roleAccessService.updateRole(code, body));
            res.setSuccess(true);
            res.setMessage("Role updated");
            res.setRoles(roleAccessService.listRoles());
        } catch (IllegalArgumentException e) {
            res.setSuccess(false);
            res.setMessage(e.getMessage());
        } catch (Exception e) {
            logger.error("Failed to update role {}", code, e);
            res.setSuccess(false);
            res.setMessage("Failed to update role");
        }
        return ResponseEntity.ok(res);
    }

    @DeleteMapping("/{code}")
    public ResponseEntity<RoleManagementResponse> delete(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable String code) {
        RoleManagementResponse res = new RoleManagementResponse();
        if (!isSuperAdmin(authHeader, res)) {
            return ResponseEntity.ok(res);
        }
        try {
            roleAccessService.deleteRole(code);
            res.setSuccess(true);
            res.setMessage("Role deleted");
            res.setRoles(roleAccessService.listRoles());
        } catch (IllegalArgumentException e) {
            res.setSuccess(false);
            res.setMessage(e.getMessage());
        } catch (Exception e) {
            logger.error("Failed to delete role {}", code, e);
            res.setSuccess(false);
            res.setMessage("Failed to delete role");
        }
        return ResponseEntity.ok(res);
    }

    private boolean isSuperAdmin(String authHeader, RoleManagementResponse res) {
        String token = authHeader.replace("LpuL ", "");
        if (!auth.userActive(jwtService.getUsername(token))) {
            res.setSuccess(false);
            res.setMessage("USER NOT ACTIVE!");
            return false;
        }
        if (!"SUPERADMIN".equals(jwtService.getRole(token))) {
            res.setSuccess(false);
            res.setMessage("Access denied");
            return false;
        }
        return true;
    }
}
