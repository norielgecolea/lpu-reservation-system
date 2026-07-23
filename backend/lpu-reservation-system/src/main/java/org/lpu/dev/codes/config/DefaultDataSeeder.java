package org.lpu.dev.codes.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationListener;
import org.springframework.context.event.ContextRefreshedEvent;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

/**
 * Seeds the default SUPERADMIN account on first startup when no such user exists.
 */
@Component
public class DefaultDataSeeder implements ApplicationListener<ContextRefreshedEvent> {

    private static final Logger log = LoggerFactory.getLogger(DefaultDataSeeder.class);

    private static final String SUPERADMIN_USERNAME = "superadmin";
    private static final String SUPERADMIN_PASSWORD_HASH =
            "$2a$10$GFDhdtkDkYctEUZjLrd5te1SROXu9MmWNJHfebcTOLsyWEBvuSIzK";

    private boolean seeded;

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    @Transactional
    public void onApplicationEvent(ContextRefreshedEvent event) {
        if (seeded) {
            return;
        }
        seeded = true;
        ensureSuperAdmin();
    }

    private void ensureSuperAdmin() {
        Number count = (Number) entityManager.createNativeQuery(
                        "SELECT COUNT(*) FROM users WHERE LOWER(username) = LOWER(:username) OR role = 'SUPERADMIN'")
                .setParameter("username", SUPERADMIN_USERNAME)
                .getSingleResult();

        if (count.longValue() > 0) {
            log.info("SUPERADMIN already present — skip preload");
            return;
        }

        int inserted = entityManager.createNativeQuery("""
                INSERT INTO users (
                    username,
                    fullname,
                    role,
                    email,
                    employee_id,
                    password_hash,
                    status,
                    reset_token,
                    reset_token_expires_at
                )
                VALUES (
                    'superadmin',
                    'Admin',
                    'SUPERADMIN',
                    'superadmin@lpu.edu.ph',
                    'SUPER001',
                    :passwordHash,
                    'ACTIVE',
                    '8a49d271-0a7d-4c74-ab98-d029d6b76f38',
                    TIMESTAMP '2026-07-16 10:28:48.538937'
                )
                """)
                .setParameter("passwordHash", SUPERADMIN_PASSWORD_HASH)
                .executeUpdate();

        if (inserted > 0) {
            log.info("Preloaded default SUPERADMIN user (username={})", SUPERADMIN_USERNAME);
        }
    }
}
