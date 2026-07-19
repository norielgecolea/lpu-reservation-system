package org.lpu.dev.codes.model.dto;

public class UpdateUserRequest {

	private String oldEmployeeId;

	private String employeeId;
	private String fullname;
	private String role;
	private String email;
	private String username;
	
	

	public String getUsername() {
		return username;
	}

	public void setUsername(String username) {
		this.username = username;
	}

	public String getOldEmployeeId() {
		return oldEmployeeId;
	}

	public void setOldEmployeeId(String oldEmployeeId) {
		this.oldEmployeeId = oldEmployeeId;
	}

	public String getEmployeeId() {
		return employeeId;
	}

	public void setEmployeeId(String employeeId) {
		this.employeeId = employeeId;
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

	// getters and setters

}
