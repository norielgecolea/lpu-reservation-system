package org.lpu.dev.codes.repository;

import java.util.List;

import org.lpu.dev.codes.model.data.RoleServiceAccess;
import org.springframework.stereotype.Repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

@Repository
public class RoleServiceAccessRepository {

    @PersistenceContext
    private EntityManager entityManager;

    public void save(RoleServiceAccess access) {
        entityManager.persist(access);
        entityManager.flush();
    }

    public List<String> findServiceCodesByRole(String roleCode) {
        return entityManager
                .createQuery(
                        "SELECT a.serviceCode FROM RoleServiceAccess a WHERE a.roleCode = :role ORDER BY a.serviceCode",
                        String.class)
                .setParameter("role", roleCode)
                .getResultList();
    }

    public List<RoleServiceAccess> findByRole(String roleCode) {
        return entityManager
                .createQuery(
                        "FROM RoleServiceAccess a WHERE a.roleCode = :role",
                        RoleServiceAccess.class)
                .setParameter("role", roleCode)
                .getResultList();
    }

    public void deleteByRole(String roleCode) {
        entityManager
                .createQuery("DELETE FROM RoleServiceAccess a WHERE a.roleCode = :role")
                .setParameter("role", roleCode)
                .executeUpdate();
    }

    public boolean exists(String roleCode, String serviceCode) {
        Long count = entityManager
                .createQuery(
                        "SELECT COUNT(a) FROM RoleServiceAccess a WHERE a.roleCode = :role AND a.serviceCode = :service",
                        Long.class)
                .setParameter("role", roleCode)
                .setParameter("service", serviceCode)
                .getSingleResult();
        return count != null && count > 0;
    }
}
