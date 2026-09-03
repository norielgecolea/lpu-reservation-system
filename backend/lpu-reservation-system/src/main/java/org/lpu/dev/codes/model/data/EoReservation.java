package org.lpu.dev.codes.model.data;

import java.time.LocalDateTime;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.lpu.dev.codes.util.AppDateTimes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "eo_reservations")
public class EoReservation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "room_type", nullable = false, length = 20)
    private String roomType;

    @Column(name = "agenda", nullable = false)
    private String agenda;

    @Column(name = "department", nullable = false)
    private String department;

    @Column(name = "organization", nullable = false)
    private String organization;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "contact_person")
    private String contactPerson;

    @Column(name = "contact_email")
    private String contactEmail;

    @Column(name = "contact_number")
    private String contactNumber;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "reserved_dates", nullable = false)
    private String reservedDates;

    @Column(name = "status")
    private String status;

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "approved_by")
    private String approvedBy;

    @PrePersist
    protected void onCreate() {
        if (this.status == null) this.status = "APPROVED";
        this.createdAt = AppDateTimes.nowUtc();
        if (this.approvedAt == null) this.approvedAt = this.createdAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getRoomType() { return roomType; }
    public void setRoomType(String roomType) { this.roomType = roomType; }

    public String getAgenda() { return agenda; }
    public void setAgenda(String agenda) { this.agenda = agenda; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getOrganization() { return organization; }
    public void setOrganization(String organization) { this.organization = organization; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getContactPerson() { return contactPerson; }
    public void setContactPerson(String contactPerson) { this.contactPerson = contactPerson; }

    public String getContactEmail() { return contactEmail; }
    public void setContactEmail(String contactEmail) { this.contactEmail = contactEmail; }

    public String getContactNumber() { return contactNumber; }
    public void setContactNumber(String contactNumber) { this.contactNumber = contactNumber; }

    public String getReservedDates() { return reservedDates; }
    public void setReservedDates(String reservedDates) { this.reservedDates = reservedDates; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getApprovedAt() { return approvedAt; }
    public void setApprovedAt(LocalDateTime approvedAt) { this.approvedAt = approvedAt; }

    public String getApprovedBy() { return approvedBy; }
    public void setApprovedBy(String approvedBy) { this.approvedBy = approvedBy; }
}
