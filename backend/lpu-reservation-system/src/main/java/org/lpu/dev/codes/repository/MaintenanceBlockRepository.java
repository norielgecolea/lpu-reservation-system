package org.lpu.dev.codes.repository;

import java.util.List;
import java.util.Optional;

import org.lpu.dev.codes.model.data.MaintenanceBlock;
import org.springframework.stereotype.Repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

@Repository
public class MaintenanceBlockRepository {

    @PersistenceContext
    private EntityManager em;

    public MaintenanceBlock save(MaintenanceBlock block) {
        em.persist(block);
        em.flush();
        return block;
    }

    public Optional<MaintenanceBlock> findById(Long id) {
        return Optional.ofNullable(em.find(MaintenanceBlock.class, id));
    }

    public List<MaintenanceBlock> findByFacilityType(String facilityType) {
        return em.createQuery(
                "FROM MaintenanceBlock m WHERE m.facilityType = :ft ORDER BY m.blockDate, m.startTime",
                MaintenanceBlock.class)
            .setParameter("ft", facilityType)
            .getResultList();
    }

    public boolean deleteById(Long id) {
        return em.createQuery("DELETE FROM MaintenanceBlock m WHERE m.id = :id")
            .setParameter("id", id)
            .executeUpdate() > 0;
    }
}
