package org.lpu.dev.codes.repository;

import java.util.List;
import java.util.Optional;

import org.lpu.dev.codes.model.data.FltReservation;
import org.springframework.stereotype.Repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

@Repository
public class FltReservationRepository {

    @PersistenceContext
    private EntityManager entityManager;

    public void save(FltReservation reservation) {
        entityManager.persist(reservation);
        entityManager.flush();
    }

    public List<FltReservation> findAll() {
        return entityManager
                .createQuery("FROM FltReservation r ORDER BY r.createdAt DESC", FltReservation.class)
                .getResultList();
    }

    @SuppressWarnings("unchecked")
    public List<String> findAllReservedDatesJson() {
        return entityManager
                .createNativeQuery("SELECT reserved_dates::text FROM flt_reservations WHERE status != 'CANCELLED'")
                .getResultList();
    }

    public List<FltReservation> findAllApproved() {
        return entityManager
                .createQuery("FROM FltReservation r WHERE r.status IN ('APPROVED', 'COMPLETED') ORDER BY r.createdAt DESC", FltReservation.class)
                .getResultList();
    }

    public Optional<FltReservation> findById(Long id) {
        FltReservation result = entityManager.find(FltReservation.class, id);
        return Optional.ofNullable(result);
    }

    /**
     * List admin rows scoped by month (YYYY-MM) or inclusive date span (fromDate/toDate).
     * Range takes precedence. If neither is provided, returns an empty list (never SELECT all).
     */
    @SuppressWarnings("unchecked")
    public List<Object[]> findAllNative(String month, String fromDate, String toDate) {
        StringBuilder sql = new StringBuilder(
                "SELECT id, event_title, event_type, department, organization, " +
                "contact_person, contact_email, contact_number, " +
                "reserved_dates::text, requested_equipment::text, " +
                "status, created_at, room_type, expected_attendees, " +
                "coordination_date, coordination_start_time, coordination_end_time, " +
                "satisfaction_rating, additional_instructions, approved_at, approved_by " +
                "FROM flt_reservations");

        boolean useRange = isPresent(fromDate) && isPresent(toDate);
        boolean useMonth = !useRange && isPresent(month);

        if (!useRange && !useMonth) {
            return List.of();
        }

        if (useRange) {
            sql.append(" WHERE (")
                    .append(" EXISTS (SELECT 1 FROM jsonb_array_elements(reserved_dates) e")
                    .append(" WHERE (e->>'date') >= :fromDate AND (e->>'date') <= :toDate)")
                    .append(" OR (coordination_date IS NOT NULL")
                    .append(" AND coordination_date >= :fromDate AND coordination_date <= :toDate)")
                    .append(" OR (created_at::date >= CAST(:fromDate AS date)")
                    .append(" AND created_at::date <= CAST(:toDate AS date))")
                    .append(")");
        } else {
            sql.append(" WHERE (")
                    .append(" EXISTS (SELECT 1 FROM jsonb_array_elements(reserved_dates) e")
                    .append(" WHERE (e->>'date') LIKE :monthPattern)")
                    .append(" OR coordination_date LIKE :monthPattern")
                    .append(" OR to_char(created_at, 'YYYY-MM') = :month")
                    .append(")");
        }

        sql.append(" ORDER BY ")
                .append("CASE WHEN status = 'PENDING' THEN 0 ELSE 1 END, ")
                .append("CASE WHEN status = 'PENDING' THEN created_at END ASC, ")
                .append("created_at DESC");

        var query = entityManager.createNativeQuery(sql.toString());
        if (useRange) {
            query.setParameter("fromDate", fromDate.trim());
            query.setParameter("toDate", toDate.trim());
        } else {
            String trimmed = month.trim();
            query.setParameter("month", trimmed);
            query.setParameter("monthPattern", trimmed + "%");
        }
        return query.getResultList();
    }

    private static boolean isPresent(String value) {
        return value != null && !value.isBlank();
    }

    public List<FltReservation> findAllForConflictCheck() {
        return entityManager
                .createQuery(
                        "FROM FltReservation r WHERE r.status IN ('PENDING', 'APPROVED', 'COMPLETED')",
                        FltReservation.class)
                .getResultList();
    }

    public List<FltReservation> findByStatus(String status) {
        return entityManager
                .createQuery("FROM FltReservation r WHERE r.status = :status", FltReservation.class)
                .setParameter("status", status)
                .getResultList();
    }

    public void approve(Long id, String approvedBy) {
        entityManager.createNativeQuery(
                "UPDATE flt_reservations SET status = 'APPROVED', approved_at = CURRENT_TIMESTAMP, approved_by = :approvedBy WHERE id = :id")
                .setParameter("approvedBy", approvedBy)
                .setParameter("id", id)
                .executeUpdate();
    }

    public void updateStatus(Long id, String status) {
        entityManager.createNativeQuery(
                "UPDATE flt_reservations SET status = :status WHERE id = :id")
                .setParameter("status", status)
                .setParameter("id", id)
                .executeUpdate();
    }

    public void updateStatusBatch(List<Long> ids, String status) {
        if (ids == null || ids.isEmpty()) return;
        entityManager.createNativeQuery(
                "UPDATE flt_reservations SET status = :status WHERE id IN (:ids)")
                .setParameter("status", status)
                .setParameter("ids", ids)
                .executeUpdate();
    }

    public void updateCoordination(Long id, String date, String startTime, String endTime) {
        entityManager.createNativeQuery(
                "UPDATE flt_reservations SET coordination_date = :date, " +
                "coordination_start_time = :startTime, coordination_end_time = :endTime " +
                "WHERE id = :id")
                .setParameter("date", date)
                .setParameter("startTime", startTime)
                .setParameter("endTime", endTime)
                .setParameter("id", id)
                .executeUpdate();
    }

    public void reschedule(Long id, String reservedDatesJson) {
        entityManager.createNativeQuery(
                "UPDATE flt_reservations SET reserved_dates = CAST(:json AS jsonb) WHERE id = :id")
                .setParameter("json", reservedDatesJson)
                .setParameter("id", id)
                .executeUpdate();
    }

    public void updateRating(Long id, int rating) {
        entityManager.createNativeQuery(
                "UPDATE flt_reservations SET satisfaction_rating = :rating WHERE id = :id")
                .setParameter("rating", rating)
                .setParameter("id", id)
                .executeUpdate();
    }
}
