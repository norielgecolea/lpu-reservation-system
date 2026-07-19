package org.lpu.dev.codes.model.apiresponse;

import org.lpu.dev.codes.model.data.Users;

public class RegisterResponse {
	private String message;
	private String token;
	private Users users;
	public String getMessage() {
		return message;
	}
	public void setMessage(String message) {
		this.message = message;
	}
	public String getToken() {
		return token;
	}
	public void setToken(String token) {
		this.token = token;
	}
	public Users getUsers() {
		return users;
	}
	public void setUsers(Users users) {
		this.users = users;
	}
	
	
}
