package org.lpu.dev.codes.model.dto;

import java.util.ArrayList;
import java.util.List;

public class VanApproveRequest {
    /** One or more vehicle IDs to assign to this reservation. */
    private List<Long> vehicleIds = new ArrayList<>();

    public List<Long> getVehicleIds() {
        return vehicleIds;
    }

    public void setVehicleIds(List<Long> vehicleIds) {
        this.vehicleIds = vehicleIds != null ? vehicleIds : new ArrayList<>();
    }
}
