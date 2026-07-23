package org.lpu.dev.codes.model.dto;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class AllowedEmailDto {

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private Long id;
    private String email;
    private String status;
    private String createdAt;
    private String createdBy;

    public AllowedEmailDto() {
    }

    public AllowedEmailDto(Long id, String email, String status, LocalDateTime createdAt, String createdBy) {
        this.id = id;
        this.email = email;
        this.status = status;
        this.createdBy = createdBy;
        this.createdAt = createdAt != null ? createdAt.format(FORMATTER) : null;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }
}
