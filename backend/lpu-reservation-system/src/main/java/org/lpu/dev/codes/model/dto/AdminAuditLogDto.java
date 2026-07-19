package org.lpu.dev.codes.model.dto;

public class AdminAuditLogDto {

    private Long id;
    private String service;
    private String actionType;
    private String adminUsername;
    private String adminFullname;
    private String targetType;
    private Long targetId;
    private String targetLabel;
    private String details;
    private String performedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getService() { return service; }
    public void setService(String service) { this.service = service; }

    public String getActionType() { return actionType; }
    public void setActionType(String actionType) { this.actionType = actionType; }

    public String getAdminUsername() { return adminUsername; }
    public void setAdminUsername(String adminUsername) { this.adminUsername = adminUsername; }

    public String getAdminFullname() { return adminFullname; }
    public void setAdminFullname(String adminFullname) { this.adminFullname = adminFullname; }

    public String getTargetType() { return targetType; }
    public void setTargetType(String targetType) { this.targetType = targetType; }

    public Long getTargetId() { return targetId; }
    public void setTargetId(Long targetId) { this.targetId = targetId; }

    public String getTargetLabel() { return targetLabel; }
    public void setTargetLabel(String targetLabel) { this.targetLabel = targetLabel; }

    public String getDetails() { return details; }
    public void setDetails(String details) { this.details = details; }

    public String getPerformedAt() { return performedAt; }
    public void setPerformedAt(String performedAt) { this.performedAt = performedAt; }
}
