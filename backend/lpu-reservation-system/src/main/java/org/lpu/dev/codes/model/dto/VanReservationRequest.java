package org.lpu.dev.codes.model.dto;

import java.util.List;

public class VanReservationRequest {

    private String department;
    private String organization;
    private String travelDestination;
    private String passengerNames;
    private Integer numberOfPassengers;
    private String returnTime;
    private String contactPerson;
    private String contactEmail;
    private String contactNumber;
    private List<ReservedDateSlot> reservedDates;
    private String additionalRemarks;

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

    public List<ReservedDateSlot> getReservedDates() { return reservedDates; }
    public void setReservedDates(List<ReservedDateSlot> reservedDates) { this.reservedDates = reservedDates; }

    public String getAdditionalRemarks() { return additionalRemarks; }
    public void setAdditionalRemarks(String additionalRemarks) { this.additionalRemarks = additionalRemarks; }
}
