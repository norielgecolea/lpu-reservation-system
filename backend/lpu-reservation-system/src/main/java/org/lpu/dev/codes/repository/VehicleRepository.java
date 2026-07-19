package org.lpu.dev.codes.repository;

import java.util.List;

import org.lpu.dev.codes.model.data.Vehicle;
import org.springframework.stereotype.Repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

@Repository
public class VehicleRepository {

    @PersistenceContext
    private EntityManager entityManager;

    public void save(Vehicle vehicle) {
        entityManager.persist(vehicle);
        entityManager.flush();
    }

    public Vehicle findById(Long id) {

        String hql = """
                FROM Vehicle v
                WHERE v.id = :id
                """;

        List<Vehicle> vehicles = entityManager
                .createQuery(hql, Vehicle.class)
                .setParameter("id", id)
                .getResultList();

        return vehicles.isEmpty() ? null : vehicles.get(0);
    }

    public Vehicle findByPlateNumber(String lateNum) {

        String hql = """
                FROM Vehicle v
                WHERE v.lateNum = :lateNum
                """;

        List<Vehicle> vehicles = entityManager
                .createQuery(hql, Vehicle.class)
                .setParameter("lateNum", lateNum)
                .getResultList();

        return vehicles.isEmpty() ? null : vehicles.get(0);
    }

    public List<Vehicle> getAllVehicles() {

        String hql = """
                FROM Vehicle v
                ORDER BY v.brand
                """;

        return entityManager
                .createQuery(hql, Vehicle.class)
                .getResultList();
    }

    public List<Vehicle> getVehiclesByFacility(Long facilityId) {

        String hql = """
                FROM Vehicle v
                JOIN FETCH v.facility
                WHERE v.facility.id = :facilityId
                ORDER BY v.brand
                """;

        return entityManager
                .createQuery(hql, Vehicle.class)
                .setParameter("facilityId", facilityId)
                .getResultList();
    }

    public boolean existsByPlateNumber(String lateNum) {

        String hql = """
                SELECT COUNT(v)
                FROM Vehicle v
                WHERE v.lateNum = :lateNum
                """;

        Long count = entityManager
                .createQuery(hql, Long.class)
                .setParameter("lateNum", lateNum)
                .getSingleResult();

        return count > 0;
    }

    public boolean updateStatus(Long id, String status) {

        String hql = """
                UPDATE Vehicle v
                SET v.status = :status
                WHERE v.id = :id
                """;

        int rowsAffected = entityManager
                .createQuery(hql)
                .setParameter("status", status)
                .setParameter("id", id)
                .executeUpdate();

        return rowsAffected > 0;
    }

    public boolean updateVehicle(
            Long id,
            String brand,
            String lateNum,
            Integer capacity,
            String vehicleDescription,
            String status,
            Long facilityId) {

        String hql = """
                UPDATE Vehicle v
                SET v.brand = :brand,
                    v.lateNum = :lateNum,
                    v.capacity = :capacity,
                    v.vehicleDescription = :vehicleDescription,
                    v.status = :status,
                    v.facility.id = :facilityId
                WHERE v.id = :id
                """;

        int rowsAffected = entityManager
                .createQuery(hql)
                .setParameter("brand", brand)
                .setParameter("lateNum", lateNum)
                .setParameter("capacity", capacity)
                .setParameter("vehicleDescription", vehicleDescription)
                .setParameter("status", status)
                .setParameter("facilityId", facilityId)
                .setParameter("id", id)
                .executeUpdate();

        return rowsAffected > 0;
    }

    public boolean deleteById(Long id) {

        String hql = """
                DELETE FROM Vehicle v
                WHERE v.id = :id
                """;

        int rowsAffected = entityManager
                .createQuery(hql)
                .setParameter("id", id)
                .executeUpdate();

        return rowsAffected > 0;
    }
}
