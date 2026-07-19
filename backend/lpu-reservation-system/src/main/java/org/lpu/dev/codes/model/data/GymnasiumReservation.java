package org.lpu.dev.codes.model.data;

import java.time.LocalDateTime;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "gymnasium_reservations")
public class GymnasiumReservation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_title", nullable = false)
    private String eventTitle;

    @Column(name = "department", nullable = false)
    private String department;

    @Column(name = "organization", nullable = false)
    private String organization;

    @Column(name = "number_of_attendees")
    private Integer numberOfAttendees;

    @Column(name = "contact_person", nullable = false)
    private String contactPerson;

    @Column(name = "contact_email", nullable = false)
    private String contactEmail;

    @Column(name = "contact_number", nullable = false)
    private String contactNumber;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "reserved_dates", nullable = false)
    private String reservedDates;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "requested_equipment")
    private String requestedEquipment;

    @Column(name = "additional_instructions", columnDefinition = "TEXT")
    private String additionalInstructions;

    @Column(name = "coordination_date")
    private String coordinationDate;

    @Column(name = "coordination_start_time")
    private String coordinationStartTime;

    @Column(name = "coordination_end_time")
    private String coordinationEndTime;

    @Column(name = "status")
    private String status;

    @Column(name = "satisfaction_rating")
    private Integer satisfactionRating;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "approved_by")
    private String approvedBy;

    @PrePersist
    protected void onCreate() {
        if (this.status == null) this.status = "PENDING";
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getEventTitle() { return eventTitle; }
    public void setEventTitle(String eventTitle) { this.eventTitle = eventTitle; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getOrganization() { return organization; }
    public void setOrganization(String organization) { this.organization = organization; }

    public Integer getNumberOfAttendees() { return numberOfAttendees; }
    public void setNumberOfAttendees(Integer numberOfAttendees) { this.numberOfAttendees = numberOfAttendees; }

    public String getContactPerson() { return contactPerson; }
    public void setContactPerson(String contactPerson) { this.contactPerson = contactPerson; }

    public String getContactEmail() { return contactEmail; }
    public void setContactEmail(String contactEmail) { this.contactEmail = contactEmail; }

    public String getContactNumber() { return contactNumber; }
    public void setContactNumber(String contactNumber) { this.contactNumber = contactNumber; }

    public String getReservedDates() { return reservedDates; }
    public void setReservedDates(String reservedDates) { this.reservedDates = reservedDates; }

    public String getRequestedEquipment() { return requestedEquipment; }
    public void setRequestedEquipment(String requestedEquipment) { this.requestedEquipment = requestedEquipment; }

    public String getAdditionalInstructions() { return additionalInstructions; }
    public void setAdditionalInstructions(String additionalInstructions) { this.additionalInstructions = additionalInstructions; }

    public String getCoordinationDate() { return coordinationDate; }
    public void setCoordinationDate(String coordinationDate) { this.coordinationDate = coordinationDate; }

    public String getCoordinationStartTime() { return coordinationStartTime; }
    public void setCoordinationStartTime(String coordinationStartTime) { this.coordinationStartTime = coordinationStartTime; }

    public String getCoordinationEndTime() { return coordinationEndTime; }
    public void setCoordinationEndTime(String coordinationEndTime) { this.coordinationEndTime = coordinationEndTime; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Integer getSatisfactionRating() { return satisfactionRating; }
    public void setSatisfactionRating(Integer satisfactionRating) { this.satisfactionRating = satisfactionRating; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getApprovedAt() { return approvedAt; }
    public void setApprovedAt(LocalDateTime approvedAt) { this.approvedAt = approvedAt; }

    public String getApprovedBy() { return approvedBy; }
    public void setApprovedBy(String approvedBy) { this.approvedBy = approvedBy; }
}
