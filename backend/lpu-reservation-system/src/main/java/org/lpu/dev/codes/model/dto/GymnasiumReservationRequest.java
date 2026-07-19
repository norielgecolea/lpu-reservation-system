package org.lpu.dev.codes.model.dto;

import java.util.List;

public class GymnasiumReservationRequest {

    private String eventTitle;
    private String department;
    private String organization;
    private Integer numberOfAttendees;
    private String contactPerson;
    private String contactEmail;
    private String contactNumber;
    private String additionalInstructions;
    private List<ReservedDateSlot> reservedDates;
    private List<RequestedEquipmentItem> requestedEquipment;

    // ── inner classes ──────────────────────────────────────────────────────

    public static class ReservedDateSlot {
        private String date;
        private String startTime;
        private String endTime;

        public String getDate() { return date; }
        public void setDate(String date) { this.date = date; }
        public String getStartTime() { return startTime; }
        public void setStartTime(String startTime) { this.startTime = startTime; }
        public String getEndTime() { return endTime; }
        public void setEndTime(String endTime) { this.endTime = endTime; }
    }

    public static class RequestedEquipmentItem {
        private Integer id;
        private String name;

        public Integer getId() { return id; }
        public void setId(Integer id) { this.id = id; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
    }

    // ── getters / setters ──────────────────────────────────────────────────

    public String getEventTitle() { return eventTitle; }
    public void setEventTitle(String eventTitle) { this.eventTitle = eventTitle; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getOrganization() { return organization; }
    public void setOrganization(String organization) { this.organization = organization; }

    public Integer getNumberOfAttendees() { return numberOfAttendees; }
    public void setNumberOfAttendees(Integer numberOfAttendees) { this.numberOfAttendees = numberOfAttendees; }

    public String getContactPerson() { return contactPerson; }
    public void setContactPerson(String contactPerson) { this.contactPerson = contactPerson; }

    public String getContactEmail() { return contactEmail; }
    public void setContactEmail(String contactEmail) { this.contactEmail = contactEmail; }

    public String getContactNumber() { return contactNumber; }
    public void setContactNumber(String contactNumber) { this.contactNumber = contactNumber; }

    public String getAdditionalInstructions() { return additionalInstructions; }
    public void setAdditionalInstructions(String additionalInstructions) { this.additionalInstructions = additionalInstructions; }

    public List<ReservedDateSlot> getReservedDates() { return reservedDates; }
    public void setReservedDates(List<ReservedDateSlot> reservedDates) { this.reservedDates = reservedDates; }

    public List<RequestedEquipmentItem> getRequestedEquipment() { return requestedEquipment; }
    public void setRequestedEquipment(List<RequestedEquipmentItem> requestedEquipment) { this.requestedEquipment = requestedEquipment; }
}
