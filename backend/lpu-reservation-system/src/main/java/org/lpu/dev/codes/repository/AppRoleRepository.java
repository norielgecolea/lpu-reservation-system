package org.lpu.dev.codes.repository;

import java.util.List;
import java.util.Optional;

import org.lpu.dev.codes.model.data.AppRole;
import org.springframework.stereotype.Repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

@Repository
public class AppRoleRepository {

    @PersistenceContext
    private EntityManager entityManager;

    public void save(AppRole role) {
        entityManager.persist(role);
        entityManager.flush();
    }

    public void merge(AppRole role) {
        entityManager.merge(role);
        entityManager.flush();
    }

    public Optional<AppRole> findByCode(String code) {
        return Optional.ofNullable(entityManager.find(AppRole.class, code));
    }

    public List<AppRole> findAll() {
        return entityManager
                .createQuery("FROM AppRole r ORDER BY r.code ASC", AppRole.class)
                .getResultList();
    }

    public long count() {
        return entityManager.createQuery("SELECT COUNT(r) FROM AppRole r", Long.class).getSingleResult();
    }

    public void delete(AppRole role) {
        entityManager.remove(entityManager.contains(role) ? role : entityManager.merge(role));
        entityManager.flush();
    }

    public long countUsersWithRole(String roleCode) {
        Number count = (Number) entityManager
                .createNativeQuery("SELECT COUNT(*) FROM users WHERE role = :role")
                .setParameter("role", roleCode)
                .getSingleResult();
        return count.longValue();
    }
}
