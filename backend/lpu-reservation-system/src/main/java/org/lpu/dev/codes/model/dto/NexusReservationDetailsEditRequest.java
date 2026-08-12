package org.lpu.dev.codes.model.dto;

import java.util.List;

/** Super Admin edit of Nexus reservation metadata (not dates/status). */
public class NexusReservationDetailsEditRequest {

    private String eventTitle;
    private String department;
    private String organization;
    private String contactPerson;
    private String contactEmail;
    private String contactNumber;
    private Integer numberOfAttendees;
    private String additionalInstructions;
    private List<FltReservationRequest.RequestedEquipmentItem> requestedEquipment;

    public String getEventTitle() { return eventTitle; }
    public void setEventTitle(String eventTitle) { this.eventTitle = eventTitle; }

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

    public Integer getNumberOfAttendees() { return numberOfAttendees; }
    public void setNumberOfAttendees(Integer numberOfAttendees) { this.numberOfAttendees = numberOfAttendees; }

    public String getAdditionalInstructions() { return additionalInstructions; }
    public void setAdditionalInstructions(String additionalInstructions) { this.additionalInstructions = additionalInstructions; }

    public List<FltReservationRequest.RequestedEquipmentItem> getRequestedEquipment() { return requestedEquipment; }
    public void setRequestedEquipment(List<FltReservationRequest.RequestedEquipmentItem> requestedEquipment) {
        this.requestedEquipment = requestedEquipment;
    }
}
