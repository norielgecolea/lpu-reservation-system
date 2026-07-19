package org.lpu.dev.codes.model.apiresponse;

import java.util.ArrayList;
import java.util.List;

public class ReservationActionResponse {

    private boolean success;
    private String message;
    private String blockedReason;
    private List<Long> conflictedIds = new ArrayList<>();
    private List<Long> revertedIds = new ArrayList<>();

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getBlockedReason() { return blockedReason; }
    public void setBlockedReason(String blockedReason) { this.blockedReason = blockedReason; }

    public List<Long> getConflictedIds() { return conflictedIds; }
    public void setConflictedIds(List<Long> conflictedIds) { this.conflictedIds = conflictedIds; }

    public List<Long> getRevertedIds() { return revertedIds; }
    public void setRevertedIds(List<Long> revertedIds) { this.revertedIds = revertedIds; }
}
