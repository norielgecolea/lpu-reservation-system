package org.lpu.dev.codes.model.dto;

public class FltReservationAdminDto {

    private Long id;
    private String eventTitle;
    private String eventType;
    private String department;
    private String organization;
    private String contactPerson;
    private String contactEmail;
    private String contactNumber;
    private String reservedDates;
    private String requestedEquipment;
    private String roomType;
    private String expectedAttendees;
    private String coordinationDate;
    private String coordinationStartTime;
    private String coordinationEndTime;
    private String additionalInstructions;
    private String status;
    private String createdAt;
    private Integer satisfactionRating;
    private String approvedAt;
    private String approvedBy;

    public FltReservationAdminDto() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getEventTitle() { return eventTitle; }
    public void setEventTitle(String eventTitle) { this.eventTitle = eventTitle; }

    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getOrganization() { return organization; }
    public void setOrganization(String organization) { this.organization = organization; }

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

    public String getRoomType() { return roomType; }
    public void setRoomType(String roomType) { this.roomType = roomType; }

    public String getExpectedAttendees() { return expectedAttendees; }
    public void setExpectedAttendees(String expectedAttendees) { this.expectedAttendees = expectedAttendees; }

    public String getCoordinationDate() { return coordinationDate; }
    public void setCoordinationDate(String coordinationDate) { this.coordinationDate = coordinationDate; }

    public String getCoordinationStartTime() { return coordinationStartTime; }
    public void setCoordinationStartTime(String coordinationStartTime) { this.coordinationStartTime = coordinationStartTime; }

    public String getCoordinationEndTime() { return coordinationEndTime; }
    public void setCoordinationEndTime(String coordinationEndTime) { this.coordinationEndTime = coordinationEndTime; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getAdditionalInstructions() { return additionalInstructions; }
    public void setAdditionalInstructions(String additionalInstructions) { this.additionalInstructions = additionalInstructions; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public Integer getSatisfactionRating() { return satisfactionRating; }
    public void setSatisfactionRating(Integer satisfactionRating) { this.satisfactionRating = satisfactionRating; }

    public String getApprovedAt() { return approvedAt; }
    public void setApprovedAt(String approvedAt) { this.approvedAt = approvedAt; }

    public String getApprovedBy() { return approvedBy; }
    public void setApprovedBy(String approvedBy) { this.approvedBy = approvedBy; }
}
