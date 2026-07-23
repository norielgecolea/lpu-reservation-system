package org.lpu.dev.codes.model.apiresponse;

import java.util.List;

import org.lpu.dev.codes.model.dto.AllowedEmailDto;

public class PopulateAllowedEmailsResponse {

    private boolean success;
    private String message;
    private List<AllowedEmailDto> emails;
    private long totalCount;

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public List<AllowedEmailDto> getEmails() {
        return emails;
    }

    public void setEmails(List<AllowedEmailDto> emails) {
        this.emails = emails;
    }

    public long getTotalCount() {
        return totalCount;
    }

    public void setTotalCount(long totalCount) {
        this.totalCount = totalCount;
    }
}
