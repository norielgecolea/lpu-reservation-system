package org.lpu.dev.codes.repository;

import java.util.List;
import java.util.Optional;

import org.lpu.dev.codes.model.data.Driver;
import org.springframework.stereotype.Repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

@Repository
public class DriverRepository {

    @PersistenceContext
    private EntityManager entityManager;

    public void save(Driver driver) {
        if (driver.getId() == null) {
            entityManager.persist(driver);
        } else {
            entityManager.merge(driver);
        }
        entityManager.flush();
    }

    public Optional<Driver> findById(Long id) {
        Driver result = entityManager.find(Driver.class, id);
        return Optional.ofNullable(result);
    }

    public List<Driver> findAll() {
        return entityManager
                .createQuery("FROM Driver d ORDER BY d.fullName", Driver.class)
                .getResultList();
    }

    public List<Driver> findActive() {
        return entityManager
                .createQuery("FROM Driver d WHERE d.status = 'ACTIVE' ORDER BY d.fullName", Driver.class)
                .getResultList();
    }

    public boolean updateStatus(Long id, String status) {
        int rows = entityManager.createQuery(
                "UPDATE Driver d SET d.status = :status WHERE d.id = :id")
                .setParameter("status", status)
                .setParameter("id", id)
                .executeUpdate();
        return rows > 0;
    }

    public boolean deleteById(Long id) {
        int rows = entityManager.createQuery("DELETE FROM Driver d WHERE d.id = :id")
                .setParameter("id", id)
                .executeUpdate();
        return rows > 0;
    }
}
