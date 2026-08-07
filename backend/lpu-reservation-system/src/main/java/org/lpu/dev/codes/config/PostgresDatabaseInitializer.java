package org.lpu.dev.codes.config;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Objects;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.InitializingBean;

/**
 * Ensures the application database exists before the pool / Hibernate EMF start.
 * Connects to the default {@code postgres} maintenance DB and creates
 * {@code lpu_reservation} when missing so {@code hibernate.hbm2ddl.auto=update}
 * can create/update schema on first startup.
 */
public class PostgresDatabaseInitializer implements InitializingBean {

    private static final Logger log = LoggerFactory.getLogger(PostgresDatabaseInitializer.class);

    private String adminJdbcUrl = "jdbc:postgresql://reservation-postgres:5432/postgres";
    private String user = "postgres";
    private String password;
    private String databaseName = "lpu_reservation";
    private String driverClass = "org.postgresql.Driver";
    private int maxAttempts = 30;
    private long retryDelayMs = 2000L;

    @Override
    public void afterPropertiesSet() throws Exception {
        Objects.requireNonNull(databaseName, "databaseName is required");
        if (!databaseName.matches("[A-Za-z_][A-Za-z0-9_]*")) {
            throw new IllegalArgumentException("Unsafe database name: " + databaseName);
        }

        Class.forName(driverClass);

        SQLException lastFailure = null;
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                ensureDatabaseExists();
                return;
            } catch (SQLException ex) {
                lastFailure = ex;
                log.warn(
                        "Waiting for PostgreSQL before creating database '{}' (attempt {}/{}): {}",
                        databaseName,
                        attempt,
                        maxAttempts,
                        ex.getMessage());
                Thread.sleep(retryDelayMs);
            }
        }

        throw new IllegalStateException(
                "Could not ensure PostgreSQL database '" + databaseName + "' exists after "
                        + maxAttempts + " attempts",
                lastFailure);
    }

    private void ensureDatabaseExists() throws SQLException {
        try (Connection connection = DriverManager.getConnection(adminJdbcUrl, user, password);
                Statement statement = connection.createStatement()) {

            boolean exists;
            try (ResultSet rs = statement.executeQuery(
                    "SELECT 1 FROM pg_database WHERE datname = '" + databaseName + "'")) {
                exists = rs.next();
            }

            if (exists) {
                log.info("PostgreSQL database '{}' already exists", databaseName);
                return;
            }

            // CREATE DATABASE cannot run inside a transaction; DriverManager connections
            // default to auto-commit, which is required here.
            statement.executeUpdate("CREATE DATABASE " + databaseName);
            log.info("Created PostgreSQL database '{}'", databaseName);
        }
    }

    public void setAdminJdbcUrl(String adminJdbcUrl) {
        this.adminJdbcUrl = adminJdbcUrl;
    }

    public void setUser(String user) {
        this.user = user;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public void setDatabaseName(String databaseName) {
        this.databaseName = databaseName;
    }

    public void setDriverClass(String driverClass) {
        this.driverClass = driverClass;
    }

    public void setMaxAttempts(int maxAttempts) {
        this.maxAttempts = maxAttempts;
    }

    public void setRetryDelayMs(long retryDelayMs) {
        this.retryDelayMs = retryDelayMs;
    }
}
