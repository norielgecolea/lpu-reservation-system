package org.lpu.dev.codes.model.dto;

public class GymnasiumReservationAdminDto {

    private Long id;
    private String eventTitle;
    private String department;
    private String organization;
    private String numberOfAttendees;
    private String contactPerson;
    private String contactEmail;
    private String contactNumber;
    private String reservedDates;
    private String requestedEquipment;
    private String status;
    private String createdAt;
    private String coordinationDate;
    private String coordinationStartTime;
    private String coordinationEndTime;
    private Integer satisfactionRating;
    private String additionalInstructions;
    private String approvedAt;
    private String approvedBy;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getEventTitle() { return eventTitle; }
    public void setEventTitle(String eventTitle) { this.eventTitle = eventTitle; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getOrganization() { return organization; }
    public void setOrganization(String organization) { this.organization = organization; }

    public String getNumberOfAttendees() { return numberOfAttendees; }
    public void setNumberOfAttendees(String numberOfAttendees) { this.numberOfAttendees = numberOfAttendees; }

    public String getContactPerson() { return contactPerson; }
    public void setContactPerson(String contactPerson) { this.contactPerson = contactPerson; }

    public String getContactEmail() { return contactEmail; }
    public void setContactEmail(String contactEmail) { this.contactEmail = contactEmail; }

    public String getContactNumber() { return contactNumber; }
    public void setContactNumber(String contactNumber) { this.contactNumber = contactNumber; }

    public String getReservedDates() { return reservedDates; }
    public void setReservedDates(String reservedDates) { this.reservedDates = reservedDates; }

    public String getRequestedEquipment() { return requestedEquipment; }
    public void setRequestedEquipment(String requestedEquipment) { this.requestedEquipment = requestedEquipment; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public String getCoordinationDate() { return coordinationDate; }
    public void setCoordinationDate(String coordinationDate) { this.coordinationDate = coordinationDate; }

    public String getCoordinationStartTime() { return coordinationStartTime; }
    public void setCoordinationStartTime(String coordinationStartTime) { this.coordinationStartTime = coordinationStartTime; }

    public String getCoordinationEndTime() { return coordinationEndTime; }
    public void setCoordinationEndTime(String coordinationEndTime) { this.coordinationEndTime = coordinationEndTime; }

    public Integer getSatisfactionRating() { return satisfactionRating; }
    public void setSatisfactionRating(Integer satisfactionRating) { this.satisfactionRating = satisfactionRating; }

    public String getAdditionalInstructions() { return additionalInstructions; }
    public void setAdditionalInstructions(String additionalInstructions) { this.additionalInstructions = additionalInstructions; }

    public String getApprovedAt() { return approvedAt; }
    public void setApprovedAt(String approvedAt) { this.approvedAt = approvedAt; }

    public String getApprovedBy() { return approvedBy; }
    public void setApprovedBy(String approvedBy) { this.approvedBy = approvedBy; }
}
