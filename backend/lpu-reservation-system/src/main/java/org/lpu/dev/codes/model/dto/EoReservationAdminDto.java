package org.lpu.dev.codes.model.dto;

public class EoReservationAdminDto {

    private Long id;
    private String roomType;
    private String agenda;
    private String department;
    private String organization;
    private String notes;
    private String contactPerson;
    private String contactEmail;
    private String contactNumber;
    private String reservedDates;
    private String status;
    private String createdBy;
    private String createdAt;
    private String approvedAt;
    private String approvedBy;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getRoomType() { return roomType; }
    public void setRoomType(String roomType) { this.roomType = roomType; }

    public String getAgenda() { return agenda; }
    public void setAgenda(String agenda) { this.agenda = agenda; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getOrganization() { return organization; }
    public void setOrganization(String organization) { this.organization = organization; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

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

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public String getApprovedAt() { return approvedAt; }
    public void setApprovedAt(String approvedAt) { this.approvedAt = approvedAt; }

    public String getApprovedBy() { return approvedBy; }
    public void setApprovedBy(String approvedBy) { this.approvedBy = approvedBy; }
}
