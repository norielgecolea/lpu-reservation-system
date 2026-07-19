
INSERT INTO facilities (id, facility_name, description)
VALUES
(1, 'FLT', 'Feliciano L. Torres Theater'),
(2, 'Van', 'University Transportation Service'),
(3, 'Nexus', 'Nexus Facility'),
(4, 'Boardroom', 'Boardroom Meeting Facility'),
(5, 'Gymnasium', 'University Gymnasium');


INSERT INTO resources (resource_name, facility_id, status)
VALUES
-- FLT
('FLT Room 101', 1, 'AVAILABLE'),
('FLT Room 102', 1, 'AVAILABLE'),
('FLT Conference Room', 1, 'AVAILABLE'),

-- Vans
('Toyota HiAce Van 1', 2, 'AVAILABLE'),
('Toyota HiAce Van 2', 2, 'AVAILABLE'),
('Toyota Commuter Van', 2, 'AVAILABLE'),

-- Nexus
('Nexus Hall A', 3, 'AVAILABLE'),
('Nexus Hall B', 3, 'AVAILABLE'),
('Nexus Training Room', 3, 'AVAILABLE'),

-- Boardroom
('Main Boardroom', 4, 'AVAILABLE'),
('Executive Boardroom', 4, 'AVAILABLE'),

-- Gymnasium
('Gymnasium Main Court', 5, 'AVAILABLE'),
('Gymnasium Conference Area', 5, 'AVAILABLE'),
('Gymnasium Stage', 5, 'AVAILABLE');




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

INSERT INTO driver (full_name, contact_number, status) VALUES
('Juan Dela Cruz', '09171234567', 'ACTIVE'),
('Maria Santos', '09181234567', 'ACTIVE'),
('Pedro Reyes', '09191234567', 'ACTIVE');

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