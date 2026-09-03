# Technical Documentation

**System:** LPU Laguna Online Reservation System  
**Institution:** Lyceum of the Philippines University – Laguna  
**Maintainer:** Management Information Systems (MIS) Department  
**Application version:** 1.0.0  
**Document type:** Technical documentation  
**Audience:** Developers, MIS, facilities operations, and end users  
**Source of truth:** Implemented code in this repository

This document supersedes `docs/TECHNICAL-DOCUMENTATION-V2-PHASE-1.md`.

---

# 1. Introduction

## 1.1 System Overview

The LPU Laguna Online Reservation System is a web application that lets faculty, staff, students, and accredited organizations request campus facility and vehicle reservations, and lets authorized administrators review, approve, coordinate, reschedule, and close those requests.

Public requestors book **without creating an account**. They choose a facility, pick dates on a calendar, complete a multi-step form, verify their institutional email with a one-time password (OTP), and submit. The request enters status `PENDING`. Staff accounts authenticate with a JSON Web Token (JWT). Approver screens stay in sync over WebSocket (STOMP), with quiet HTTP polling as a fallback. Lifecycle emails and scheduled reminders are sent through Office 365 SMTP.

The product is deployed as:

- an **Angular** single-page application (SPA) served by **Nginx**;
- a **Spring MVC** backend packaged as a **WAR** on **Apache Tomcat 11**;
- **PostgreSQL 17** for persistence.

Two public hostnames share the same application and database:

| Hostname | Portal | Typical audience |
|----------|--------|------------------|
| `reservation.lpulaguna.com` | Common Learning Spaces (staff portal) | Faculty, staff, organizations |
| `learnerreservation.lpulaguna.com` | Learner Reservation | Students / learners |

### Current service status

| Service | Staff landing | Learner landing | Customer booking in code | Admin / facilities UI |
|---------|---------------|-----------------|--------------------------|------------------------|
| FLT Theater (Feliciano L. Torres Theater) | Bookable | Bookable | Yes | Yes (also FLT Tech) |
| Gymnasium | Bookable | Bookable | Yes | Yes |
| University Van | Bookable | Hidden | Yes | Yes |
| Nexus Room | Card shown, disabled | Card disabled | Yes | Yes |
| Boardroom | Not shown | Hidden | Route shell only | No |
| Conference Room | Not shown | Hidden | Route shell only | No |

## 1.2 System Objectives

1. **Centralize booking** of common learning spaces and university transportation in one system instead of paper forms and ad-hoc calendars.
2. **Enforce institutional policy** in software: advance-booking windows, university email domains, OTP verification, maintenance downtime, and role-limited approval.
3. **Give facilities staff a live work queue** so pending requests appear promptly, conflicts are visible, and status changes propagate to other open sessions.
4. **Notify requestors automatically** at submit, approve, reject, cancel, coordination, and before the event date (7 / 3 / 1 day reminders).
5. **Preserve an audit trail** of administrative actions for Super Admin review.
6. **Support two audiences** (staff vs learner) from one codebase, without exposing staff-only services on the learner hostname.
7. **Produce official forms** from approved data (FLT as DOCX; Gymnasium, Nexus, and Van as PDF) without retyping.

## 1.3 System Features

**Public / customer**

- Dual landing pages selected by hostname
- Calendar with occupied, approved, and maintenance visibility
- Multi-step reservation forms with terms acceptance
- Advance-booking rules (FLT 14 days, Van 5 days, Gymnasium and Nexus 3 days)
- Email OTP (6-digit code, 10-minute lifetime) before submit
- Confirmation and lifecycle emails
- Institutional email gate: `@lpulaguna.edu.ph` or `@lpusc.edu.ph`

**Staff / administration**

- JWT login with optional 30-day remember-me
- Forgot / reset password (link expires in 1 hour)
- Super Admin, Facilities Admin, FLT Tech, and custom roles with per-service grants
- Approver queues: search, month filter, status chips, conflict highlighting
- Approve / reject / cancel / complete; Van vehicle assignment and reassign
- Coordination meeting scheduling (FLT, Gymnasium, Nexus)
- Reschedule and edit details
- Staff-created bookings (OTP skipped for authenticated staff)
- Equipment, vehicle, and driver registries
- Maintenance block scheduling
- Dashboards and pending-reservation alert balloon
- Super Admin audit logs and role management
- Client-side official form download and CSV export

**Platform**

- Real-time STOMP events after database commit
- Docker Compose stack (PostgreSQL, Tomcat, Angular production build, Nginx, optional Cloudflare Tunnel)
- UTC storage with Asia/Manila display and reminder cron

---

# 2. System Architecture and Design

## 2.1 Design principles

- **Public vs staff split.** Booking APIs under `/api/public/*` require no login. Approver APIs require JWT and role/service checks.
- **Service-scoped authorization.** A role is not a single “admin” flag. Each role is granted one or more of `FLT`, `GYMNASIUM`, `VAN`, `NEXUS`. Super Admin always has every service.
- **SPA + WAR.** The UI is a static Angular build. The API is a traditional Spring DispatcherServlet WAR (`web.xml` → `/WEB-INF/context.xml`), not a Spring Boot executable JAR, even though the Maven parent is Spring Boot 3.5.3.
- **After-commit realtime.** WebSocket events publish only after the reservation transaction commits so clients that immediately refetch do not race an uncommitted row.
- **Client-side form fill.** Official documents are generated in the browser from templates, not on the server.

## 2.2 Logical layers

| Layer | Responsibility |
|-------|----------------|
| Presentation | Angular routes, OnPush feature pages, shared UI kit, hostname portal guards |
| API | REST controllers under `/lpu-reservation-system/api` |
| Messaging | STOMP broker `/topic/reservations/{facility}` |
| Domain services | Reservation, email, OTP, role access, audit, reminders |
| Persistence | Hibernate / JDBC → PostgreSQL |
| Edge | Nginx static files + reverse proxy; optional Cloudflare Tunnel |

## 2.3 Repository layout

```
lpu-reservation-system/
├── docs/                                      # This documentation
├── frontend/frontend/                         # Angular application
│   ├── src/app/core/                          # Auth, portal hostname, app info
│   ├── src/app/features/customer/             # Public booking
│   ├── src/app/features/admin/                # Super Admin modules
│   ├── src/app/features/facilities/           # Facilities Admin modules
│   ├── src/app/features/auth/                 # Login and password reset
│   └── src/app/shared/                        # Layout and UI kit
├── backend/lpu-reservation-system/            # Spring MVC WAR
│   └── src/main/java/org/lpu/dev/codes/
│       ├── controller/  services/  repository/
│       ├── security/    config/    model/
├── data/tomcat/webapps/                       # Deployed WAR mount
├── data/web/templates/                        # Nginx config template
├── docker-compose.yml
└── .env.example
```

---

# 3. System Architecture

```
                    Staff host                         Learner host
             reservation.lpulaguna.com        learnerreservation.lpulaguna.com
                                \                     /
                                 \                   /
                                  ▼                 ▼
                           ┌─────────────────────────────┐
                           │ Nginx :80                   │
                           │ Static Angular SPA          │
                           │ Proxy /lpu-reservation-     │
                           │   system/*  and /uploads/*  │
                           └──────────────┬──────────────┘
                                          │
                           ┌──────────────▼──────────────┐
                           │ Tomcat 11  (JDK 21)         │
                           │ Context: /lpu-reservation-  │
                           │ system                      │
                           │ REST + STOMP WebSocket      │
                           │ JavaMail → Office 365       │
                           └──────────────┬──────────────┘
                                          │
                           ┌──────────────▼──────────────┐
                           │ PostgreSQL 17               │
                           │ Database: lpu_reservation   │
                           │ Clock: UTC                  │
                           └─────────────────────────────┘
```

Optional: `cloudflared` runs a tunnel in front of Nginx for off-campus access.

**Request flow**

1. The browser loads the SPA from Nginx. Hostname decides staff vs learner landing.
2. Public booking calls `/lpu-reservation-system/api/public/...`.
3. Staff login obtains a JWT. Subsequent calls send `Authorization: LpuL <token>`.
4. Nginx proxies API, WebSocket upgrade, and `/uploads/` to Tomcat.
5. Tomcat persists to PostgreSQL, sends mail, and publishes STOMP events after commit.
6. Approver UIs subscribe to facility topics and refresh lists.

Compose service names: `reservation-postgres` (network alias `postgres` for legacy JDBC URLs), `reservation-tomcat`, `reservation-angular`, `reservation-web`, `reservation-cloudflared`.

---

# 4. Technologies Used

## 4.1 Frontend

| Technology | Version / notes |
|------------|-----------------|
| Angular | ^22 |
| TypeScript | ~6.0 |
| Tailwind CSS | ^4.1 |
| RxJS | ~7.8 |
| Angular CDK / Spartan NG Brain | UI primitives |
| `@stomp/stompjs` + `sockjs-client` | Real-time |
| Luxon | Dates |
| `pdf-lib`, `docxtemplater`, `pizzip` | Form export |
| Vitest | Unit tests (`ng test`) |
| npm | 11 |

Path: `frontend/frontend/`  
API base: `/lpu-reservation-system/api`  
WebSocket: `/lpu-reservation-system/ws` (native); SockJS fallback `/ws-sockjs`

## 4.2 Backend

| Technology | Version / notes |
|------------|-----------------|
| Packaging | WAR `org.lpu.dev.codes:lpu-reservation-system` |
| Maven parent | Spring Boot 3.5.3 (WAR still deployed on Tomcat) |
| Runtime | Tomcat 11 (`tomcat:11.0.22-jdk21`) |
| Spring MVC, WebSocket, ORM, TX | Spring Framework 7.x line |
| Spring Security | web/config 6.3.x + crypto 7.x |
| JWT | jjwt 0.11.5 — scheme prefix **`LpuL `** |
| Hibernate | 7.x, `ddl-auto=update` |
| PostgreSQL JDBC | PostgreSQL 17 |
| Connection pool | c3p0 |
| Mail | Spring `JavaMailSender`, SMTP STARTTLS port 587 |
| Passwords | BCrypt |
| Tests | JUnit 5, Mockito |

Path: `backend/lpu-reservation-system/`  
Context path: `/lpu-reservation-system`

`pom.xml` sets `maven.compiler.release` to 24 while the Tomcat image is JDK 21. Align these before production hardening.

## 4.3 Infrastructure

| Component | Image / role |
|-----------|----------------|
| PostgreSQL | `postgres:17` |
| Application server | `tomcat:11.0.22-jdk21` |
| Frontend build | `node:24-alpine` — production `ng build` then `--watch` |
| Reverse proxy | `nginx:latest` |
| Optional tunnel | `cloudflare/cloudflared` |

---

# 5. Hardware Requirements

These are recommended sizes for the Docker Compose stack on a dedicated Ubuntu host. Actual load depends on concurrent admins, calendar traffic, and email volume.

## 5.1 Development workstation

| Item | Minimum | Recommended |
|------|---------|-------------|
| CPU | 2 cores | 4 cores |
| RAM | 8 GB | 16 GB |
| Disk | 20 GB free | SSD, 40 GB+ |
| Display | 1280×720 | 1920×1080 for admin tables |

## 5.2 Production / staging server (Ubuntu)

| Item | Minimum | Recommended |
|------|---------|-------------|
| CPU | 2 vCPU | 4 vCPU |
| RAM | 8 GB | 16 GB |
| Disk | 40 GB | 80 GB+ SSD (images, Tomcat logs, Postgres volume, WAR backups) |
| Network | 100 Mbps | 1 Gbps; stable outbound SMTP to Office 365 |
| Clock | NTP-synced | Required; DB and JVM set to UTC |

PostgreSQL data lives on `./data/postgres-data`. Tomcat logs and WARs live under `./data/tomcat/`. Size disk for reservation growth, vehicle images under `/uploads/`, and log retention.

---

# 6. Software Requirements

## 6.1 Server (Ubuntu 22.04 or 24.04 LTS)

| Software | Purpose |
|----------|---------|
| Ubuntu Server 22.04 or 24.04 LTS | Host OS |
| Docker Engine 24+ and Docker Compose v2 | Orchestration |
| Git | Source checkout |
| curl / openssl | Health checks and TLS (if terminating locally) |
| Optional: OpenJDK 21 + Maven 3.9+ | Building the WAR on the host instead of copying a prebuilt WAR |
| Optional: Node.js 22+ / 24 and npm 11 | Building the SPA on the host |

The recommended path is **Docker only**: the compose file already includes Postgres, Tomcat, Node build, and Nginx. You do not need to install Tomcat, Nginx, or Node on the host unless you run a non-Docker layout.

## 6.2 Client

| Software | Notes |
|----------|--------|
| Current Chrome, Edge, Firefox, or Safari | SPA + WebSocket |
| Email access | OTP and notifications |
| Institutional email | `@lpulaguna.edu.ph` or `@lpusc.edu.ph` for booking |

## 6.3 External services

| Service | Use |
|---------|-----|
| Microsoft 365 SMTP (`smtp.office365.com:587`) | OTP, lifecycle, reminders, password reset |
| Cloudflare Tunnel (optional) | Off-campus HTTPS without opening port 80/443 on campus |

---

# 7. Database Design

**Engine:** PostgreSQL 17  
**Database name:** `lpu_reservation` (default)  
**Schema evolution:** Hibernate `hbm2ddl.auto=update` plus reference SQL in `backend/lpu-reservation-system/src/main/resources/db/table.sql`  
**First start:** `PostgresDatabaseInitializer` connects to the `postgres` maintenance database and creates `lpu_reservation` if it is missing.  
**Time:** Store UTC; UI and reminder job use Asia/Manila.

Reservation date/time baskets are **JSONB** (`reserved_dates`), not normalized slot rows. Equipment requests on room facilities are also JSONB (`requested_equipment`).

## 7.1 Entity relationship (logical)

```
users ──role──► app_roles ──◄ role_service_access ►── (FLT|GYMNASIUM|VAN|NEXUS)

facilities ──► resources (equipment)
facilities ──► vehicle
driver                      (registry; van assignment uses vehicle.assigned_driver_*)

flt_reservations
gymnasium_reservations
nexus_reservations
van_reservations ──◄ van_reservation_vehicles ►── vehicle

maintenance_blocks
admin_audit_logs
reservation_reminders
```

## 7.2 Table catalog

| Table | Purpose |
|-------|---------|
| `users` | Staff accounts: username, full name, role code, email, employee ID, BCrypt `password_hash`, `ACTIVE` status, password-reset token and expiry |
| `app_roles` | Role catalog: `code` (PK), `label`, `is_system`, `home_path` |
| `role_service_access` | Composite PK `(role_code, service_code)` |
| `facilities` | Reference rows: FLT, Van, Nexus, Boardroom, Gymnasium |
| `resources` | Equipment inventory (`resource_name`, `status`, `facility_id`) |
| `vehicle` | Fleet: brand, plate, capacity, description, status, `image_url`, assigned driver name/contact |
| `driver` | Driver registry (`full_name`, `contact_number`, `status`) |
| `flt_reservations` | Theater bookings: event metadata, JSON dates/equipment, coordination fields, status, rating, `approved_at` / `approved_by` |
| `gymnasium_reservations` | Room-style bookings (attendees, equipment, coordination) |
| `nexus_reservations` | Same shape as gymnasium |
| `van_reservations` | Trip bookings: destination, passengers, dates JSON, remarks, school, requested vehicle type |
| `van_reservation_vehicles` | Many-to-many assigned vehicles (`ON DELETE CASCADE` from reservation) |
| `maintenance_blocks` | Downtime: `facility_type`, date, start/end time, reason |
| `admin_audit_logs` | Super Admin trail: `service`, `action_type`, actor, target, JSON `details` |
| `reservation_reminders` | Unique `(service, reservation_id, reserved_date, reminder_type)` |
| `allowed_reservation_emails` | Legacy table; runtime gate is domain regex, not this table |

Seed data: default Super Admin when none exists (`DefaultDataSeeder` / `SuperAdminUserService`); default roles via `RoleAccessService.ensureDefaults()`.

Facility seed names in SQL: FLT, Van, Nexus, Boardroom, Gymnasium.

---

# 8. System Operation

## 8.1 Runtime processes

| Process | What it does |
|---------|----------------|
| `reservation-postgres` | Database; UTC timezone |
| `reservation-tomcat` | Serves the WAR; REST, WebSocket, mail, scheduled reminders |
| `reservation-angular` | `npm install` then production `ng build`; `--watch` rebuilds on source change (no host port) |
| `reservation-web` | Nginx: SPA + proxy |
| `reservation-cloudflared` | Optional tunnel using `CLOUDFLARE_TUNNEL_TOKEN` |

Reminder job: cron `0 0 8 * * *` in zone `Asia/Manila` (`ReservationReminderService`). It emails requestors of **APPROVED** reservations 7, 3, and 1 day before each reserved date, and records rows in `reservation_reminders` so the same reminder is not sent twice.

## 8.2 HTTP edge

Nginx (`data/web/templates/default.conf.template`):

- `location /lpu-reservation-system/` → Tomcat, WebSocket upgrade, 86400s proxy timeouts (SockJS)
- `location /uploads/` → Tomcat (vehicle images)
- `location /` → static SPA, `try_files` → `/index.csr.html`
- `server_name`: `localhost reservation.lpulaguna.com learnerreservation.lpulaguna.com`

## 8.3 API surface (summary)

Base: `https://<host>/lpu-reservation-system/api`

**Auth:** `POST /auth/login`, `GET /auth/me`, `PUT /auth/profile`, `POST /auth/forgot-password`, `POST /auth/reset-password`

**Public:** `/public/flt`, `/public/gymnasium`, `/public/nexus`, `/public/van` (equipment/events/vehicles + `POST /reserve`); `/public/maintenance`; `/public/reservation-otp` (`/send`, `/verify`); `/health`; `/flt/survey` (HTML)

**Admin (JWT):** `/admin/flt|gymnasium|nexus|van` (list, status, coordination, reschedule, details, delete); van also approve/reassign/vehicle schedule; `/admin/maintenance`; `/admin/audit`; `/admin/roles`; `/admin/users` and related; `/admin/equipment*`; `/admin/vehicle*`

**Facilities (JWT):** `/facilities/users*`, `/facilities/equipment*`, `/facilities/drivers`

Exact signatures: `org.lpu.dev.codes.controller.*Controller`.

## 8.4 Real-time

| Item | Value |
|------|--------|
| Native WS | `/lpu-reservation-system/ws` |
| SockJS | `/lpu-reservation-system/ws-sockjs` |
| Auth | `Authorization: LpuL <token>` on STOMP CONNECT |
| Topics | `/topic/reservations/flt`, `.../gymnasium`, `.../van`, `.../nexus` |
| Events | `CREATED`, `STATUS_UPDATED` (optional `conflictedIds`, `revertedIds`) |

CONNECT is rejected unless the token is valid, the user is active, and the role has at least one service.

## 8.5 Reservation statuses

| Status | Meaning |
|--------|---------|
| `PENDING` | Awaiting decision |
| `APPROVED` | Accepted (Van includes assigned vehicle(s)) |
| `REJECTED` | Declined |
| `CANCELLED` | Cancelled |
| `COMPLETED` | Event/trip finished |
| `CONFLICT` | Overlap; may revert to `PENDING` when the blocker is cleared |

---

# 9. System Workflow

## 9.1 Public booking (customer)

1. Open the correct host. Learner host shows FLT and Gymnasium only.
2. Choose a facility card.
3. Review the calendar (approved events and maintenance).
4. Select date/time slots no earlier than the advance window.
5. Complete the form (event or trip details; equipment where applicable).
6. Accept terms.
7. Request OTP → email receives a 6-digit code (10 minutes; 30-second resend cooldown; 5 invalid attempts then must request a new code).
8. Verify code → server returns a one-time OTP token (15 minutes).
9. Submit reservation with that token → `PENDING` → confirmation email.
10. Staff review (below). Requestor receives approve / reject / cancel / coordination / reminder mail as applicable.

Staff creating a booking from the admin “new reservation” screen send a JWT and **skip OTP**.

## 9.2 Staff login

1. Open `/login` (or Admin Login on the landing page).
2. Authenticate. Optional remember-me: JWT TTL **30 days** vs default **2 hours**. Token stored in `localStorage` or `sessionStorage` under `lpul_token`.
3. Redirect to role `home_path` (`/dashboard`, `/facilities/dashboard`, `/flt-tech/dashboard`, or a custom path).
4. Angular guards call `/auth/me` to validate the session. HTTP 401 clears the session.

Forgot password: `POST /auth/forgot-password` emails a link based on `app.frontend.url`. The link is valid for **1 hour**.

## 9.3 Approval (room facilities: FLT, Gymnasium, Nexus)

1. Approver opens the service queue (nav filtered by granted services).
2. Filter by month, search, or status. Pending items sort first.
3. Approve, reject, or (later) cancel / complete. FLT Tech cannot approve or reject pending items; they may complete or cancel approved FLT bookings.
4. After approve, set a **coordination** meeting slot.
5. Optional: reschedule, edit details, download official form, export CSV.
6. Hard delete is Super Admin only.
7. STOMP `STATUS_UPDATED` refreshes other open clients. Conflicts may mark overlapping pending rows `CONFLICT`.

## 9.4 Approval (University Van)

Same queue pattern, plus:

1. Approve opens an assignment modal: one or more **vehicles** (drivers come from each vehicle’s assigned driver fields).
2. Reassign vehicles later if needed.
3. Vehicle schedule endpoint helps avoid double-booking a van.

## 9.5 Maintenance

Administrators plot date/time blocks per facility type. Public calendars treat those intervals as unavailable.

## 9.6 Reminders

Daily 08:00 Asia/Manila: for each approved reservation date that is 7, 3, or 1 day ahead, send a cancel-or-penalize reminder if that `(service, reservation, date, type)` has not already been recorded.

---

# 10. Security

## 10.1 Authentication and sessions

- Custom bearer scheme: `Authorization: LpuL <jwt>`.
- JWT claims include username (`sub`), `role`, and `rememberMe`.
- Default TTL 2 hours; remember-me 30 days.
- Passwords hashed with BCrypt.
- Inactive users (`status` not `ACTIVE`) are rejected on API and WebSocket.
- Password reset tokens are time-limited (1 hour).

## 10.2 Authorization

- Angular route guards: `authGuard`, `superAdminGuard`, `facilitiesGuard`, `fltTechGuard`, `serviceGuard(code)`, `guestGuard`.
- Backend controllers parse the JWT and check role and/or `RoleAccessService.roleHasService`.
- Super Admin and FLT Tech role codes are **system-locked** (cannot be deleted or have core identity rewritten).
- Public booking is not authenticated; it is gated by OTP + university email domain.
- Learner hostname: `staffPortalServicesGuard` blocks Van, Nexus, Boardroom, and Conference routes.

## 10.3 Public booking controls

- OTP code: 10 minutes, 5 attempts, 30-second resend cooldown; in-memory maps (codes are lost on Tomcat restart).
- OTP token: 15 minutes, single use, must match contact email on `POST /reserve`.
- Email must match `^[a-z0-9._%+-]+@(lpulaguna|lpusc)\.edu\.ph$`.

## 10.4 Transport and uploads

- Production should terminate TLS at Cloudflare or a campus reverse proxy. Compose Nginx listens on port 80.
- Multipart uploads max 10 MB (`spring.servlet.multipart`).
- Vehicle images served only under `/uploads/`.

## 10.5 Known hardening gaps (treat as follow-up)

- CSRF is disabled (stateless API).
- Many controllers use `@CrossOrigin("*")`.
- JWT signing secret and SMTP/JDBC credentials currently live in source/`application.properties` — move to environment or a secret store; rotate if they were ever committed.
- `pom.xml` Tomcat Maven plugin profiles contain manager URLs and passwords — do not treat as documentation of production credentials.
- Compiler release 24 vs Tomcat JDK 21 mismatch.

---

# 11. System Testing and Evaluation

## 11.1 Tooling

| Layer | Tool |
|-------|------|
| Frontend unit | Vitest (`ng test` in `frontend/frontend`) |
| Backend unit | JUnit 5 + Mockito in the WAR module |
| Typecheck | TypeScript / `tsc` |
| Manual / UAT | Staff and learner hosts, three live facilities, admin queues |

Automated end-to-end tests are not a documented baseline. Evaluate against the checklist below before release.

## 11.2 Acceptance checklist

- [ ] Staff landing: Van, FLT, Gymnasium bookable; Nexus not bookable until the card is enabled
- [ ] Learner host: FLT and Gymnasium only; Van/Nexus URLs redirect to `/customer`
- [ ] OTP-gated submit for each live facility; non-university email rejected
- [ ] Advance windows enforced in the UI (14 / 5 / 3 / 3 days)
- [ ] Super Admin and Facilities Admin can approve, reject, cancel, complete
- [ ] Van approval assigns one or more vehicles
- [ ] FLT / Gymnasium coordination can be set (Nexus too, if enabling public booking)
- [ ] Maintenance blocks appear on customer calendars
- [ ] Approver lists update via WebSocket and stay correct after refresh
- [ ] Confirm / approve / reject / cancel emails send
- [ ] Reminder job would send at 08:00 Asia/Manila for approved upcoming dates
- [ ] Audit log records Super Admin–visible actions
- [ ] Form download produces filled FLT (DOCX) and Gym / Van / Nexus (PDF)
- [ ] FLT Tech: FLT only; cannot approve/reject pending
- [ ] Custom roles see only granted services
- [ ] Forgot-password flow completes with a fresh password

## 11.3 Evaluation notes

Success is operational, not only functional: pending queues stay current, mail is delivered, calendars do not accept downtime or overlapping approved slots, and learner users cannot reach staff-only services.

---

# 12. Installation / Deployment Guide (Ubuntu)

This guide deploys the **Docker Compose** stack on Ubuntu Server 22.04 or 24.04 LTS. Commands assume a sudo-capable user.

## 12.1 Prepare the host

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git ca-certificates curl
```

Install Docker Engine and the Compose plugin using Docker’s official Ubuntu instructions:  
<https://docs.docker.com/engine/install/ubuntu/>

```bash
sudo usermod -aG docker "$USER"
# log out and back in so the docker group applies
docker compose version
```

Enable NTP (usually already on):

```bash
timedatectl
```

Open firewall only as required. Typical patterns:

- Campus-only: allow port 80 from internal networks.
- Cloudflare Tunnel: no public 80/443; tunnel token only.

```bash
sudo ufw allow OpenSSH
# sudo ufw allow 80/tcp   # only if Nginx should be reached directly
sudo ufw enable
```

## 12.2 Get the source

```bash
sudo mkdir -p /opt/lpu
sudo chown "$USER":"$USER" /opt/lpu
cd /opt/lpu
git clone <repository-url> lpu-reservation-system
cd lpu-reservation-system
```

## 12.3 Environment file

```bash
cp .env.example .env
nano .env
```

Set at least:

| Variable | Meaning |
|----------|---------|
| `POSTGRES_USER` | Database user |
| `POSTGRES_PASSWORD` | Strong password |
| `POSTGRES_DB` | `lpu_reservation` |
| `POSTGRES_PORT` | Host port mapped to 5432 (avoid exposing 5432 publicly) |
| `BACKEND_URL` | `http://reservation-tomcat:8080` inside Compose |
| `CLOUDFLARE_TUNNEL_TOKEN` | Optional; omit the cloudflared service if unused |

Also configure backend mail, JDBC, JWT, and `app.frontend.url` in the WAR’s `application.properties` (or equivalent externalized config) **before** building/copying the WAR. Do not commit production secrets.

Ensure JDBC host is `reservation-postgres` (or alias `postgres`).

## 12.4 Deploy the backend WAR

Compose mounts `./data/tomcat/webapps` into Tomcat. Place `lpu-reservation-system.war` there (filename must match the context path).

On a build machine with JDK 21 and Maven:

```bash
cd backend/lpu-reservation-system
mvn -DskipTests package
cp target/lpu-reservation-system.war /opt/lpu/lpu-reservation-system/data/tomcat/webapps/
```

Keep older WARs under `data/tomcat/war-backups/` if you already use that convention.

## 12.5 Start the stack

```bash
cd /opt/lpu/lpu-reservation-system
docker compose up -d
docker compose ps
docker compose logs -f --tail=80 reservation-tomcat
```

First Angular production build can take several minutes (`reservation-angular`). Nginx serves files from `frontend/frontend/dist/frontend/browser` once they exist.

## 12.6 Verify

```bash
curl -sS http://127.0.0.1/lpu-reservation-system/api/health
# Browser: http://<server>/customer
```

Confirm:

- Landing page loads
- Login works for a Super Admin account
- OTP email arrives on a test booking
- WebSocket: approve a booking in one browser and see the list update in another

DNS: point `reservation.lpulaguna.com` and `learnerreservation.lpulaguna.com` at this host or at Cloudflare.

## 12.7 Optional Cloudflare Tunnel

Set `CLOUDFLARE_TUNNEL_TOKEN` in `.env` and start `reservation-cloudflared`. In Cloudflare Zero Trust, route both public hostnames to the tunnel’s HTTP service on `reservation-web:80`.

## 12.8 Local development (not production)

```bash
# Tomcat with WAR on :8080, context /lpu-reservation-system
cd frontend/frontend
npm install
# Repo-root .env: BACKEND_URL=http://localhost:8080
npm start
```

Angular CLI: port **4200**. Do not set env `PORT` (conflicts with the CLI). Use `SSR_PORT` for the SSR Node server only.

## 12.9 Updates

```bash
cd /opt/lpu/lpu-reservation-system
git pull
# rebuild WAR, copy to data/tomcat/webapps/
docker compose up -d --build
# Angular container rebuilds on source bind-mount; hard refresh browsers after dist updates
```

---

# 13. System Administration and Maintenance

Day-to-day operators use the admin SPA. Host operators use Docker, Postgres dumps, and Tomcat logs.

Useful log locations:

- Compose: `docker compose logs -f reservation-tomcat reservation-web reservation-postgres`
- Host bind: `data/tomcat/logs/`

## 13.1 Troubleshooting

| Symptom | Likely cause | What to check |
|---------|--------------|---------------|
| SPA loads, API 404 | WAR not exploded / wrong context | `data/tomcat/webapps/lpu-reservation-system.war`; Tomcat logs; URL must include `/lpu-reservation-system/api` |
| Blank page / old UI | Dist not built or browser cache | `reservation-angular` logs; `frontend/frontend/dist/frontend/browser`; hard refresh |
| Login fails | Wrong password, inactive user, JWT/clock | User `status`; host NTP; backend logs |
| 401 on admin pages | Missing `LpuL` header or expired JWT | Login again; 2-hour session unless remember-me |
| WebSocket never updates | Proxy or CONNECT auth | Nginx upgrade headers; token on CONNECT; role has a service; fallback polling should still work |
| OTP email not received | SMTP credentials, spam, debug | `spring.mail.*`; Office 365 mailbox; Tomcat mail logs (`mail.debug`) |
| “Wait before requesting another code” | 30-second cooldown | Wait and retry |
| OTP fails after Tomcat restart | In-memory OTP maps cleared | Request a new code |
| Calendar slot blocked | Approved overlap or maintenance | Admin calendar / maintenance list |
| Van approve disabled | No vehicle selected / capacity | Vehicle registry and availability |
| Learner cannot open Van | By design | Use staff host or FLT/Gym only |
| Database connection errors | Postgres not healthy / wrong JDBC host | `docker compose ps`; JDBC URL host `reservation-postgres`; volume permissions |
| Disk full | Logs, images, WAL | `data/tomcat/logs`, `data/postgres-data`, `/uploads` |
| Port 80 in use | Another Nginx/Apache | `ss -tlnp \| grep ':80'` |

Health: `GET /lpu-reservation-system/api/health`.

## 13.2 User roles and permissions

Canonical seeded roles:

| Role | Locked | Home | Services | UI |
|------|--------|------|----------|-----|
| `SUPERADMIN` | Yes | `/dashboard` | All | Users, roles, equipment, vehicles, all reservation queues, all audit logs |
| `FACILITIESADMIN` | No | `/facilities/dashboard` | All by default | Facilities users, equipment, vehicles, scheduling for granted services |
| `FLTTECH` | Yes | `/flt-tech/dashboard` | FLT | FLT dashboard and FLT queue; **cannot approve/reject pending** |
| `NEXUSADMIN` | No | `/facilities/dashboard` | NEXUS | Facilities shell, Nexus scheduling |
| `EOADMIN` | No | `/eo/dashboard` | None | **No routed UI yet** |

Super Admin may create **custom roles** (`/roles`): label, home path, service set. Angular `usesFacilitiesShell()` treats non–Super Admin / non–FLT Tech users with `/facilities` home (or with services) as facilities-shell users.

| Capability | Super Admin | Facilities Admin | FLT Tech | Custom (example: Nexus only) |
|------------|-------------|------------------|----------|------------------------------|
| Public booking (as visitor) | Yes | Yes | Yes | Yes |
| Manage all users | Yes | Facilities-scoped users | No | No |
| Manage roles | Yes | No | No | No |
| Equipment / vehicles | Yes | Yes | No | Per shell; typically facilities |
| FLT approve/reject | Yes | If FLT granted | **No** | If FLT granted |
| FLT complete/cancel | Yes | If FLT granted | Yes (approved) | If FLT granted |
| Gym / Van / Nexus queues | Yes | If granted | No | If granted |
| Audit logs | Yes | No | No | No |
| Hard-delete reservation | Yes | No | No | No |
| WebSocket subscribe | Yes | If any service | Yes (FLT) | If any service |

Customers have **no staff role**. They only use public routes and public APIs.

## 13.3 Backup and recovery

**What to back up**

1. PostgreSQL data (reservations, users, roles, inventories, audit, reminders).
2. Uploaded files (vehicle images under Tomcat `/uploads`).
3. Current WAR and Nginx/env configuration (`.env` is secret; keep offline).
4. Optional: `data/tomcat/war-backups/`.

Do **not** rely on OTP in-memory state; it is not durable.

**Logical backup (recommended daily)**

```bash
cd /opt/lpu/lpu-reservation-system
mkdir -p /opt/lpu/backups
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
docker compose exec -T reservation-postgres \
  pg_dump -U "$POSTGRES_USER" -d lpu_reservation -Fc \
  > "/opt/lpu/backups/lpu_reservation-${STAMP}.dump"
```

Copy uploads (adjust if Tomcat stores them only inside the container; this repo proxies `/uploads/` to Tomcat):

```bash
tar -czf "/opt/lpu/backups/uploads-${STAMP}.tgz" data/tomcat/webapps/
```

Encrypt and copy backups off-host. Retain according to MIS policy (for example 7 daily + 4 weekly).

**Restore**

1. Stop Tomcat to avoid writes: `docker compose stop reservation-tomcat`.
2. Restore the dump into an empty or replaced `lpu_reservation` database (`pg_restore`).
3. Restore uploads/WAR files.
4. Start Tomcat: `docker compose start reservation-tomcat`.
5. Log in and spot-check a known reservation, a vehicle image, and `/api/health`.

**Volume note:** Postgres uses `./data/postgres-data`. A filesystem snapshot of that directory is a crash-consistent backup only if Postgres is stopped or you use `pg_dump`. Prefer `pg_dump`.

**Hibernate `ddl-auto=update`:** restores bring schema with the data; still keep `db/table.sql` in version control as the documented shape.

---

# 14. User Manual

## 14.1 Requestors (faculty, staff, students, organizations)

**Where to go**

- Staff / organizations: `https://reservation.lpulaguna.com`
- Learners: `https://learnerreservation.lpulaguna.com`

**Book a facility**

1. Click the facility card (Van is staff-host only).
2. Read any terms page if prompted.
3. Use the calendar to pick allowed dates and times. Gray or occupied slots cannot be booked. Maintenance windows are blocked.
4. Enter event or trip details. Van: destination, passengers, vehicle type as required. Room facilities: attendees and equipment as required.
5. Use a university email (`@lpulaguna.edu.ph` or `@lpusc.edu.ph`) and a reachable phone number.
6. Send the verification code, open email, enter the 6-digit OTP (valid 10 minutes).
7. Submit. Watch for a confirmation email. Status remains pending until an administrator acts.

**After submit**

- Approved room events may include a **coordination meeting** — attend as instructed in email.
- You may receive reminders 7, 3, and 1 day before the reserved date.
- For questions about a pending request, contact Facilities / FLT according to campus procedure (requestors cannot log into admin screens).

**Advance notice**

| Facility | Book at least |
|----------|----------------|
| FLT Theater | 14 days ahead |
| University Van | 5 days ahead |
| Gymnasium | 3 days ahead |
| Nexus Room | 3 days ahead (when the landing card is enabled) |

## 14.2 Sign in (administrators and FLT Tech)

1. Click **Admin Login** or open `/login`.
2. Enter username and password. Optionally enable remember me (30 days).
3. You are sent to your home dashboard.

**Forgot password:** use the link on the login page, enter your account email, then set a new password from the emailed link (1 hour).

**Profile:** open the account control in the side navigation to update display name, email, or password (current password required to change password).

## 14.3 Super Admin

Typical left navigation: Dashboard, Users, Roles, Equipments, Vehicles, Reservation (per service), Audit (per service and for maintenance/users/equipment/vehicles).

- **Users:** create staff, reset passwords, toggle active.
- **Roles:** create roles and attach FLT / Gymnasium / Van / Nexus.
- **Equipments / Vehicles:** inventory used by booking forms and Van assignment.
- **Reservation queues:** decide pending requests; plot coordination; reschedule; download forms.
- **Audit:** who changed what.
- **Dashboard:** calendar/summary across services; maintenance plotting.

## 14.4 Facilities Admin (and custom facilities-shell roles)

Navigation: Dashboard, Users (facilities-scoped), Equipments, Vehicles, Scheduling (only granted services).

Same approval actions as Super Admin on those queues, except role catalog, global user admin, audit logs, and reservation hard-delete.

## 14.5 FLT Tech

Navigation: Dashboard, FLT Theater only.

Use this to mark events completed or cancelled after they were approved. You will be denied if you try to approve or reject a pending request.

## 14.6 Approver actions (all queues)

- **Status chips** filter All / Pending / Approved / Rejected / Cancelled / Completed.
- **Search** and **month** narrow the list.
- **Approve / Reject** on pending items (not FLT Tech).
- **Van approve** requires selecting available vehicle(s).
- **Coordination** after room approval.
- **Reschedule** and **edit details** when plans change.
- **Complete / Cancel** when the event or trip is finished or called off.
- **Download form** for the official paper trail.
- A **notification balloon** may appear for pending items; the first click on the page may ask for browser notification permission and enables alert sound.

---

# 15. Documentation

| Artifact | Location |
|----------|----------|
| This technical document | `docs/TECHNICAL-DOCUMENTATION.md` |
| Historical Phase 1 snapshot | `docs/TECHNICAL-DOCUMENTATION-V2-PHASE-1.md` |
| Compose and env template | `docker-compose.yml`, `.env.example` |
| Nginx template | `data/web/templates/default.conf.template` |
| Schema reference SQL | `backend/lpu-reservation-system/src/main/resources/db/table.sql` |
| Angular app version / release notes | `frontend/frontend/src/app/core/app-info.ts`, in-app **About** (`/about`) |
| Frontend README | `frontend/frontend/README.md` |
| Legacy admin design notes | `frontend/ADMIN_DASHBOARD_README.md` (may not match current routes) |

**API detail:** controller classes under `backend/lpu-reservation-system/src/main/java/org/lpu/dev/codes/controller/`.  
**Role rules:** `RoleAccessService` (backend) and `frontend/frontend/src/app/core/auth/roles.ts`.  
**Portal hostname:** `frontend/frontend/src/app/core/portal.ts`.

When landing exposure, roles, APIs, or deployment topology change, update this file in the same pull request.

---

# 16. Acknowledgements

This system is developed and maintained by the **Management Information Systems (MIS) Department** of **Lyceum of the Philippines University – Laguna** for Facilities, FLT Theater operations, and related campus units.

The MIS team acknowledges:

- Facilities and FLT technical staff who defined booking rules, coordination practice, and van assignment;
- Faculty, staff, students, and accredited organizations who use the public portals;
- Campus network and Microsoft 365 administrators who enable SMTP and (where used) Cloudflare Tunnel;
- Open-source projects that the stack depends on, including Angular, Spring, PostgreSQL, Tomcat, Nginx, and Docker.

© 2026 LPU – Laguna. All rights reserved.

---

## Document control

| Field | Value |
|-------|--------|
| Title | LPU Laguna Online Reservation System — Technical Documentation |
| Version described | Application 1.0.0 |
| Related paths | `frontend/frontend`, `backend/lpu-reservation-system`, `docker-compose.yml` |
