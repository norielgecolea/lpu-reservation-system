package org.lpu.dev.codes.model.apiresponse;

import java.util.ArrayList;
import java.util.List;

import org.lpu.dev.codes.model.dto.AppRoleDto;

public class RoleManagementResponse {
    private boolean success;
    private String message;
    private List<AppRoleDto> roles = new ArrayList<>();
    private AppRoleDto role;

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public List<AppRoleDto> getRoles() { return roles; }
    public void setRoles(List<AppRoleDto> roles) { this.roles = roles != null ? roles : new ArrayList<>(); }

    public AppRoleDto getRole() { return role; }
    public void setRole(AppRoleDto role) { this.role = role; }
}
