package org.lpu.dev.codes.model.data;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(
        name = "reservation_reminders",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_reservation_reminder",
                columnNames = { "service", "reservation_id", "reserved_date", "reminder_type" }))
public class ReservationReminder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** FLT | GYMNASIUM | VAN */
    @Column(name = "service", nullable = false, length = 20)
    private String service;

    @Column(name = "reservation_id", nullable = false)
    private Long reservationId;

    /** YYYY-MM-DD slot that triggered the reminder */
    @Column(name = "reserved_date", nullable = false, length = 20)
    private String reservedDate;

    /** 7_DAY | 3_DAY | 1_DAY */
    @Column(name = "reminder_type", nullable = false, length = 10)
    private String reminderType;

    @Column(name = "sent_at", nullable = false)
    private LocalDateTime sentAt;

    @PrePersist
    protected void onCreate() {
        if (sentAt == null) {
            sentAt = LocalDateTime.now();
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getService() { return service; }
    public void setService(String service) { this.service = service; }

    public Long getReservationId() { return reservationId; }
    public void setReservationId(Long reservationId) { this.reservationId = reservationId; }

    public String getReservedDate() { return reservedDate; }
    public void setReservedDate(String reservedDate) { this.reservedDate = reservedDate; }

    public String getReminderType() { return reminderType; }
    public void setReminderType(String reminderType) { this.reminderType = reminderType; }

    public LocalDateTime getSentAt() { return sentAt; }
    public void setSentAt(LocalDateTime sentAt) { this.sentAt = sentAt; }
}
