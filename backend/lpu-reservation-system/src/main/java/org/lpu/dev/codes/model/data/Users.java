package org.lpu.dev.codes.model.data;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "users")
public class Users {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	private String username;

	private String fullname;

	private String role;

	private String email;

	@Column(name = "employee_id")
	private String employeeId;
	
	@Column(name = "password_hash")
	private String passwordHash;

	@Column(name = "reset_token")
	private String resetToken;

	@Column(name = "reset_token_expires_at")
	private java.time.LocalDateTime resetTokenExpiresAt;

	private String status;

	public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public String getUsername() {
		return username;
	}

	public void setUsername(String username) {
		this.username = username;
	}

	public String getFullname() {
		return fullname;
	}

	public void setFullname(String fullname) {
		this.fullname = fullname;
	}

	public String getRole() {
		return role;
	}

	public void setRole(String role) {
		this.role = role;
	}

	public String getEmail() {
		return email;
	}

	public void setEmail(String email) {
		this.email = email;
	}

	public String getEmployeeId() {
		return employeeId;
	}

	public void setEmployeeId(String employeeId) {
		this.employeeId = employeeId;
	}

	public String getPasswordHash() {
		return passwordHash;
	}

	public void setPasswordHash(String passwordHash) {
		this.passwordHash = passwordHash;
	}

	public String getResetToken() { return resetToken; }
	public void setResetToken(String resetToken) { this.resetToken = resetToken; }

	public java.time.LocalDateTime getResetTokenExpiresAt() { return resetTokenExpiresAt; }
	public void setResetTokenExpiresAt(java.time.LocalDateTime resetTokenExpiresAt) {
		this.resetTokenExpiresAt = resetTokenExpiresAt;
	}

	public String getStatus() {
		return status;
	}

	public void setStatus(String status) {
		this.status = status;
	}

	// getters and setters

}
