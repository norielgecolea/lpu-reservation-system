package org.lpu.dev.codes.repository;

import java.util.ArrayList;
import java.util.List;

import org.lpu.dev.codes.model.data.AdminAuditLog;
import org.springframework.stereotype.Repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;

@Repository
public class AdminAuditLogRepository {

    @PersistenceContext
    private EntityManager em;

    public AdminAuditLog save(AdminAuditLog log) {
        em.persist(log);
        em.flush();
        return log;
    }

    public List<Object[]> findByService(
            String service,
            String actionType,
            String search,
            String fromDate,
            String toDate,
            int page,
            int size) {
        StringBuilder sql = new StringBuilder(
                "SELECT id, service, action_type, admin_username, admin_fullname, "
                + "target_type, target_id, target_label, details, performed_at "
                + "FROM admin_audit_logs WHERE service = :service");
        appendFilters(sql, actionType, search, fromDate, toDate);
        sql.append(" ORDER BY performed_at DESC LIMIT :limit OFFSET :offset");

        Query q = em.createNativeQuery(sql.toString());
        q.setParameter("service", service);
        bindFilters(q, actionType, search, fromDate, toDate);
        q.setParameter("limit", size);
        q.setParameter("offset", page * size);
        @SuppressWarnings("unchecked")
        List<Object[]> rows = q.getResultList();
        return rows;
    }

    public long countByService(
            String service,
            String actionType,
            String search,
            String fromDate,
            String toDate) {
        StringBuilder sql = new StringBuilder(
                "SELECT COUNT(*) FROM admin_audit_logs WHERE service = :service");
        appendFilters(sql, actionType, search, fromDate, toDate);

        Query q = em.createNativeQuery(sql.toString());
        q.setParameter("service", service);
        bindFilters(q, actionType, search, fromDate, toDate);
        return ((Number) q.getSingleResult()).longValue();
    }

    private void appendFilters(
            StringBuilder sql,
            String actionType,
            String search,
            String fromDate,
            String toDate) {
        if (actionType != null && !actionType.isBlank()) {
            sql.append(" AND action_type = :actionType");
        }
        if (search != null && !search.isBlank()) {
            sql.append(" AND (LOWER(admin_username) LIKE :search"
                    + " OR LOWER(admin_fullname) LIKE :search"
                    + " OR LOWER(target_label) LIKE :search)");
        }
        if (fromDate != null && !fromDate.isBlank()) {
            sql.append(" AND performed_at >= CAST(:fromDate AS TIMESTAMP)");
        }
        if (toDate != null && !toDate.isBlank()) {
            sql.append(" AND performed_at < CAST(:toDate AS TIMESTAMP) + INTERVAL '1 day'");
        }
    }

    private void bindFilters(
            Query q,
            String actionType,
            String search,
            String fromDate,
            String toDate) {
        if (actionType != null && !actionType.isBlank()) {
            q.setParameter("actionType", actionType);
        }
        if (search != null && !search.isBlank()) {
            q.setParameter("search", "%" + search.toLowerCase() + "%");
        }
        if (fromDate != null && !fromDate.isBlank()) {
            q.setParameter("fromDate", fromDate);
        }
        if (toDate != null && !toDate.isBlank()) {
            q.setParameter("toDate", toDate);
        }
    }

    public List<String> findDistinctActionTypes(String service) {
        @SuppressWarnings("unchecked")
        List<String> types = em.createNativeQuery(
                "SELECT DISTINCT action_type FROM admin_audit_logs WHERE service = :service ORDER BY action_type")
                .setParameter("service", service)
                .getResultList();
        return types != null ? types : new ArrayList<>();
    }
}
