package org.lpu.dev.codes.services;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.lpu.dev.codes.model.apiresponse.LoginResponse;
import org.lpu.dev.codes.model.data.Users;
import org.lpu.dev.codes.model.dto.ForgotPasswordRequest;
import org.lpu.dev.codes.model.dto.LoginRequest;
import org.lpu.dev.codes.model.dto.ResetPasswordWithTokenRequest;
import org.lpu.dev.codes.model.dto.UpdateProfileRequest;
import org.lpu.dev.codes.repository.UserRepository;
import org.lpu.dev.codes.security.JWTUtil;
import org.lpu.dev.codes.services.superadmin.SuperAdminUserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class AuthenticationService {
	private static final Logger logger = LogManager.getLogger(AuthenticationService.class);
	@Autowired
	private IpService ipService;
	@Autowired
	private UserRepository userRepository;
	@Autowired
	private JWTService jwtService;
	@Autowired
	private SuperAdminUserService userService;
	@Autowired
	private PasswordEncoder passwordEncoder;
	@Autowired
	private JWTUtil jwtUtil;
	@Autowired
	private PasswordResetEmailService passwordResetEmailService;

	public AuthenticationService() {
		logger.info("Authentication Service Started");
		
	}

	public LoginResponse login(LoginRequest request) {
		logger.info("Agent: {}", ipService.getClientAgent());
		LoginResponse response = new LoginResponse();
		
		Users user = userRepository.findByUsername(request.getUsername());

		if (user == null) {
			response.setSuccess(false);
			response.setMessage("Invalid username or password");
			logger.warn(String.format("Login Failed: Invalid Username or Password: User is null"));
			return response;

		}

		if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {

			response.setSuccess(false);
			response.setMessage("Invalid username or password");
			logger.warn(String.format("Invalid Username: %s or Password: %s ", request.getUsername(),
					request.getPassword()));
			return response;
		}

		if (!user.getStatus().equalsIgnoreCase("ACTIVE")) {
			response.setSuccess(false);
			response.setMessage("User Status Inactive Contact Administrator");

			logger.warn(String.format("User Status Inactive Contact Administrator "));
			return response;
		}

		String token = jwtUtil.generateToken(user.getUsername(), user.getRole(), request.isRememberMe());

		response.setToken(token);
		response.setUsername(user.getUsername());
		response.setRole(user.getRole());

		response.setSuccess(true);
		response.setMessage("Login Successfull");
		logger.info(String.format("Login Successfull username: %s token %s", request.getUsername(), token));

		response.setEmail(user.getEmail());
		response.setFullname(user.getFullname());
		response.setEmpId(user.getEmployeeId());

		return response;
	}
	
	
	public Boolean userActive(String username) {
		logger.info("Agent: {}", ipService.getClientAgent());
		return userRepository.isUserActive(username);
	}
	
	
	public ResponseEntity<LoginResponse> validate(String authHeader) {
		logger.info("Agent: {}", ipService.getClientAgent());
		String token = authHeader.replace("LpuL ", "");

		String username = jwtService.getUsername(token);
		logger.info(String.format("Validating token: %s", token));
		if (username == null) {
			LoginResponse response = new LoginResponse();
			response.setSuccess(false);
			response.setMessage("Invalid token");
			logger.warn("Token Not Valid!");
			return ResponseEntity.status(401).body(response);
		}

		Users user = userService.findByUserName(username);
		LoginResponse response = new LoginResponse();
		if (user == null) {
			response.setSuccess(false);
			response.setMessage("User not found");
			return ResponseEntity.status(404).body(response);
		}
		if (user.getStatus().equalsIgnoreCase("ACTIVE")) {

			response.setToken(token);
			response.setSuccess(true);
			response.setMessage("User fetched successfully");

			response.setUsername(user.getUsername());
			response.setRole(user.getRole());
			response.setEmail(user.getEmail());
			response.setFullname(user.getFullname());
			response.setEmpId(user.getEmployeeId());

			logger.info(String.format("Token Valid! employee: %s", user.getEmployeeId()));

		} else {
			response.setToken(token);
			response.setSuccess(false);
			response.setMessage("User Status Inactive Contact Administrator");

			logger.warn(String.format("User Status Inactive Contact Administrator "));

		}

		return ResponseEntity.ok(response);
	}

	@Transactional
	public ResponseEntity<LoginResponse> updateProfile(String authHeader, UpdateProfileRequest request) {
		logger.info("Agent: {}", ipService.getClientAgent());
		LoginResponse response = new LoginResponse();

		try {
			if (authHeader == null || authHeader.isBlank()) {
				response.setSuccess(false);
				response.setMessage("Missing authorization");
				return ResponseEntity.status(401).body(response);
			}

			String token = authHeader.replace("LpuL ", "");
			String username = jwtService.getUsername(token);

			if (username == null || !userActive(username)) {
				response.setSuccess(false);
				response.setMessage("Invalid or inactive session");
				return ResponseEntity.status(401).body(response);
			}

			var profileOpt = userRepository.findProfileRowByUsername(username);
			if (profileOpt.isEmpty()) {
				response.setSuccess(false);
				response.setMessage("User not found");
				return ResponseEntity.status(404).body(response);
			}

			Object[] row = profileOpt.get();
			Long userId = ((Number) row[0]).longValue();
			String currentUsername = (String) row[1];
			String passwordHash = (String) row[2];

			if (request.getFullname() != null && !request.getFullname().isBlank()) {
				userRepository.updateFullname(userId, request.getFullname().trim());
			}
			if (request.getEmail() != null && !request.getEmail().isBlank()) {
				String newEmail = request.getEmail().trim().toLowerCase();
				if (userRepository.isEmailUsedByOther(userId, newEmail)) {
					response.setSuccess(false);
					response.setMessage("Email is already in use");
					return ResponseEntity.badRequest().body(response);
				}
				userRepository.updateEmail(userId, newEmail);
			}

			if (request.getNewPassword() != null && !request.getNewPassword().isBlank()) {
				if (request.getNewPassword().length() < 6) {
					response.setSuccess(false);
					response.setMessage("New password must be at least 6 characters");
					return ResponseEntity.badRequest().body(response);
				}
				if (request.getCurrentPassword() == null || passwordHash == null
						|| !passwordEncoder.matches(request.getCurrentPassword(), passwordHash)) {
					response.setSuccess(false);
					response.setMessage("Current password is incorrect");
					return ResponseEntity.badRequest().body(response);
				}
				userRepository.updatePasswordHash(userId, passwordEncoder.encode(request.getNewPassword()));
			}

			profileOpt = userRepository.findProfileRowByUsername(currentUsername);
			if (profileOpt.isEmpty()) {
				response.setSuccess(false);
				response.setMessage("User not found after update");
				return ResponseEntity.status(500).body(response);
			}
			row = profileOpt.get();

			response.setSuccess(true);
			response.setMessage("Profile updated successfully");
			response.setToken(token);
			response.setUsername((String) row[1]);
			response.setRole((String) row[5]);
			response.setEmail((String) row[3]);
			response.setFullname((String) row[4]);
			response.setEmpId(row[6] != null ? row[6].toString() : null);

			logger.info("Profile updated for user: {}", response.getUsername());
			return ResponseEntity.ok(response);
		} catch (Exception e) {
			logger.error("Failed to update profile", e);
			response.setSuccess(false);
			response.setMessage("Failed to update profile. Please try again.");
			return ResponseEntity.status(500).body(response);
		}
	}

	@Transactional
	public LoginResponse requestPasswordReset(ForgotPasswordRequest request) {
		LoginResponse response = new LoginResponse();
		response.setSuccess(true);
		response.setMessage("If an account exists for that email, a reset link has been sent.");

		if (request.getEmail() == null || request.getEmail().isBlank()) {
			return response;
		}

		Users user = userRepository.findByEmail(request.getEmail().trim());
		if (user == null || !"ACTIVE".equalsIgnoreCase(user.getStatus())) {
			return response;
		}

		String token = UUID.randomUUID().toString();
		user.setResetToken(token);
		user.setResetTokenExpiresAt(LocalDateTime.now().plusHours(1));
		userRepository.save(user);
		passwordResetEmailService.sendPasswordResetEmail(user.getEmail(), user.getFullname(), token);
		logger.info("Password reset requested for user: {}", user.getUsername());
		return response;
	}

	@Transactional
	public LoginResponse resetPasswordWithToken(ResetPasswordWithTokenRequest request) {
		LoginResponse response = new LoginResponse();

		if (request.getToken() == null || request.getToken().isBlank()) {
			response.setSuccess(false);
			response.setMessage("Reset token is required");
			return response;
		}
		if (request.getNewPassword() == null || request.getNewPassword().length() < 6) {
			response.setSuccess(false);
			response.setMessage("New password must be at least 6 characters");
			return response;
		}

		Users user = userRepository.findByResetToken(request.getToken().trim());
		if (user == null || user.getResetTokenExpiresAt() == null
				|| user.getResetTokenExpiresAt().isBefore(LocalDateTime.now())) {
			response.setSuccess(false);
			response.setMessage("Invalid or expired reset link");
			return response;
		}
		if (!"ACTIVE".equalsIgnoreCase(user.getStatus())) {
			response.setSuccess(false);
			response.setMessage("Account is inactive. Contact an administrator.");
			return response;
		}

		user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
		user.setResetToken(null);
		user.setResetTokenExpiresAt(null);
		userRepository.save(user);

		response.setSuccess(true);
		response.setMessage("Password reset successfully. You can now sign in.");
		logger.info("Password reset completed for user: {}", user.getUsername());
		return response;
	}
}