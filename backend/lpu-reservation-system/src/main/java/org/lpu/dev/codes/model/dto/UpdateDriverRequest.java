package org.lpu.dev.codes.model.dto;

public class UpdateDriverRequest {
    private Long id;
    private String fullName;
    private String contactNumber;
    private String status;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getContactNumber() { return contactNumber; }
    public void setContactNumber(String contactNumber) { this.contactNumber = contactNumber; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
