package org.lpu.dev.codes.repository;

import java.util.List;

import org.lpu.dev.codes.model.data.AllowedReservationEmail;
import org.lpu.dev.codes.model.dto.AllowedEmailDto;
import org.springframework.stereotype.Repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

@Repository
public class AllowedReservationEmailRepository {

    @PersistenceContext
    private EntityManager entityManager;

    public void save(AllowedReservationEmail entry) {
        entityManager.persist(entry);
    }

    public AllowedReservationEmail findById(Long id) {
        List<AllowedReservationEmail> rows = entityManager
                .createQuery("FROM AllowedReservationEmail e WHERE e.id = :id", AllowedReservationEmail.class)
                .setParameter("id", id)
                .getResultList();
        return rows.isEmpty() ? null : rows.get(0);
    }

    public AllowedReservationEmail findByEmail(String email) {
        List<AllowedReservationEmail> rows = entityManager
                .createQuery("FROM AllowedReservationEmail e WHERE e.email = :email", AllowedReservationEmail.class)
                .setParameter("email", email)
                .getResultList();
        return rows.isEmpty() ? null : rows.get(0);
    }

    public List<AllowedEmailDto> findAllProjected() {
        return findPageProjected(null, 0, 100);
    }

    public List<AllowedEmailDto> findPageProjected(String search, int page, int size) {
        String normalizedSearch = search == null ? "" : search.trim().toLowerCase();
        boolean withSearch = !normalizedSearch.isBlank();

        String hql = """
                SELECT new org.lpu.dev.codes.model.dto.AllowedEmailDto(
                    e.id,
                    e.email,
                    e.status,
                    e.createdAt,
                    e.createdBy
                )
                FROM AllowedReservationEmail e
                """
                + (withSearch ? "WHERE LOWER(e.email) LIKE :search " : "")
                + "ORDER BY e.email ASC";

        var query = entityManager.createQuery(hql, AllowedEmailDto.class)
                .setFirstResult(Math.max(0, page) * Math.max(1, size))
                .setMaxResults(Math.max(1, size));
        if (withSearch) {
            query.setParameter("search", "%" + normalizedSearch + "%");
        }
        return query.getResultList();
    }

    public long countAll(String search) {
        String normalizedSearch = search == null ? "" : search.trim().toLowerCase();
        boolean withSearch = !normalizedSearch.isBlank();

        String hql = "SELECT COUNT(e) FROM AllowedReservationEmail e "
                + (withSearch ? "WHERE LOWER(e.email) LIKE :search" : "");
        var query = entityManager.createQuery(hql, Long.class);
        if (withSearch) {
            query.setParameter("search", "%" + normalizedSearch + "%");
        }
        Long count = query.getSingleResult();
        return count == null ? 0L : count;
    }

    public void saveAllBatch(List<AllowedReservationEmail> entries) {
        if (entries == null || entries.isEmpty()) {
            return;
        }
        final int batchSize = 500;
        for (int i = 0; i < entries.size(); i++) {
            entityManager.persist(entries.get(i));
            if ((i + 1) % batchSize == 0) {
                entityManager.flush();
                entityManager.clear();
            }
        }
        entityManager.flush();
        entityManager.clear();
    }

    public boolean existsActiveByEmail(String email) {
        Long count = entityManager
                .createQuery(
                        "SELECT COUNT(e) FROM AllowedReservationEmail e "
                                + "WHERE e.email = :email AND e.status = 'ACTIVE'",
                        Long.class)
                .setParameter("email", email)
                .getSingleResult();
        return count != null && count > 0;
    }

    public boolean updateStatus(Long id, String status) {
        int rows = entityManager
                .createQuery("UPDATE AllowedReservationEmail e SET e.status = :status WHERE e.id = :id")
                .setParameter("status", status)
                .setParameter("id", id)
                .executeUpdate();
        return rows > 0;
    }

    public boolean deleteById(Long id) {
        int rows = entityManager
                .createQuery("DELETE FROM AllowedReservationEmail e WHERE e.id = :id")
                .setParameter("id", id)
                .executeUpdate();
        return rows > 0;
    }

    public int deleteAll() {
        return entityManager
                .createQuery("DELETE FROM AllowedReservationEmail e")
                .executeUpdate();
    }
}
