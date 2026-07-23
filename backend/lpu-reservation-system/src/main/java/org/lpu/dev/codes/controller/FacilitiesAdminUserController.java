package org.lpu.dev.codes.controller;

import java.util.List;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.lpu.dev.codes.model.apiresponse.AccountStatementResponse;
import org.lpu.dev.codes.model.apiresponse.PopulateUsersResponse;
import org.lpu.dev.codes.model.data.Users;
import org.lpu.dev.codes.model.dto.DeleteUserRequest;
import org.lpu.dev.codes.model.dto.ResetPasswordRequest;
import org.lpu.dev.codes.model.dto.UpdateUserRequest;
import org.lpu.dev.codes.repository.UserRepository;
import org.lpu.dev.codes.services.AuthenticationService;
import org.lpu.dev.codes.services.JWTService;
import org.lpu.dev.codes.services.superadmin.SuperAdminUserService;
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
import org.springframework.web.bind.annotation.RestController;

/**
 * User management for FACILITIESADMIN accounts.
 * Accessible by both FACILITIESADMIN and SUPERADMIN.
 * All operations are scoped to users with role = FACILITIESADMIN.
 */
@RestController
@RequestMapping("/api/facilities")
@CrossOrigin("*")
public class FacilitiesAdminUserController {

    private static final Logger logger = LogManager.getLogger(FacilitiesAdminUserController.class);
    private static final String FACILITIES_ROLE = "FACILITIESADMIN";

    @Autowired private AuthenticationService auth;
    @Autowired private JWTService jwtService;
    @Autowired private UserRepository userRepository;
    @Autowired private SuperAdminUserService userService;

    private String extractToken(String authHeader) {
        return authHeader.replace("LpuL ", "");
    }

    private boolean isAllowed(String token) {
        String role = jwtService.getRole(token);
        return "SUPERADMIN".equals(role) || FACILITIES_ROLE.equals(role);
    }

    private AccountStatementResponse inactiveResponse() {
        AccountStatementResponse res = new AccountStatementResponse();
        res.setSuccess(false);
        res.setMessage("USER NOT ACTIVE!");
        return res;
    }

    private AccountStatementResponse deniedResponse() {
        AccountStatementResponse res = new AccountStatementResponse();
        res.setSuccess(false);
        res.setMessage("Access denied");
        return res;
    }

    private Users getCaller(String token) {
        return userService.findByUserName(jwtService.getUsername(token));
    }

    private boolean isFacilitiesAdmin(Users user) {
        return user != null && FACILITIES_ROLE.equals(user.getRole());
    }

    // ── GET /api/facilities/users ─────────────────────────────────────────────

    @GetMapping("/users")
    public PopulateUsersResponse getUsers(@RequestHeader("Authorization") String authHeader) {
        PopulateUsersResponse res = new PopulateUsersResponse();
        String token = extractToken(authHeader);

        if (!auth.userActive(jwtService.getUsername(token))) {
            res.setSuccess(false);
            res.setMessage("USER NOT ACTIVE!");
            return res;
        }
        if (!isAllowed(token)) {
            res.setSuccess(false);
            res.setMessage("Access denied");
            return res;
        }

        try {
            List<Users> users = userRepository.getUsersByRole(FACILITIES_ROLE);
            res.setSuccess(true);
            res.setMessage("Users fetched successfully");
            res.setUsers(userService.mappedUserList(users));
        } catch (Exception e) {
            logger.error("Error fetching FACILITIESADMIN users", e);
            res.setSuccess(false);
            res.setMessage("Failed to fetch users");
        }
        return res;
    }

    // ── GET /api/facilities/users/{empId} ─────────────────────────────────────

    @GetMapping("/users/{empId}")
    public PopulateUsersResponse getUser(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable String empId) {

        PopulateUsersResponse res = new PopulateUsersResponse();
        String token = extractToken(authHeader);

        if (!auth.userActive(jwtService.getUsername(token))) {
            res.setSuccess(false);
            res.setMessage("USER NOT ACTIVE!");
            return res;
        }
        if (!isAllowed(token)) {
            res.setSuccess(false);
            res.setMessage("Access denied");
            return res;
        }

        Users target = userRepository.findByEmployeeId(empId);
        if (!isFacilitiesAdmin(target)) {
            res.setSuccess(false);
            res.setMessage("User not found");
            return res;
        }

        res.setSuccess(true);
        res.setMessage("User fetched successfully");
        res.setUsers(userService.mappedUserList(List.of(target)));
        return res;
    }

    // ── POST /api/facilities/createuser ──────────────────────────────────────

    @PostMapping("/createuser")
    public AccountStatementResponse createUser(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Users user) {

        String token = extractToken(authHeader);

        if (!auth.userActive(jwtService.getUsername(token))) {
            return inactiveResponse();
        }
        if (!isAllowed(token)) {
            return deniedResponse();
        }

        user.setRole(FACILITIES_ROLE);
        if (user.getUsername() != null) {
            user.setUsername(user.getUsername().toLowerCase());
        }
        if (user.getEmployeeId() != null) {
            user.setEmployeeId(user.getEmployeeId().trim());
        }

        Users existingUsername = userRepository.findByUsername(user.getUsername());
        if (existingUsername != null) {
            AccountStatementResponse res = new AccountStatementResponse();
            res.setSuccess(false);
            res.setMessage("Username already exists");
            return res;
        }

        Users existingEmpId = userRepository.findByEmployeeId(user.getEmployeeId());
        if (existingEmpId != null) {
            AccountStatementResponse res = new AccountStatementResponse();
            res.setSuccess(false);
            res.setMessage("Employee ID already exists");
            return res;
        }

        if (user.getEmail() != null && !user.getEmail().isBlank()) {
            Users existingEmail = userRepository.findByEmail(user.getEmail().trim());
            if (existingEmail != null) {
                AccountStatementResponse res = new AccountStatementResponse();
                res.setSuccess(false);
                res.setMessage("Email already exists");
                return res;
            }
        }

        AccountStatementResponse result = userService.createAccount(authHeader, user, jwtService.getUsername(token));
        if (Boolean.TRUE.equals(result.getSuccess())) {
            result.setMessage("Facilities admin account created successfully");
            logger.info("Created FACILITIESADMIN: {} ({})", user.getUsername(), user.getEmployeeId());
        }
        return result;
    }

    // ── PUT /api/facilities/updateuser ────────────────────────────────────────

    @PutMapping("/updateuser")
    public AccountStatementResponse updateUser(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody UpdateUserRequest request) {

        String token = extractToken(authHeader);

        if (!auth.userActive(jwtService.getUsername(token))) {
            return inactiveResponse();
        }
        if (!isAllowed(token)) {
            return deniedResponse();
        }

        Users target = userRepository.findByEmployeeId(request.getOldEmployeeId());
        if (!isFacilitiesAdmin(target)) {
            AccountStatementResponse res = new AccountStatementResponse();
            res.setSuccess(false);
            res.setMessage("User not found");
            return res;
        }

        request.setRole(FACILITIES_ROLE);
        return userService.updateUser(request, jwtService.getUsername(token));
    }

    // ── DELETE /api/facilities/deleteacc?empId= ───────────────────────────────

    @DeleteMapping("/deleteacc")
    public AccountStatementResponse deleteUser(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam String empId) {

        String token = extractToken(authHeader);

        if (!auth.userActive(jwtService.getUsername(token))) {
            return inactiveResponse();
        }
        if (!isAllowed(token)) {
            return deniedResponse();
        }

        Users target = userRepository.findByEmployeeId(empId);
        if (!isFacilitiesAdmin(target)) {
            AccountStatementResponse res = new AccountStatementResponse();
            res.setSuccess(false);
            res.setMessage("User not found");
            return res;
        }

        Users caller = getCaller(token);
        if (caller != null && empId.equalsIgnoreCase(caller.getEmployeeId())) {
            AccountStatementResponse res = new AccountStatementResponse();
            res.setSuccess(false);
            res.setMessage("You cannot delete your own account");
            return res;
        }

        DeleteUserRequest request = new DeleteUserRequest();
        request.setEmpId(empId);
        return userService.deleteAccountbyEmpId(authHeader, request, jwtService.getUsername(token));
    }

    // ── PATCH /api/facilities/users/reset-password ───────────────────────────

    @PatchMapping("/users/reset-password")
    public AccountStatementResponse resetPassword(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody ResetPasswordRequest request) {

        String token = extractToken(authHeader);

        if (!auth.userActive(jwtService.getUsername(token))) {
            return inactiveResponse();
        }
        if (!isAllowed(token)) {
            return deniedResponse();
        }

        Users target = userRepository.findByEmployeeId(request.getEmployeeId());
        if (!isFacilitiesAdmin(target)) {
            AccountStatementResponse res = new AccountStatementResponse();
            res.setSuccess(false);
            res.setMessage("User not found");
            return res;
        }

        Users caller = getCaller(token);
        String callerEmpId = caller != null ? caller.getEmployeeId() : null;
        return userService.resetPassword(callerEmpId, request.getEmployeeId(), request.getNewPassword(),
                jwtService.getUsername(token));
    }

    // ── PATCH /api/facilities/toggleaccstat?empId= ────────────────────────────

    @PatchMapping("/toggleaccstat")
    public AccountStatementResponse toggleStatus(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam String empId) {

        String token = extractToken(authHeader);

        if (!auth.userActive(jwtService.getUsername(token))) {
            return inactiveResponse();
        }
        if (!isAllowed(token)) {
            return deniedResponse();
        }

        Users target = userRepository.findByEmployeeId(empId);
        if (!isFacilitiesAdmin(target)) {
            AccountStatementResponse res = new AccountStatementResponse();
            res.setSuccess(false);
            res.setMessage("User not found");
            return res;
        }

        Users caller = getCaller(token);
        if (caller != null && empId.equalsIgnoreCase(caller.getEmployeeId())) {
            AccountStatementResponse res = new AccountStatementResponse();
            res.setSuccess(false);
            res.setMessage("You cannot change the status of your own account");
            return res;
        }

        return userService.toggleAccountStatus(empId, jwtService.getUsername(token));
    }
}
