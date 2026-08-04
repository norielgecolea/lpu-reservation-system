package org.lpu.dev.codes.repository;

import org.lpu.dev.codes.model.data.ReservationReminder;
import org.springframework.stereotype.Repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

@Repository
public class ReservationReminderRepository {

    @PersistenceContext
    private EntityManager entityManager;

    public void save(ReservationReminder reminder) {
        entityManager.persist(reminder);
        entityManager.flush();
    }

    public boolean exists(String service, Long reservationId, String reservedDate, String reminderType) {
        Long count = entityManager.createQuery(
                "SELECT COUNT(r) FROM ReservationReminder r "
                        + "WHERE r.service = :service AND r.reservationId = :reservationId "
                        + "AND r.reservedDate = :reservedDate AND r.reminderType = :reminderType",
                Long.class)
                .setParameter("service", service)
                .setParameter("reservationId", reservationId)
                .setParameter("reservedDate", reservedDate)
                .setParameter("reminderType", reminderType)
                .getSingleResult();
        return count != null && count > 0;
    }
}
