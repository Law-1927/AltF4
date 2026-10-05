-- ALTF4 — Shimmer and Shield Car Coating
-- Draft schema, derived from the wireframe screens and the LOA's
-- Project Objectives. Not yet reviewed/finalized by the team.

CREATE TABLE users (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    role            TEXT NOT NULL CHECK (role IN ('client', 'staff', 'admin')),
    full_name       TEXT NOT NULL,
    email           TEXT UNIQUE NOT NULL,
    phone           TEXT,
    password_hash   TEXT NOT NULL,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vehicles (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id        INTEGER NOT NULL REFERENCES users(id),
    make            TEXT NOT NULL,
    model           TEXT NOT NULL,
    type            TEXT,           -- e.g. SUV, Sedan, Truck
    plate_number    TEXT,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE services (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,       -- e.g. "Ceramic Pro (9H)"
    description     TEXT,
    price_php       DECIMAL(10, 2) NOT NULL,
    duration_mins   INTEGER NOT NULL,    -- bay time required
    warranty_years  INTEGER
);

CREATE TABLE appointments (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    ref_id          TEXT UNIQUE NOT NULL,  -- e.g. "ALT-PH-092"
    client_id       INTEGER NOT NULL REFERENCES users(id),
    vehicle_id      INTEGER NOT NULL REFERENCES vehicles(id),
    service_id      INTEGER NOT NULL REFERENCES services(id),
    scheduled_date  DATE NOT NULL,
    scheduled_time  TIME NOT NULL,
    status          TEXT NOT NULL DEFAULT 'Pending'
                    CHECK (status IN ('Pending', 'Ongoing', 'Completed', 'Cancelled')),
    total_due_php   DECIMAL(10, 2) NOT NULL,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (scheduled_date, scheduled_time)  -- guards against double booking
);

CREATE TABLE notifications (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    appointment_id  INTEGER NOT NULL REFERENCES appointments(id),
    channel         TEXT NOT NULL,      -- e.g. SMS, email, in-app
    message         TEXT NOT NULL,
    sent_at         DATETIME
);

CREATE TABLE reports_daily (
    report_date         DATE PRIMARY KEY,
    total_revenue_php   DECIMAL(10, 2) NOT NULL DEFAULT 0,
    completed_jobs      INTEGER NOT NULL DEFAULT 0
);
