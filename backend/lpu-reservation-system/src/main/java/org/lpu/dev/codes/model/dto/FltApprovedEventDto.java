package org.lpu.dev.codes.model.dto;

public class FltApprovedEventDto {

    private String eventTitle;
    private String department;
    private String organization;
    private String date;
    private String startTime;
    private String endTime;
    private String eventKind; // "RESERVATION" | "COORDINATION"

    public FltApprovedEventDto() {}

    public FltApprovedEventDto(String eventTitle, String department, String organization, String date, String startTime, String endTime, String eventKind) {
        this.eventTitle = eventTitle;
        this.department = department;
        this.organization = organization;
        this.date = date;
        this.startTime = startTime;
        this.endTime = endTime;
        this.eventKind = eventKind;
    }

    public String getEventTitle() { return eventTitle; }
    public void setEventTitle(String eventTitle) { this.eventTitle = eventTitle; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getOrganization() { return organization; }
    public void setOrganization(String organization) { this.organization = organization; }

    public String getEventKind() { return eventKind; }
    public void setEventKind(String eventKind) { this.eventKind = eventKind; }

    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }

    public String getStartTime() { return startTime; }
    public void setStartTime(String startTime) { this.startTime = startTime; }

    public String getEndTime() { return endTime; }
    public void setEndTime(String endTime) { this.endTime = endTime; }
}
