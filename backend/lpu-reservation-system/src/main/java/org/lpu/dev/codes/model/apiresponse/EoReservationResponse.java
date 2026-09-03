package org.lpu.dev.codes.model.apiresponse;

import java.util.List;

import org.lpu.dev.codes.model.dto.EoReservationAdminDto;

public class EoReservationResponse {

    private boolean success;
    private String message;
    private EoReservationAdminDto reservation;
    private List<EoReservationAdminDto> reservations;

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public EoReservationAdminDto getReservation() { return reservation; }
    public void setReservation(EoReservationAdminDto reservation) { this.reservation = reservation; }

    public List<EoReservationAdminDto> getReservations() { return reservations; }
    public void setReservations(List<EoReservationAdminDto> reservations) { this.reservations = reservations; }
}
