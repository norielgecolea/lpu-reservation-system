package org.lpu.dev.codes.repository;



import java.util.List;

import org.lpu.dev.codes.model.data.Users;
import org.springframework.stereotype.Repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

@Repository
public class UserRepository {

    @PersistenceContext
    private EntityManager entityManager;

    public void save(Users user) {
        if (user.getId() == null) {
            entityManager.persist(user);
        } else {
            entityManager.merge(user);
        }
        entityManager.flush();
    }

    public void updateFullname(Long id, String fullname) {
        entityManager.createNativeQuery("UPDATE users SET fullname = :fullname WHERE id = :id")
                .setParameter("fullname", fullname)
                .setParameter("id", id)
                .executeUpdate();
        entityManager.flush();
    }

    public void updateEmail(Long id, String email) {
        entityManager.createNativeQuery("UPDATE users SET email = :email WHERE id = :id")
                .setParameter("email", email)
                .setParameter("id", id)
                .executeUpdate();
        entityManager.flush();
    }

    public void updatePasswordHash(Long id, String passwordHash) {
        entityManager.createNativeQuery("UPDATE users SET password_hash = :passwordHash WHERE id = :id")
                .setParameter("passwordHash", passwordHash)
                .setParameter("id", id)
                .executeUpdate();
        entityManager.flush();
    }

    @SuppressWarnings("unchecked")
    public java.util.Optional<Object[]> findProfileRowByUsername(String username) {
        if (username == null || username.isBlank()) {
            return java.util.Optional.empty();
        }
        var rows = entityManager.createNativeQuery(
                "SELECT id, username, password_hash, email, fullname, role, employee_id FROM users WHERE LOWER(username) = LOWER(:username)")
                .setParameter("username", username.trim())
                .getResultList();
        return rows.isEmpty() ? java.util.Optional.empty() : java.util.Optional.of((Object[]) rows.get(0));
    }

    public boolean isEmailUsedByOther(Long userId, String email) {
        Number count = (Number) entityManager.createNativeQuery(
                "SELECT COUNT(*) FROM users WHERE LOWER(email) = LOWER(:email) AND id <> :id")
                .setParameter("email", email)
                .setParameter("id", userId)
                .getSingleResult();
        return count.longValue() > 0;
    }

    public boolean isUserActive(String username) {
        var rows = entityManager.createNativeQuery(
                "SELECT status FROM users WHERE LOWER(username) = LOWER(:username)")
                .setParameter("username", username == null ? "" : username.trim())
                .getResultList();
        if (rows.isEmpty()) {
            return false;
        }
        return "ACTIVE".equalsIgnoreCase(String.valueOf(rows.get(0)));
    }
    public boolean existsByRole(String role) {

        String hql = """
            SELECT COUNT(u)
            FROM Users u
            WHERE u.role = :role
            """;

        Long count = entityManager
                .createQuery(hql, Long.class)
                .setParameter("role", role)
                .getSingleResult();

        return count > 0;
    }
    public Users findByUsername(String username) {

        String hql = """
                FROM Users u
                WHERE u.username = :username
                """;

        List<Users> users = entityManager
                .createQuery(hql, Users.class)
                .setParameter("username", username)
                .getResultList();

        return users.isEmpty() ? null : users.get(0);
    }

    public Users findByUsernameIgnoreCase(String username) {
        if (username == null || username.isBlank()) {
            return null;
        }

        String hql = """
                FROM Users u
                WHERE LOWER(u.username) = LOWER(:username)
                """;

        List<Users> users = entityManager
                .createQuery(hql, Users.class)
                .setParameter("username", username.trim())
                .getResultList();

        return users.isEmpty() ? null : users.get(0);
    }

    public Users findByEmail(String email) {
        String hql = """
                FROM Users u
                WHERE LOWER(u.email) = LOWER(:email)
                """;
        List<Users> users = entityManager
                .createQuery(hql, Users.class)
                .setParameter("email", email)
                .getResultList();
        return users.isEmpty() ? null : users.get(0);
    }

    public Users findByResetToken(String token) {
        String hql = """
                FROM Users u
                WHERE u.resetToken = :token
                """;
        List<Users> users = entityManager
                .createQuery(hql, Users.class)
                .setParameter("token", token)
                .getResultList();
        return users.isEmpty() ? null : users.get(0);
    }
    
    public List<Users> getAllUsers() {

        String hql = """
                FROM Users u
                ORDER BY u.fullname
                """;

        return entityManager
                .createQuery(hql, Users.class)
                .getResultList();
    }

    public List<Users> getUsersByRole(String role) {

        String hql = """
                FROM Users u
                WHERE u.role = :role
                ORDER BY u.fullname
                """;

        return entityManager
                .createQuery(hql, Users.class)
                .setParameter("role", role)
                .getResultList();
    }
    
    public boolean deleteUserByEmpId(String empId) {
        String hql = """
            DELETE FROM Users u
            WHERE u.employeeId = :empId
            """;

        int rowsAffected = entityManager.createQuery(hql)
                .setParameter("empId", empId)
                .executeUpdate();

        return rowsAffected > 0;
    }
    
    public Users findByEmployeeId(String employeeId) {

        String hql = """
                FROM Users u
                WHERE u.employeeId = :employeeId
                """;

        List<Users> users = entityManager
                .createQuery(hql, Users.class)
                .setParameter("employeeId", employeeId)
                .getResultList();

        return users.isEmpty() ? null : users.get(0);
    }
    
    public boolean updateStatus(String employeeId, String status) {

        String hql = """
                UPDATE Users u
                SET u.status = :status
                WHERE u.employeeId = :employeeId
                """;

        int rowsAffected = entityManager.createQuery(hql)
                .setParameter("status", status)
                .setParameter("employeeId", employeeId)
                .executeUpdate();

        return rowsAffected > 0;
    }
}
