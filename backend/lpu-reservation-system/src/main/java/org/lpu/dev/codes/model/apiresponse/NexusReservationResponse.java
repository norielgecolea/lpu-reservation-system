package org.lpu.dev.codes.model.apiresponse;

import java.util.List;

import org.lpu.dev.codes.model.dto.NexusApprovedEventDto;
import org.lpu.dev.codes.model.dto.NexusReservationAdminDto;
import org.lpu.dev.codes.model.dto.PopulateEquipmentList;

public class NexusReservationResponse {

    private Boolean success;
    private String message;
    private List<NexusReservationAdminDto> reservations;
    private List<PopulateEquipmentList> equipment;
    private List<NexusApprovedEventDto> approvedEvents;

    public Boolean getSuccess() { return success; }
    public void setSuccess(Boolean success) { this.success = success; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public List<NexusReservationAdminDto> getReservations() { return reservations; }
    public void setReservations(List<NexusReservationAdminDto> reservations) { this.reservations = reservations; }

    public List<PopulateEquipmentList> getEquipment() { return equipment; }
    public void setEquipment(List<PopulateEquipmentList> equipment) { this.equipment = equipment; }

    public List<NexusApprovedEventDto> getApprovedEvents() { return approvedEvents; }
    public void setApprovedEvents(List<NexusApprovedEventDto> approvedEvents) { this.approvedEvents = approvedEvents; }
}
