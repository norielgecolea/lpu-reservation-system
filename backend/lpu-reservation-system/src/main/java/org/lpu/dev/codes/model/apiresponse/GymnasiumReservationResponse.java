package org.lpu.dev.codes.model.apiresponse;

import java.util.List;

import org.lpu.dev.codes.model.dto.GymnasiumApprovedEventDto;
import org.lpu.dev.codes.model.dto.GymnasiumReservationAdminDto;
import org.lpu.dev.codes.model.dto.PopulateEquipmentList;

public class GymnasiumReservationResponse {

    private Boolean success;
    private String message;
    private List<GymnasiumReservationAdminDto> reservations;
    private List<PopulateEquipmentList> equipment;
    private List<GymnasiumApprovedEventDto> approvedEvents;

    public Boolean getSuccess() { return success; }
    public void setSuccess(Boolean success) { this.success = success; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public List<GymnasiumReservationAdminDto> getReservations() { return reservations; }
    public void setReservations(List<GymnasiumReservationAdminDto> reservations) { this.reservations = reservations; }

    public List<PopulateEquipmentList> getEquipment() { return equipment; }
    public void setEquipment(List<PopulateEquipmentList> equipment) { this.equipment = equipment; }

    public List<GymnasiumApprovedEventDto> getApprovedEvents() { return approvedEvents; }
    public void setApprovedEvents(List<GymnasiumApprovedEventDto> approvedEvents) { this.approvedEvents = approvedEvents; }
}
