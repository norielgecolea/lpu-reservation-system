package org.lpu.dev.codes.model.apiresponse;

import java.util.List;

import org.lpu.dev.codes.model.dto.PopulateUserList;

public class PopulateUsersResponse {
	private boolean success;
	private String message;
	private List<PopulateUserList> users;

	public boolean isSuccess() {
		return success;
	}

	public void setSuccess(boolean success) {
		this.success = success;
	}

	public String getMessage() {
		return message;
	}

	public void setMessage(String message) {
		this.message = message;
	}

	public List<PopulateUserList> getUsers() {
		return users;
	}

	public void setUsers(List<PopulateUserList> users) {
		this.users = users;
	}

}
