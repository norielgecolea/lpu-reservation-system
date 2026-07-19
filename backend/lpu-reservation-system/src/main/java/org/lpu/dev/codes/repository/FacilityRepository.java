package org.lpu.dev.codes.repository;

import java.util.List;

import org.lpu.dev.codes.model.data.Facility;
import org.springframework.stereotype.Repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

@Repository
public class FacilityRepository {

	@PersistenceContext
	private EntityManager entityManager;

	public void save(Facility facility) {
		entityManager.persist(facility);
		entityManager.flush();
	}

	public Facility findById(Long id) {

		String hql = """
				FROM Facility f
				WHERE f.id = :id
				""";

		List<Facility> facilities = entityManager.createQuery(hql, Facility.class).setParameter("id", id)
				.getResultList();

		return facilities.isEmpty() ? null : facilities.get(0);
	}

	public Facility findByName(String facilityName) {

		String hql = """
				FROM Facility f
				WHERE f.facilityName = :facilityName
				""";

		List<Facility> facilities = entityManager.createQuery(hql, Facility.class)
				.setParameter("facilityName", facilityName).getResultList();

		return facilities.isEmpty() ? null : facilities.get(0);
	}

	public boolean existsByName(String facilityName) {

		String hql = """
				SELECT COUNT(f)
				FROM Facility f
				WHERE f.facilityName = :facilityName
				""";

		Long count = entityManager.createQuery(hql, Long.class).setParameter("facilityName", facilityName)
				.getSingleResult();

		return count > 0;
	}

	public List<Facility> getAllFacilities() {

	    String hql = """
	            FROM Facility f
	            WHERE LOWER(f.facilityName) <> LOWER(:facilityName)
	            ORDER BY f.facilityName
	            """;

	    return entityManager.createQuery(hql, Facility.class)
	            .setParameter("facilityName", "van")
	            .getResultList();
	}

	public boolean updateFacility(Long id, String facilityName, String description) {

		String hql = """
				UPDATE Facility f
				SET f.facilityName = :facilityName,
				    f.description = :description
				WHERE f.id = :id
				""";

		int rowsAffected = entityManager.createQuery(hql).setParameter("facilityName", facilityName)
				.setParameter("description", description).setParameter("id", id).executeUpdate();

		return rowsAffected > 0;
	}

	public boolean deleteById(Long id) {

		String hql = """
				DELETE FROM Facility f
				WHERE f.id = :id
				""";

		int rowsAffected = entityManager.createQuery(hql).setParameter("id", id).executeUpdate();

		return rowsAffected > 0;
	}
}