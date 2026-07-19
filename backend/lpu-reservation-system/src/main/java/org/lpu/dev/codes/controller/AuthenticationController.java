package org.lpu.dev.codes.controller;

import org.lpu.dev.codes.model.apiresponse.LoginResponse;
import org.lpu.dev.codes.model.dto.ForgotPasswordRequest;
import org.lpu.dev.codes.model.dto.LoginRequest;
import org.lpu.dev.codes.model.dto.ResetPasswordWithTokenRequest;
import org.lpu.dev.codes.model.dto.UpdateProfileRequest;
import org.lpu.dev.codes.services.AuthenticationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin("*")
public class AuthenticationController {
	
	@Autowired
	private AuthenticationService authService;
	

	@PostMapping("/login")
	public LoginResponse login(@RequestBody LoginRequest request) {
		request.setUsername(request.getUsername().toLowerCase());
		
		return authService.login(request);
	}

	@GetMapping("/me")
	public ResponseEntity<LoginResponse> getCurrentUser(@RequestHeader("Authorization") String authHeader) {
		return authService.validate(authHeader);
	}

	@PutMapping("/profile")
	public ResponseEntity<LoginResponse> updateProfile(
			@RequestHeader("Authorization") String authHeader,
			@RequestBody UpdateProfileRequest request) {
		return authService.updateProfile(authHeader, request);
	}

	@PostMapping("/forgot-password")
	public LoginResponse forgotPassword(@RequestBody ForgotPasswordRequest request) {
		return authService.requestPasswordReset(request);
	}

	@PostMapping("/reset-password")
	public LoginResponse resetPasswordWithToken(@RequestBody ResetPasswordWithTokenRequest request) {
		return authService.resetPasswordWithToken(request);
	}
}