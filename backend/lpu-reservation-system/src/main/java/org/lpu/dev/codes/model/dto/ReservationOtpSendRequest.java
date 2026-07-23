package org.lpu.dev.codes.model.dto;

public class ReservationOtpSendRequest {
    private String email;
    private String contactPerson;

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getContactPerson() { return contactPerson; }
    public void setContactPerson(String contactPerson) { this.contactPerson = contactPerson; }
}
