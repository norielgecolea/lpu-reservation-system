package org.lpu.dev.codes.model.dto;

public class VanApproveRequest {
    private Long vehicleId;
    private Long driverId;

    public Long getVehicleId() { return vehicleId; }
    public void setVehicleId(Long vehicleId) { this.vehicleId = vehicleId; }

    public Long getDriverId() { return driverId; }
    public void setDriverId(Long driverId) { this.driverId = driverId; }
}
