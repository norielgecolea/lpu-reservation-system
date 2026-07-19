package org.lpu.dev.codes.model.dto;

public class CreateDriverRequest {
    private String fullName;
    private String contactNumber;
    private String status;

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getContactNumber() { return contactNumber; }
    public void setContactNumber(String contactNumber) { this.contactNumber = contactNumber; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
