package org.lpu.dev.codes.model.dto;

public class MaintenanceBlockDto {
    private Long id;
    private String facilityType;
    private String blockDate;
    private String startTime;
    private String endTime;
    private String reason;
    private String createdAt;

    public MaintenanceBlockDto() {}

    public MaintenanceBlockDto(Long id, String facilityType, String blockDate, String startTime, String endTime, String reason, String createdAt) {
        this.id = id;
        this.facilityType = facilityType;
        this.blockDate = blockDate;
        this.startTime = startTime;
        this.endTime = endTime;
        this.reason = reason;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getFacilityType() { return facilityType; }
    public void setFacilityType(String facilityType) { this.facilityType = facilityType; }

    public String getBlockDate() { return blockDate; }
    public void setBlockDate(String blockDate) { this.blockDate = blockDate; }

    public String getStartTime() { return startTime; }
    public void setStartTime(String startTime) { this.startTime = startTime; }

    public String getEndTime() { return endTime; }
    public void setEndTime(String endTime) { this.endTime = endTime; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
}
