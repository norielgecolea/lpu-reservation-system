package org.lpu.dev.codes.model.apiresponse;

import java.util.ArrayList;
import java.util.List;

import org.lpu.dev.codes.model.dto.AdminAuditLogDto;

public class AdminAuditLogResponse {

    private boolean success;
    private String message;
    private List<AdminAuditLogDto> logs = new ArrayList<>();
    private long totalCount;
    private List<String> actionTypes = new ArrayList<>();

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public List<AdminAuditLogDto> getLogs() { return logs; }
    public void setLogs(List<AdminAuditLogDto> logs) { this.logs = logs; }

    public long getTotalCount() { return totalCount; }
    public void setTotalCount(long totalCount) { this.totalCount = totalCount; }

    public List<String> getActionTypes() { return actionTypes; }
    public void setActionTypes(List<String> actionTypes) { this.actionTypes = actionTypes; }
}
