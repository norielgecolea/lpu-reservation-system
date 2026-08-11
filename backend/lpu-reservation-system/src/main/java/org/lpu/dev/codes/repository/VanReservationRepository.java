package org.lpu.dev.codes.repository;

import java.util.List;
import java.util.Optional;

import org.lpu.dev.codes.model.data.VanReservation;
import org.springframework.stereotype.Repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

@Repository
public class VanReservationRepository {

    @PersistenceContext
    private EntityManager entityManager;

    public void save(VanReservation reservation) {
        entityManager.persist(reservation);
        entityManager.flush();
    }

    public void merge(VanReservation reservation) {
        entityManager.merge(reservation);
        entityManager.flush();
    }

    public Optional<VanReservation> findById(Long id) {
        List<VanReservation> rows = entityManager
                .createQuery(
                        "SELECT DISTINCT r FROM VanReservation r "
                                + "LEFT JOIN FETCH r.assignedVehicles "
                                + "WHERE r.id = :id",
                        VanReservation.class)
                .setParameter("id", id)
                .getResultList();
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
    }

    public List<VanReservation> findAllApproved() {
        return entityManager
                .createQuery(
                        "SELECT DISTINCT r FROM VanReservation r "
                                + "LEFT JOIN FETCH r.assignedVehicles "
                                + "WHERE r.status IN ('APPROVED', 'COMPLETED') ORDER BY r.createdAt DESC",
                        VanReservation.class)
                .getResultList();
    }

    /**
     * List admin rows scoped by month (YYYY-MM) or inclusive date span (fromDate/toDate).
     * Range takes precedence. If neither is provided, returns an empty list (never SELECT all).
     */
    @SuppressWarnings("unchecked")
    public List<Object[]> findAllNative(String month, String fromDate, String toDate) {
        StringBuilder sql = new StringBuilder(
                "SELECT r.id, r.department, r.organization, r.travel_destination, r.passenger_names, "
                        + "r.number_of_passengers, r.return_time, r.contact_person, r.contact_email, r.contact_number, "
                        + "r.reserved_dates::text, r.status, r.created_at, "
                        + "r.satisfaction_rating, "
                        + "(SELECT string_agg(v.id::text, ',' ORDER BY v.id) FROM van_reservation_vehicles j "
                        + " JOIN vehicle v ON v.id = j.vehicle_id WHERE j.reservation_id = r.id), "
                        + "(SELECT string_agg(v.brand || ' (' || v.plate_num || ')', ', ' ORDER BY v.id) "
                        + " FROM van_reservation_vehicles j JOIN vehicle v ON v.id = j.vehicle_id "
                        + " WHERE j.reservation_id = r.id), "
                        + "(SELECT string_agg(DISTINCT v.assigned_driver_name, ', ' ORDER BY v.assigned_driver_name) "
                        + " FROM van_reservation_vehicles j JOIN vehicle v ON v.id = j.vehicle_id "
                        + " WHERE j.reservation_id = r.id AND v.assigned_driver_name IS NOT NULL "
                        + " AND btrim(v.assigned_driver_name) <> ''), "
                        + "r.approved_at, r.approved_by, r.additional_remarks, "
                        + "r.school, r.requested_vehicle_type "
                        + "FROM van_reservations r");

        boolean useRange = isPresent(fromDate) && isPresent(toDate);
        boolean useMonth = !useRange && isPresent(month);

        if (!useRange && !useMonth) {
            return List.of();
        }

        if (useRange) {
            sql.append(" WHERE (")
                    .append(" EXISTS (SELECT 1 FROM jsonb_array_elements(r.reserved_dates) e")
                    .append(" WHERE (e->>'date') >= :fromDate AND (e->>'date') <= :toDate)")
                    .append(" OR (r.created_at::date >= CAST(:fromDate AS date)")
                    .append(" AND r.created_at::date <= CAST(:toDate AS date))")
                    .append(")");
        } else {
            sql.append(" WHERE (")
                    .append(" EXISTS (SELECT 1 FROM jsonb_array_elements(r.reserved_dates) e")
                    .append(" WHERE (e->>'date') LIKE :monthPattern)")
                    .append(" OR to_char(r.created_at, 'YYYY-MM') = :month")
                    .append(")");
        }

        sql.append(" ORDER BY CASE WHEN r.status = 'PENDING' THEN 0 ELSE 1 END, ")
                .append("CASE WHEN r.status = 'PENDING' THEN r.created_at END ASC, ")
                .append("r.created_at DESC");

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

    public List<VanReservation> findApprovedByVehicleId(Long vehicleId) {
        return entityManager
                .createQuery(
                        "SELECT DISTINCT r FROM VanReservation r "
                                + "JOIN FETCH r.assignedVehicles v "
                                + "WHERE v.id = :vehicleId AND r.status IN ('APPROVED', 'COMPLETED')",
                        VanReservation.class)
                .setParameter("vehicleId", vehicleId)
                .getResultList();
    }

    public void updateStatus(Long id, String status) {
        entityManager.createNativeQuery("UPDATE van_reservations SET status = :status WHERE id = :id")
                .setParameter("status", status)
                .setParameter("id", id)
                .executeUpdate();
    }

    public void approveWithVehicles(Long id, String approvedBy) {
        entityManager.createNativeQuery(
                "UPDATE van_reservations SET status = 'APPROVED', "
                        + "approved_at = CURRENT_TIMESTAMP, approved_by = :approvedBy WHERE id = :id")
                .setParameter("approvedBy", approvedBy)
                .setParameter("id", id)
                .executeUpdate();
    }

    public void reschedule(Long id, String reservedDatesJson, String returnTime) {
        entityManager.createNativeQuery(
                "UPDATE van_reservations SET reserved_dates = CAST(:json AS jsonb), return_time = :returnTime WHERE id = :id")
                .setParameter("json", reservedDatesJson)
                .setParameter("returnTime", returnTime)
                .setParameter("id", id)
                .executeUpdate();
    }

    public void updateRating(Long id, int rating) {
        entityManager.createNativeQuery("UPDATE van_reservations SET satisfaction_rating = :rating WHERE id = :id")
                .setParameter("rating", rating)
                .setParameter("id", id)
                .executeUpdate();
    }

    public void clearVehicleAssignments(Long vehicleId) {
        entityManager.createNativeQuery(
                "DELETE FROM van_reservation_vehicles WHERE vehicle_id = :vehicleId")
                .setParameter("vehicleId", vehicleId)
                .executeUpdate();
        // Legacy column (if still present from older schema)
        try {
            entityManager.createNativeQuery(
                    "UPDATE van_reservations SET vehicle_id = NULL WHERE vehicle_id = :vehicleId")
                    .setParameter("vehicleId", vehicleId)
                    .executeUpdate();
        } catch (Exception ignored) {
            // Column may already be dropped
        }
    }

    /** APPROVED reservations that include the given reserved date (YYYY-MM-DD). */
    @SuppressWarnings("unchecked")
    public List<VanReservation> findApprovedByReservedDate(String date) {
        List<Number> ids = entityManager.createNativeQuery(
                "SELECT id FROM van_reservations WHERE status = 'APPROVED' "
                        + "AND EXISTS (SELECT 1 FROM jsonb_array_elements(reserved_dates) e "
                        + "WHERE (e->>'date') = :date)")
                .setParameter("date", date)
                .getResultList();
        if (ids.isEmpty()) {
            return List.of();
        }
        List<Long> longIds = ids.stream().map(Number::longValue).toList();
        return entityManager
                .createQuery(
                        "SELECT DISTINCT r FROM VanReservation r "
                                + "LEFT JOIN FETCH r.assignedVehicles WHERE r.id IN :ids",
                        VanReservation.class)
                .setParameter("ids", longIds)
                .getResultList();
    }
}
