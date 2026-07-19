package org.lpu.dev.codes.model.apiresponse;

import java.util.List;

import org.lpu.dev.codes.model.dto.FltApprovedEventDto;
import org.lpu.dev.codes.model.dto.FltReservationAdminDto;
import org.lpu.dev.codes.model.dto.PopulateEquipmentList;

public class FltReservationResponse {

    private boolean success;
    private String message;
    private List<PopulateEquipmentList> equipment;
    private List<String> occupiedDates;
    private List<FltApprovedEventDto> approvedEvents;

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public List<PopulateEquipmentList> getEquipment() { return equipment; }
    public void setEquipment(List<PopulateEquipmentList> equipment) { this.equipment = equipment; }

    public List<String> getOccupiedDates() { return occupiedDates; }
    public void setOccupiedDates(List<String> occupiedDates) { this.occupiedDates = occupiedDates; }

    public List<FltApprovedEventDto> getApprovedEvents() { return approvedEvents; }
    public void setApprovedEvents(List<FltApprovedEventDto> approvedEvents) { this.approvedEvents = approvedEvents; }

    private List<FltReservationAdminDto> reservations;
    public List<FltReservationAdminDto> getReservations() { return reservations; }
    public void setReservations(List<FltReservationAdminDto> reservations) { this.reservations = reservations; }
}
