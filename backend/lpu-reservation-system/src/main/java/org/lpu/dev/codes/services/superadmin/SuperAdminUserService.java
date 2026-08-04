package org.lpu.dev.codes.services.superadmin;

import java.util.List;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.lpu.dev.codes.model.apiresponse.AccountStatementResponse;
import org.lpu.dev.codes.model.apiresponse.PopulateUsersResponse;
import org.lpu.dev.codes.model.data.Users;
import org.lpu.dev.codes.model.dto.DeleteUserRequest;
import org.lpu.dev.codes.model.dto.PopulateUserList;
import org.lpu.dev.codes.model.dto.UpdateUserRequest;
import org.lpu.dev.codes.repository.UserRepository;
import org.lpu.dev.codes.services.AdminAuditService;
import org.lpu.dev.codes.services.JWTService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service

public class SuperAdminUserService {

	private static final Logger logger = LogManager.getLogger(SuperAdminUserService.class);

	@Autowired
	private UserRepository userRepository;
	@Autowired
	private JWTService jwtservice;

	@Autowired
	private PasswordEncoder passwordEncoder;

	@Autowired
	private AdminAuditService auditService;

	@Autowired
	private org.lpu.dev.codes.services.RoleAccessService roleAccessService;

	@Transactional
	public void createDefaultSuperAdmin() {

		try {

			logger.info("Checking for existing SUPERADMIN account...");

			if (userRepository.existsByRole("SUPERADMIN")) {

				logger.info("SUPERADMIN account already exists. Skipping creation.");

				return;
			}

			logger.warn("No SUPERADMIN account found. Creating default SUPERADMIN...");

			Users superAdmin = new Users();

			superAdmin.setUsername("superadmin");
			superAdmin.setFullname("Admin");
			superAdmin.setRole("SUPERADMIN");
			superAdmin.setEmail("superadmin@lpu.edu.ph");
			superAdmin.setEmployeeId("SUPER001");
			superAdmin.setStatus("ACTIVE");
			superAdmin.setPasswordHash("$2a$10$GFDhdtkDkYctEUZjLrd5te1SROXu9MmWNJHfebcTOLsyWEBvuSIzK");

			userRepository.save(superAdmin);

			logger.info("=======================================");
			logger.info("DEFAULT SUPERADMIN CREATED SUCCESSFULLY");
			logger.info("Username   : {}", superAdmin.getUsername());
			logger.info("EmployeeID : {}", superAdmin.getEmployeeId());
			logger.info("Email      : {}", superAdmin.getEmail());
			logger.info("Role       : {}", superAdmin.getRole());
			logger.info("=======================================");

		} catch (Exception e) {

			logger.error("Failed to create default SUPERADMIN account", e);
		}
	}

	@Transactional
	public Users findByUserName(String username) {
		Users result = userRepository.findByUsername(username.toLowerCase());
		logger.info(String.format("Fetching username %s info", username));
		if (result == null) {
			logger.warn(String.format("Username %s not found", username));
			return null;
		} else {
			logger.info(String.format("Fetch Username %s Success!", username));
			return result;
		}

	}

	@Transactional
	public String findRolebyUsername(String username) {
		Users result = userRepository.findByUsername(username.toLowerCase());
		if (result == null) {
			return null;
		} else {
			return result.getRole();
		}
	}

	public List<PopulateUserList> mappedUserList(List<Users> users) {

		List<PopulateUserList> userList = users.stream().map(user -> {
			PopulateUserList dto = new PopulateUserList();

			dto.setId(user.getId());
			dto.setUsername(user.getUsername());
			dto.setFullname(user.getFullname());
			dto.setRole(user.getRole());
			dto.setEmail(user.getEmail());
			dto.setEmployeeId(user.getEmployeeId());
			dto.setStatus(user.getStatus());

			return dto;
		}).toList();

		return userList;

	}

	@Transactional
	public PopulateUsersResponse getAllUsers(String token) {
		logger.info("Getting User... Validating...");
		PopulateUsersResponse response = new PopulateUsersResponse();
		boolean validated = jwtservice.validateToken(token.replace("LpuL ", ""));

		try {
			List<Users> users = userRepository.getAllUsers();

			if (validated) {
				logger.info("Get User Success");
				response.setMessage("Get User Success");
				response.setSuccess(true);
				response.setUsers(mappedUserList(users));
				return response;

			} else {
				logger.info("Get User Fail: Unvalidated Session");
				response.setSuccess(false);
				response.setMessage("Unvalidated Session");
				response.setUsers(null);
				return response;
			}
		} catch (Exception e) {
			response.setSuccess(false);
			response.setMessage("Database Failure");
			return response;
		}

	}

	@Transactional
	public AccountStatementResponse createAccount(String token, Users user, String performedBy) {

		AccountStatementResponse response = new AccountStatementResponse();
		logger.info("Started Account Creation Sevice");
		try {

			// Validate token first
			boolean validated = jwtservice.validateToken(token.replace("LpuL ", ""));

			if (!validated) {
				logger.warn("Account Creation Service Closing: Not Valid Token");
				response.setSuccess(false);
				response.setMessage("Unvalidated Session");
				return response;
			}
			// Check duplicate username
			Users existingUser = userRepository.findByUsername(user.getUsername());

			if (existingUser != null) {
				logger.info(String.format("Username: %s Already Exist", user.getUsername()));
				response.setSuccess(false);
				response.setMessage("Username already exists");
				return response;
			}

			if (user.getEmployeeId() != null && !user.getEmployeeId().isBlank()) {
				Users existingEmp = userRepository.findByEmployeeId(user.getEmployeeId().trim());
				if (existingEmp != null) {
					logger.info("Employee ID already exists: {}", user.getEmployeeId());
					response.setSuccess(false);
					response.setMessage("Employee ID already exists");
					return response;
				}
			}

			if (user.getEmail() != null && !user.getEmail().isBlank()) {
				String email = user.getEmail().trim().toLowerCase();
				user.setEmail(email);
				Users existingEmail = userRepository.findByEmail(email);
				if (existingEmail != null) {
					logger.info("Email already exists: {}", email);
					response.setSuccess(false);
					response.setMessage("Email already exists");
					return response;
				}
			}

			if (user.getRole() == null || !roleAccessService.roleExists(user.getRole())) {
				response.setSuccess(false);
				response.setMessage("Invalid role. Choose a role from Role Management.");
				return response;
			}
			user.setRole(org.lpu.dev.codes.services.RoleAccessService.normalizeRole(user.getRole()));

			// Hash password
			user.setPasswordHash(passwordEncoder.encode(user.getPasswordHash()));

			// Optional default status
			if (user.getStatus() == null || user.getStatus().isBlank()) {
				user.setStatus("ACTIVE");
			}

			userRepository.save(user);

			auditService.log("USERS", "CREATE", performedBy, "user", user.getId(), user.getFullname(),
					AdminAuditService.detailsOf(
							"employeeId", user.getEmployeeId(),
							"username", user.getUsername(),
							"role", user.getRole(),
							"email", user.getEmail()));

			response.setSuccess(true);
			response.setMessage("Create Account Success");

			logger.info(String.format("Account Creation Success %s %s %s %s", user.getEmployeeId(), user.getEmail(),
					user.getFullname(), user.getRole()));

			return response;

		} catch (Exception e) {

			response.setSuccess(false);
			logger.error(String.format("Failed to create account %s", e.getMessage()));
			response.setMessage(friendlyCreateAccountError(e));

			return response;
		}

	}

	@Transactional
	public AccountStatementResponse deleteAccountbyEmpId(String token, DeleteUserRequest user, String performedBy) {

		AccountStatementResponse response = new AccountStatementResponse();

		try {

			logger.info("Delete account request received for Employee ID: {}", user.getEmpId());

			if (!jwtservice.validateToken(token.replace("LpuL ", ""))) {
				logger.warn("Delete account failed. Invalid session. Employee ID: {}", user.getEmpId());

				response.setSuccess(false);
				response.setMessage("Unvalidated Session");
				return response;
			}

			boolean deleted = userRepository.deleteUserByEmpId(user.getEmpId());

			if (deleted) {
				logger.info("User deleted successfully. Employee ID: {}", user.getEmpId());

				auditService.log("USERS", "DELETE", performedBy, "user", null, user.getEmpId(),
						AdminAuditService.detailsOf("employeeId", user.getEmpId()));

				response.setSuccess(true);
				response.setMessage("Delete User Success");
			} else {
				logger.warn("Delete account failed. User not found. Employee ID: {}", user.getEmpId());

				response.setSuccess(false);
				response.setMessage("User not found");
			}

			return response;

		} catch (Exception e) {
			logger.error("Error deleting user. Employee ID: {}", user.getEmpId(), e);
			throw new RuntimeException("Failed to delete user", e);
		}
	}

	@Transactional
	public AccountStatementResponse toggleAccountStatus(String empId, String performedBy) {

		AccountStatementResponse response = new AccountStatementResponse();

		try {

			logger.info("Toggle account status request received. Employee ID: {}", empId);

			Users user = userRepository.findByEmployeeId(empId);

			if (user == null) {

				logger.warn("Toggle account status failed. User not found. Employee ID: {}", empId);

				response.setSuccess(false);
				response.setMessage("User not found");
				return response;
			}

			String oldStatus = user.getStatus();
			String newStatus = "ACTIVE";

			if ("ACTIVE".equalsIgnoreCase(oldStatus)) {
				newStatus = "INACTIVE";
			}

			boolean updated = userRepository.updateStatus(empId, newStatus);

			if (updated) {
				logger.info("User status updated successfully. Employee ID: {}, Old Status: {}, New Status: {}", empId,
						oldStatus, newStatus);

				auditService.log("USERS", "TOGGLE_STATUS", performedBy, "user", user.getId(), user.getFullname(),
						AdminAuditService.detailsOf(
								"employeeId", empId,
								"previousStatus", oldStatus,
								"newStatus", newStatus));
			} else {
				logger.warn("Failed to update status. Employee ID: {}, Requested Status: {}", empId, newStatus);
			}

			response.setSuccess(updated);
			response.setMessage(updated ? "Account status changed to " + newStatus : "Failed to update account status");

			return response;

		} catch (Exception e) {

			logger.error("Error toggling account status. Employee ID: {}", empId, e);

			response.setSuccess(false);
			response.setMessage("Failed to update account status");

			return response;
		}
	}

	@Transactional
	public AccountStatementResponse updateUser(UpdateUserRequest request, String performedBy) {

		AccountStatementResponse response = new AccountStatementResponse();

		try {

			logger.info("Update user request received. Old Employee ID: {}, New Employee ID: {}",
					request.getOldEmployeeId(), request.getEmployeeId());

			Users user = userRepository.findByEmployeeId(request.getOldEmployeeId());

			if (user == null) {

				logger.warn("User not found. Employee ID: {}", request.getOldEmployeeId());

				response.setSuccess(false);
				response.setMessage("User not found");

				return response;
			}

			logger.info("Found user: {} ({})", user.getFullname(), user.getEmployeeId());

			// Check duplicate employee ID
			if (!request.getOldEmployeeId().equalsIgnoreCase(request.getEmployeeId())) {

				logger.info("Employee ID change detected. Checking duplicate for {}", request.getEmployeeId());

				Users existing = userRepository.findByEmployeeId(request.getEmployeeId());

				if (existing != null) {

					logger.warn("Duplicate Employee ID found: {}", request.getEmployeeId());

					response.setSuccess(false);
					response.setMessage("Employee ID already exists");

					return response;
				}
			}

			// Check duplicate username
			if (!request.getUsername().equalsIgnoreCase(user.getUsername())) {

				logger.info("Username change detected. Checking duplicate for {}", request.getUsername());

				Users existingUser = userRepository.findByUsername(request.getUsername());

				if (existingUser != null) {

					logger.warn("Duplicate username found: {}", request.getUsername());

					response.setSuccess(false);
					response.setMessage("Username already exists");

					return response;
				}
			}

			String newEmail = request.getEmail() == null ? "" : request.getEmail().trim().toLowerCase();
			if (!newEmail.isEmpty() && userRepository.isEmailUsedByOther(user.getId(), newEmail)) {
				logger.warn("Duplicate email found: {}", newEmail);
				response.setSuccess(false);
				response.setMessage("Email already exists");
				return response;
			}

			logger.info("Updating user details...");

			user.setUsername(request.getUsername());

			user.setEmployeeId(request.getEmployeeId().trim());

			user.setFullname(request.getFullname().trim());

			user.setEmail(newEmail);

			if (request.getRole() == null || !roleAccessService.roleExists(request.getRole())) {
				response.setSuccess(false);
				response.setMessage("Invalid role. Choose a role from Role Management.");
				return response;
			}
			user.setRole(org.lpu.dev.codes.services.RoleAccessService.normalizeRole(request.getRole()));

			userRepository.save(user);

			logger.info("User updated successfully. Employee ID: {}", user.getEmployeeId());

			auditService.log("USERS", "UPDATE", performedBy, "user", user.getId(), user.getFullname(),
					AdminAuditService.detailsOf(
							"employeeId", user.getEmployeeId(),
							"username", user.getUsername(),
							"role", user.getRole(),
							"email", user.getEmail()));

			response.setSuccess(true);
			response.setMessage("Account updated successfully");

			return response;

		} catch (Exception e) {

			logger.error("Failed updating user. Old Employee ID: {}, Request: {}", request.getOldEmployeeId(), request,
					e);

			response.setSuccess(false);
			response.setMessage("Failed to update account");

			return response;
		}
	}

	@Transactional
	public AccountStatementResponse resetPassword(String callerEmpId, String targetEmpId, String newPassword,
			String performedBy) {

		AccountStatementResponse response = new AccountStatementResponse();

		try {
			if (callerEmpId != null && callerEmpId.equalsIgnoreCase(targetEmpId)) {
				response.setSuccess(false);
				response.setMessage("You cannot reset your own password from here");
				return response;
			}

			if (newPassword == null || newPassword.length() < 6) {
				response.setSuccess(false);
				response.setMessage("Password must be at least 6 characters");
				return response;
			}

			Users user = userRepository.findByEmployeeId(targetEmpId);
			if (user == null) {
				response.setSuccess(false);
				response.setMessage("User not found");
				return response;
			}

			user.setPasswordHash(passwordEncoder.encode(newPassword));
			userRepository.save(user);

			logger.info("Password reset for employee ID: {}", targetEmpId);

			auditService.log("USERS", "RESET_PASSWORD", performedBy, "user", user.getId(), user.getFullname(),
					AdminAuditService.detailsOf("employeeId", targetEmpId));

			response.setSuccess(true);
			response.setMessage("Password reset successfully");
			return response;

		} catch (Exception e) {
			logger.error("Failed to reset password for employee ID: {}", targetEmpId, e);
			response.setSuccess(false);
			response.setMessage("Failed to reset password");
			return response;
		}
	}

	private static String friendlyCreateAccountError(Throwable e) {
		String msg = rootMessage(e).toLowerCase();
		if (msg.contains("email") || msg.contains("users_email") || msg.contains("(email)")) {
			return "Email already exists";
		}
		if (msg.contains("username") || msg.contains("users_username") || msg.contains("(username)")) {
			return "Username already exists";
		}
		if (msg.contains("employee_id") || msg.contains("users_employee") || msg.contains("(employee_id)")) {
			return "Employee ID already exists";
		}
		if (msg.contains("duplicate") || msg.contains("unique") || msg.contains("constraint")) {
			return "A user with the same details already exists";
		}
		return "Failed to create account";
	}

	private static String rootMessage(Throwable e) {
		Throwable cur = e;
		StringBuilder sb = new StringBuilder();
		while (cur != null) {
			if (cur.getMessage() != null) {
				if (sb.length() > 0) sb.append(' ');
				sb.append(cur.getMessage());
			}
			cur = cur.getCause();
		}
		return sb.toString();
	}
}
