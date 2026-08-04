
INSERT INTO facilities (id, facility_name, description)
VALUES
(1, 'FLT', 'Feliciano L. Torres Theater'),
(2, 'Van', 'University Transportation Service'),
(3, 'Nexus', 'Nexus Facility'),
(4, 'Boardroom', 'Boardroom Meeting Facility'),
(5, 'Gymnasium', 'University Gymnasium');

INSERT INTO users (
    id,
    username,
    fullname,
    role,
    email,
    employee_id,
    password_hash,
    status,
    created_at,
    updated_at,
    reset_token,
    reset_token_expires_at
)
VALUES
(
    1,
    'superadmin',
    'Admin',
    'SUPERADMIN',
    'superadmin@lpu.edu.ph',
    'SUPER001',
    '$2a$10$GFDhdtkDkYctEUZjLrd5te1SROXu9MmWNJHfebcTOLsyWEBvuSIzK',
    'ACTIVE',
    '2026-06-11 07:28:34.259463',
    '2026-06-11 07:28:34.259463',
    '8a49d271-0a7d-4c74-ab98-d029d6b76f38',
    '2026-07-16 10:28:48.538937'
);




CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    fullname VARCHAR(150) NOT NULL,
    role VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    employee_id VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMP;

CREATE TABLE facilities (
    id BIGSERIAL PRIMARY KEY,
    facility_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);


CREATE TABLE resources (
    id BIGSERIAL PRIMARY KEY,
    resource_name VARCHAR(255) NOT NULL,
    facility_id BIGINT NOT NULL,
    status VARCHAR(20) DEFAULT 'AVAILABLE',

    CONSTRAINT fk_resource_facility
        FOREIGN KEY (facility_id)
        REFERENCES facilities(id)
);

CREATE TABLE vehicle (
    id BIGSERIAL PRIMARY KEY,
    brand VARCHAR(255) NOT NULL,
    plate_num VARCHAR(255) NOT NULL,
    capacity INT NOT NULL,
    vehicle_description VARCHAR(255) NOT NULL,
    
    facility_id BIGINT NOT NULL,
    status VARCHAR(20) DEFAULT 'AVAILABLE',

    CONSTRAINT fk_resource_facility
        FOREIGN KEY (facility_id)
        REFERENCES facilities(id)
);

ALTER TABLE vehicle
ADD COLUMN image_url TEXT DEFAULT '/uploads/vehicles/default.webp';

CREATE TABLE flt_reservations (
    id BIGSERIAL PRIMARY KEY,
    event_title VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    department VARCHAR(255) NOT NULL,
    organization VARCHAR(255) NOT NULL,
    contact_person VARCHAR(150) NOT NULL,
    contact_email VARCHAR(100) NOT NULL,
    contact_number VARCHAR(20) NOT NULL,
    reserved_dates JSONB NOT NULL,
    requested_equipment JSONB,
    room_type VARCHAR(50),
    expected_attendees INTEGER,
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING | APPROVED | REJECTED | CANCELLED | COMPLETED | CONFLICT
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE flt_reservations
  ADD COLUMN IF NOT EXISTS room_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS expected_attendees INTEGER,
  ADD COLUMN IF NOT EXISTS coordination_date VARCHAR(20),
  ADD COLUMN IF NOT EXISTS coordination_start_time VARCHAR(10),
  ADD COLUMN IF NOT EXISTS coordination_end_time VARCHAR(10);

ALTER TABLE flt_reservations
  ADD COLUMN IF NOT EXISTS satisfaction_rating SMALLINT;

ALTER TABLE flt_reservations
  ADD COLUMN IF NOT EXISTS additional_instructions TEXT;

CREATE TABLE IF NOT EXISTS maintenance_blocks (
    id BIGSERIAL PRIMARY KEY,
    facility_type VARCHAR(20) NOT NULL,
    block_date VARCHAR(20) NOT NULL,
    start_time VARCHAR(10) NOT NULL,
    end_time VARCHAR(10) NOT NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gymnasium_reservations (
    id BIGSERIAL PRIMARY KEY,
    event_title VARCHAR(255) NOT NULL,
    department VARCHAR(255) NOT NULL,
    organization VARCHAR(255) NOT NULL,
    number_of_attendees INTEGER,
    contact_person VARCHAR(150) NOT NULL,
    contact_email VARCHAR(100) NOT NULL,
    contact_number VARCHAR(20) NOT NULL,
    reserved_dates JSONB NOT NULL,
    requested_equipment JSONB,
    additional_instructions TEXT,
    coordination_date VARCHAR(20),
    coordination_start_time VARCHAR(10),
    coordination_end_time VARCHAR(10),
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING | APPROVED | REJECTED | CANCELLED | COMPLETED | CONFLICT
    satisfaction_rating SMALLINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS driver (
    id BIGSERIAL PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    contact_number VARCHAR(20),
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);



CREATE TABLE IF NOT EXISTS van_reservations (
    id BIGSERIAL PRIMARY KEY,
    department VARCHAR(255) NOT NULL,
    organization VARCHAR(255) NOT NULL,
    travel_destination VARCHAR(255) NOT NULL,
    passenger_names TEXT NOT NULL,
    number_of_passengers INTEGER NOT NULL DEFAULT 1,
    return_time VARCHAR(10),
    contact_person VARCHAR(150) NOT NULL,
    contact_email VARCHAR(100) NOT NULL,
    contact_number VARCHAR(20) NOT NULL,
    reserved_dates JSONB NOT NULL,
    vehicle_id BIGINT REFERENCES vehicle(id),
    driver_id BIGINT REFERENCES driver(id),
    status VARCHAR(20) DEFAULT 'PENDING',
    satisfaction_rating SMALLINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE van_reservations ADD COLUMN IF NOT EXISTS number_of_passengers INTEGER NOT NULL DEFAULT 1;

ALTER TABLE flt_reservations ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
ALTER TABLE flt_reservations ADD COLUMN IF NOT EXISTS approved_by VARCHAR(100);
ALTER TABLE gymnasium_reservations ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
ALTER TABLE gymnasium_reservations ADD COLUMN IF NOT EXISTS approved_by VARCHAR(100);
ALTER TABLE van_reservations ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
ALTER TABLE van_reservations ADD COLUMN IF NOT EXISTS approved_by VARCHAR(100);
ALTER TABLE van_reservations ADD COLUMN IF NOT EXISTS additional_remarks TEXT;
ALTER TABLE van_reservations ADD COLUMN IF NOT EXISTS school VARCHAR(20);
ALTER TABLE van_reservations ADD COLUMN IF NOT EXISTS requested_vehicle_type VARCHAR(150);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id              BIGSERIAL PRIMARY KEY,
    service         VARCHAR(50)  NOT NULL,
    action_type     VARCHAR(50)  NOT NULL,
    admin_username  VARCHAR(50)  NOT NULL,
    admin_fullname  VARCHAR(150),
    target_type     VARCHAR(50),
    target_id       BIGINT,
    target_label    VARCHAR(255),
    details         JSONB,
    performed_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_service_time
    ON admin_audit_logs (service, performed_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_service_action
    ON admin_audit_logs (service, action_type);

CREATE INDEX IF NOT EXISTS idx_flt_reservations_created_at
    ON flt_reservations (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gymnasium_reservations_created_at
    ON gymnasium_reservations (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_van_reservations_created_at
    ON van_reservations (created_at DESC);

CREATE TABLE IF NOT EXISTS allowed_reservation_emails (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(100) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_allowed_reservation_emails_status
    ON allowed_reservation_emails (status);

-- Tracks cancel-or-penalize reminder emails (1 week / 3 days / 1 day before reserved date)
CREATE TABLE IF NOT EXISTS reservation_reminders (
    id BIGSERIAL PRIMARY KEY,
    service VARCHAR(20) NOT NULL,
    reservation_id BIGINT NOT NULL,
    reserved_date VARCHAR(20) NOT NULL,
    reminder_type VARCHAR(10) NOT NULL,
    sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_reservation_reminder UNIQUE (service, reservation_id, reserved_date, reminder_type)
);

CREATE INDEX IF NOT EXISTS idx_reservation_reminders_lookup
    ON reservation_reminders (service, reserved_date, reminder_type);

-- Super Admin–managed roles and which bookable services each role may see
CREATE TABLE IF NOT EXISTS app_roles (
    code VARCHAR(50) PRIMARY KEY,
    label VARCHAR(100) NOT NULL,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    home_path VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS role_service_access (
    role_code VARCHAR(50) NOT NULL REFERENCES app_roles(code) ON DELETE CASCADE,
    service_code VARCHAR(20) NOT NULL,
    PRIMARY KEY (role_code, service_code)
);

CREATE INDEX IF NOT EXISTS idx_role_service_access_service
    ON role_service_access (service_code);