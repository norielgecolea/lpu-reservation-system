package org.lpu.dev.codes.model.dto;

public class VanReservationAdminDto {

    private Long id;
    private String department;
    private String organization;
    private String travelDestination;
    private String passengerNames;
    private Integer numberOfPassengers;
    private String returnTime;
    private String contactPerson;
    private String contactEmail;
    private String contactNumber;
    private String reservedDates;
    private String status;
    private String createdAt;
    private Integer satisfactionRating;
    private Long vehicleId;
    private Long driverId;
    private String vehicleLabel;
    private String driverName;
    private String approvedAt;
    private String approvedBy;
    private String additionalRemarks;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getOrganization() { return organization; }
    public void setOrganization(String organization) { this.organization = organization; }

    public String getTravelDestination() { return travelDestination; }
    public void setTravelDestination(String travelDestination) { this.travelDestination = travelDestination; }

    public String getPassengerNames() { return passengerNames; }
    public void setPassengerNames(String passengerNames) { this.passengerNames = passengerNames; }

    public Integer getNumberOfPassengers() { return numberOfPassengers; }
    public void setNumberOfPassengers(Integer numberOfPassengers) { this.numberOfPassengers = numberOfPassengers; }

    public String getReturnTime() { return returnTime; }
    public void setReturnTime(String returnTime) { this.returnTime = returnTime; }

    public String getContactPerson() { return contactPerson; }
    public void setContactPerson(String contactPerson) { this.contactPerson = contactPerson; }

    public String getContactEmail() { return contactEmail; }
    public void setContactEmail(String contactEmail) { this.contactEmail = contactEmail; }

    public String getContactNumber() { return contactNumber; }
    public void setContactNumber(String contactNumber) { this.contactNumber = contactNumber; }

    public String getReservedDates() { return reservedDates; }
    public void setReservedDates(String reservedDates) { this.reservedDates = reservedDates; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public Integer getSatisfactionRating() { return satisfactionRating; }
    public void setSatisfactionRating(Integer satisfactionRating) { this.satisfactionRating = satisfactionRating; }

    public Long getVehicleId() { return vehicleId; }
    public void setVehicleId(Long vehicleId) { this.vehicleId = vehicleId; }

    public Long getDriverId() { return driverId; }
    public void setDriverId(Long driverId) { this.driverId = driverId; }

    public String getVehicleLabel() { return vehicleLabel; }
    public void setVehicleLabel(String vehicleLabel) { this.vehicleLabel = vehicleLabel; }

    public String getDriverName() { return driverName; }
    public void setDriverName(String driverName) { this.driverName = driverName; }

    public String getApprovedAt() { return approvedAt; }
    public void setApprovedAt(String approvedAt) { this.approvedAt = approvedAt; }

    public String getApprovedBy() { return approvedBy; }
    public void setApprovedBy(String approvedBy) { this.approvedBy = approvedBy; }

    public String getAdditionalRemarks() { return additionalRemarks; }
    public void setAdditionalRemarks(String additionalRemarks) { this.additionalRemarks = additionalRemarks; }
}
