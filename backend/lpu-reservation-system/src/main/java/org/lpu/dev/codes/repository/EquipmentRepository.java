package org.lpu.dev.codes.repository;

import java.util.List;

import org.lpu.dev.codes.model.data.Equipment;
import org.springframework.stereotype.Repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

@Repository
public class EquipmentRepository {

    @PersistenceContext
    private EntityManager entityManager;

    public void save(Equipment equipment) {
        entityManager.persist(equipment);
        entityManager.flush();
    }

    public Equipment findById(Long id) {

        String hql = """
                FROM Equipment e
                WHERE e.id = :id
                """;

        List<Equipment> equipments = entityManager
                .createQuery(hql, Equipment.class)
                .setParameter("id", id)
                .getResultList();

        return equipments.isEmpty() ? null : equipments.get(0);
    }

    public Equipment findByName(String name) {

        String hql = """
                FROM Equipment e
                WHERE e.resource_name = :resource_name
                """;

        List<Equipment> equipments = entityManager
                .createQuery(hql, Equipment.class)
                .setParameter("resource_name", name)
                .getResultList();

        return equipments.isEmpty() ? null : equipments.get(0);
    }

    public List<Equipment> getAllEquipment() {

        String hql = """
                FROM Equipment e
                ORDER BY e.resource_name
                """;

        return entityManager
                .createQuery(hql, Equipment.class)
                .getResultList();
    }

    public List<Equipment> getEquipmentByFacility(Long facilityId) {

        String hql = """
                FROM Equipment e
                WHERE e.facility.id = :facilityId
                ORDER BY e.resource_name
                """;

        return entityManager
                .createQuery(hql, Equipment.class)
                .setParameter("facilityId", facilityId)
                .getResultList();
    }

    public List<Equipment> getEquipmentByFacilityIds(List<Long> facilityIds) {

        if (facilityIds == null || facilityIds.isEmpty()) {
            return List.of();
        }

        String hql = """
                FROM Equipment e
                JOIN FETCH e.facility f
                WHERE f.id IN :facilityIds
                ORDER BY e.resource_name
                """;

        return entityManager
                .createQuery(hql, Equipment.class)
                .setParameter("facilityIds", facilityIds)
                .getResultList();
    }

    public boolean existsByName(String name) {

        String hql = """
                SELECT COUNT(e)
                FROM Equipment e
                WHERE e.resource_name = :resource_name
                """;

        Long count = entityManager
                .createQuery(hql, Long.class)
                .setParameter("resource_name", name)
                .getSingleResult();

        return count > 0;
    }

    public boolean updateStatus(Long id, String status) {

        String hql = """
                UPDATE Equipment e
                SET e.status = :status
                WHERE e.id = :id
                """;

        int rowsAffected = entityManager
                .createQuery(hql)
                .setParameter("status", status)
                .setParameter("id", id)
                .executeUpdate();

        return rowsAffected > 0;
    }

    public boolean updateEquipment(
            Long id,
            String name,
            String status,
            Long facilityId) {

        String hql = """
                UPDATE Equipment e
                SET e.resource_name = :resource_name,
                    e.status = :status,
                    e.facility.id = :facilityId
                WHERE e.id = :id
                """;

        int rowsAffected = entityManager
                .createQuery(hql)
                .setParameter("resource_name", name)
                .setParameter("status", status)
                .setParameter("facilityId", facilityId)
                .setParameter("id", id)
                .executeUpdate();

        return rowsAffected > 0;
    }

    public boolean deleteById(Long id) {

        String hql = """
                DELETE FROM Equipment e
                WHERE e.id = :id
                """;

        int rowsAffected = entityManager
                .createQuery(hql)
                .setParameter("id", id)
                .executeUpdate();

        return rowsAffected > 0;
    }
}