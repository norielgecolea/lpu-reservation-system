package org.lpu.dev.codes.model.apiresponse;

import java.util.List;

import org.lpu.dev.codes.model.dto.PopulateDriverList;
import org.lpu.dev.codes.model.dto.PopulateVehicleList;
import org.lpu.dev.codes.model.dto.VanApprovedEventDto;
import org.lpu.dev.codes.model.dto.VanReservationAdminDto;

public class VanReservationResponse {

    private Boolean success;
    private String message;
    private List<VanReservationAdminDto> reservations;
    private List<VanApprovedEventDto> approvedEvents;
    private List<PopulateVehicleList> vehicles;
    private List<PopulateDriverList> drivers;

    public Boolean getSuccess() { return success; }
    public void setSuccess(Boolean success) { this.success = success; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public List<VanReservationAdminDto> getReservations() { return reservations; }
    public void setReservations(List<VanReservationAdminDto> reservations) { this.reservations = reservations; }

    public List<VanApprovedEventDto> getApprovedEvents() { return approvedEvents; }
    public void setApprovedEvents(List<VanApprovedEventDto> approvedEvents) { this.approvedEvents = approvedEvents; }

    public List<PopulateVehicleList> getVehicles() { return vehicles; }
    public void setVehicles(List<PopulateVehicleList> vehicles) { this.vehicles = vehicles; }

    public List<PopulateDriverList> getDrivers() { return drivers; }
    public void setDrivers(List<PopulateDriverList> drivers) { this.drivers = drivers; }
}
