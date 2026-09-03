package org.lpu.dev.codes.model.dto;

import java.util.List;

public class EoReservationRequest {

    private String roomType;
    private String agenda;
    private String department;
    private String organization;
    private String notes;
    private boolean skipContact;
    private String contactPerson;
    private String contactEmail;
    private String contactNumber;
    private List<EoReservedDateSlot> reservedDates;

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

    public boolean isSkipContact() { return skipContact; }
    public void setSkipContact(boolean skipContact) { this.skipContact = skipContact; }

    public String getContactPerson() { return contactPerson; }
    public void setContactPerson(String contactPerson) { this.contactPerson = contactPerson; }

    public String getContactEmail() { return contactEmail; }
    public void setContactEmail(String contactEmail) { this.contactEmail = contactEmail; }

    public String getContactNumber() { return contactNumber; }
    public void setContactNumber(String contactNumber) { this.contactNumber = contactNumber; }

    public List<EoReservedDateSlot> getReservedDates() { return reservedDates; }
    public void setReservedDates(List<EoReservedDateSlot> reservedDates) { this.reservedDates = reservedDates; }
}
