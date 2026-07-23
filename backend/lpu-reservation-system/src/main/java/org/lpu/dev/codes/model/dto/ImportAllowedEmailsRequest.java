package org.lpu.dev.codes.model.dto;

import java.util.List;

public class ImportAllowedEmailsRequest {

    private List<String> emails;

    public List<String> getEmails() {
        return emails;
    }

    public void setEmails(List<String> emails) {
        this.emails = emails;
    }
}
