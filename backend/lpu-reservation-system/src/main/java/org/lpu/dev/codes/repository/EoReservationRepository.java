package org.lpu.dev.codes.repository;

import java.util.List;
import java.util.Optional;

import org.lpu.dev.codes.model.data.EoReservation;
import org.springframework.stereotype.Repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

@Repository
public class EoReservationRepository {

    @PersistenceContext
    private EntityManager entityManager;

    public void save(EoReservation reservation) {
        entityManager.persist(reservation);
        entityManager.flush();
    }

    public Optional<EoReservation> findById(Long id) {
        return Optional.ofNullable(entityManager.find(EoReservation.class, id));
    }

    public List<EoReservation> findApprovedByRoom(String roomType) {
        return entityManager
                .createQuery(
                        "FROM EoReservation r WHERE r.roomType = :roomType AND r.status = 'APPROVED'",
                        EoReservation.class)
                .setParameter("roomType", roomType)
                .getResultList();
    }

    @SuppressWarnings("unchecked")
    public List<Object[]> findAllNative(String month, String roomType) {
        StringBuilder sql = new StringBuilder(
                "SELECT id, room_type, agenda, department, organization, notes, "
                        + "contact_person, contact_email, contact_number, "
                        + "reserved_dates::text, status, created_by, created_at, approved_at, approved_by "
                        + "FROM eo_reservations WHERE 1=1");

        boolean useMonth = month != null && !month.isBlank();
        boolean useRoom = roomType != null && !roomType.isBlank();

        if (!useMonth && !useRoom) {
            return List.of();
        }

        if (useRoom) {
            sql.append(" AND room_type = :roomType");
        }
        if (useMonth) {
            sql.append(" AND (")
                    .append(" EXISTS (SELECT 1 FROM jsonb_array_elements(reserved_dates) e")
                    .append(" WHERE (e->>'date') LIKE :monthPattern)")
                    .append(" OR to_char(created_at, 'YYYY-MM') = :month")
                    .append(")");
        }

        sql.append(" ORDER BY created_at DESC");

        var query = entityManager.createNativeQuery(sql.toString());
        if (useRoom) {
            query.setParameter("roomType", roomType.trim().toUpperCase());
        }
        if (useMonth) {
            String trimmed = month.trim();
            query.setParameter("month", trimmed);
            query.setParameter("monthPattern", trimmed + "%");
        }
        return query.getResultList();
    }

    public void updateStatus(Long id, String status) {
        entityManager.createNativeQuery(
                "UPDATE eo_reservations SET status = :status WHERE id = :id")
                .setParameter("status", status)
                .setParameter("id", id)
                .executeUpdate();
    }

    @SuppressWarnings("unchecked")
    public List<EoReservation> findApprovedByReservedDate(String date) {
        List<Number> ids = entityManager.createNativeQuery(
                "SELECT id FROM eo_reservations WHERE status = 'APPROVED' "
                        + "AND contact_email IS NOT NULL AND TRIM(contact_email) <> '' "
                        + "AND EXISTS (SELECT 1 FROM jsonb_array_elements(reserved_dates) e "
                        + "WHERE (e->>'date') = :date)")
                .setParameter("date", date)
                .getResultList();
        if (ids.isEmpty()) {
            return List.of();
        }
        List<Long> longIds = ids.stream().map(Number::longValue).toList();
        return entityManager
                .createQuery("FROM EoReservation r WHERE r.id IN :ids", EoReservation.class)
                .setParameter("ids", longIds)
                .getResultList();
    }
}
