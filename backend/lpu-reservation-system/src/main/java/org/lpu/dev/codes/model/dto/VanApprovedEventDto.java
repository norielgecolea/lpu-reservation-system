package org.lpu.dev.codes.model.dto;

public class VanApprovedEventDto {

    private Long reservationId;
    private String department;
    private String organization;
    private String travelDestination;
    private String date;
    private String startTime;
    private String endTime;
    private Long vehicleId;
    private String vehicleLabel;
    private String driverName;
    private String eventKind;

    public VanApprovedEventDto() {}

    public VanApprovedEventDto(String department, String organization, String travelDestination,
            String date, String startTime, String endTime, Long vehicleId, String vehicleLabel,
            String driverName, String eventKind) {
        this(department, organization, travelDestination, date, startTime, endTime, vehicleId,
                vehicleLabel, driverName, eventKind, null);
    }

    public VanApprovedEventDto(String department, String organization, String travelDestination,
            String date, String startTime, String endTime, Long vehicleId, String vehicleLabel,
            String driverName, String eventKind, Long reservationId) {
        this.department = department;
        this.organization = organization;
        this.travelDestination = travelDestination;
        this.date = date;
        this.startTime = startTime;
        this.endTime = endTime;
        this.vehicleId = vehicleId;
        this.vehicleLabel = vehicleLabel;
        this.driverName = driverName;
        this.eventKind = eventKind;
        this.reservationId = reservationId;
    }

    public Long getReservationId() { return reservationId; }
    public void setReservationId(Long reservationId) { this.reservationId = reservationId; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getOrganization() { return organization; }
    public void setOrganization(String organization) { this.organization = organization; }

    public String getTravelDestination() { return travelDestination; }
    public void setTravelDestination(String travelDestination) { this.travelDestination = travelDestination; }

    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }

    public String getStartTime() { return startTime; }
    public void setStartTime(String startTime) { this.startTime = startTime; }

    public String getEndTime() { return endTime; }
    public void setEndTime(String endTime) { this.endTime = endTime; }

    public Long getVehicleId() { return vehicleId; }
    public void setVehicleId(Long vehicleId) { this.vehicleId = vehicleId; }

    public String getVehicleLabel() { return vehicleLabel; }
    public void setVehicleLabel(String vehicleLabel) { this.vehicleLabel = vehicleLabel; }

    public String getDriverName() { return driverName; }
    public void setDriverName(String driverName) { this.driverName = driverName; }

    public String getEventKind() { return eventKind; }
    public void setEventKind(String eventKind) { this.eventKind = eventKind; }
}
