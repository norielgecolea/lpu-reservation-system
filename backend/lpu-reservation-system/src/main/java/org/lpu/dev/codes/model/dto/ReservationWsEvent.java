package org.lpu.dev.codes.model.dto;

import java.util.ArrayList;
import java.util.List;

public class ReservationWsEvent {

    private String type;
    private Long reservationId;
    private String status;
    private List<Long> conflictedIds = new ArrayList<>();
    private List<Long> revertedIds = new ArrayList<>();
    private String timestamp;

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public Long getReservationId() { return reservationId; }
    public void setReservationId(Long reservationId) { this.reservationId = reservationId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public List<Long> getConflictedIds() { return conflictedIds; }
    public void setConflictedIds(List<Long> conflictedIds) { this.conflictedIds = conflictedIds; }

    public List<Long> getRevertedIds() { return revertedIds; }
    public void setRevertedIds(List<Long> revertedIds) { this.revertedIds = revertedIds; }

    public String getTimestamp() { return timestamp; }
    public void setTimestamp(String timestamp) { this.timestamp = timestamp; }
}
