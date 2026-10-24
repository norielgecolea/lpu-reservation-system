package org.lpu.dev.codes.config;

import org.lpu.dev.codes.services.RoleAccessService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationListener;
import org.springframework.context.event.ContextRefreshedEvent;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

/**
 * Seeds the default SUPERADMIN account and default role/service map on first startup.
 */
@Component
public class DefaultDataSeeder implements ApplicationListener<ContextRefreshedEvent> {

    private static final Logger log = LoggerFactory.getLogger(DefaultDataSeeder.class);

    private static final String SUPERADMIN_USERNAME = "superadmin";
    /** Reset token previously shipped in source. Cleared on startup if it is still present. */
    private static final String LEAKED_RESET_TOKEN = "8a49d271-0a7d-4c74-ab98-d029d6b76f38";

    private boolean seeded;

    @PersistenceContext
    private EntityManager entityManager;

    @Autowired
    private RoleAccessService roleAccessService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void onApplicationEvent(ContextRefreshedEvent event) {
        if (seeded) {
            return;
        }
        seeded = true;
        roleAccessService.ensureDefaults();
        clearLeakedResetToken();
        ensureSuperAdmin();
    }

    private void clearLeakedResetToken() {
        int cleared = entityManager.createNativeQuery(
                "UPDATE users SET reset_token = NULL, reset_token_expires_at = NULL WHERE reset_token = :token")
                .setParameter("token", LEAKED_RESET_TOKEN)
                .executeUpdate();
        if (cleared > 0) {
            log.info("Cleared a reset token that had been shipped in source");
        }
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

        String initialPassword = System.getenv("SUPERADMIN_INITIAL_PASSWORD");
        if (initialPassword == null || initialPassword.isBlank()) {
            log.warn("No SUPERADMIN account exists and SUPERADMIN_INITIAL_PASSWORD is not set. Skipping seed.");
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
                    NULL,
                    NULL
                )
                """)
                .setParameter("passwordHash", passwordEncoder.encode(initialPassword))
                .executeUpdate();

        if (inserted > 0) {
            log.info("Preloaded default SUPERADMIN user (username={})", SUPERADMIN_USERNAME);
        }
    }
}
