package org.lpu.dev.codes.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.lpu.dev.codes.model.data.PendingOutboundEmail;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

@Repository
public class PendingOutboundEmailRepository {

    @PersistenceContext
    private EntityManager entityManager;

    @Transactional
    public void save(PendingOutboundEmail email) {
        entityManager.persist(email);
        entityManager.flush();
    }

    @Transactional(readOnly = true)
    public List<PendingOutboundEmail> findDue(LocalDateTime now, int limit) {
        return entityManager.createQuery(
                "FROM PendingOutboundEmail e WHERE e.nextAttemptAt <= :now ORDER BY e.nextAttemptAt",
                PendingOutboundEmail.class)
                .setParameter("now", now)
                .setMaxResults(limit)
                .getResultList();
    }

    @Transactional
    public void deleteById(Long id) {
        entityManager.createQuery("DELETE FROM PendingOutboundEmail e WHERE e.id = :id")
                .setParameter("id", id)
                .executeUpdate();
    }

    @Transactional
    public void reschedule(Long id, int attemptCount, LocalDateTime nextAttemptAt, String lastError) {
        entityManager.createQuery(
                "UPDATE PendingOutboundEmail e SET e.attemptCount = :attemptCount, "
                        + "e.nextAttemptAt = :nextAttemptAt, e.lastError = :lastError WHERE e.id = :id")
                .setParameter("attemptCount", attemptCount)
                .setParameter("nextAttemptAt", nextAttemptAt)
                .setParameter("lastError", lastError)
                .setParameter("id", id)
                .executeUpdate();
    }
}
