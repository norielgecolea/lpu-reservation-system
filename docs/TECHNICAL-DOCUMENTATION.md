# LPU Laguna Reservation System

**Product:** Online Reservation System  
**Institution:** Lyceum of the Philippines University – Laguna  
**Maintainer:** Management Information Systems (MIS) Department  
**Document type:** Technical documentation  
**Audience:** Developers, MIS, facilities operations  
**Source of truth:** Implemented code in this repository  
**Supersedes:** `docs/TECHNICAL-DOCUMENTATION-V2-PHASE-1.md`

This document describes the system as implemented today: dual public portals, four bookable services in the backend (FLT, Gymnasium, Van, Nexus), role-and-service access control, JWT staff auth, WebSocket live updates, email lifecycle plus scheduled reminders, and Docker Compose deployment behind Nginx.

---

## 1. Overview

The LPU Reservation System is a web application that lets faculty, staff, students, and accredited organizations request facility and vehicle reservations, and lets authorized administrators review, approve, coordinate, reschedule, and close those requests.

Public users book without an account. Staff authenticate with JWT. Approver screens stay in sync over STOMP/WebSocket, with quiet HTTP polling as a fallback. Lifecycle emails go out through Office 365 SMTP. Official forms can be downloaded in the browser (FLT as DOCX; Gymnasium, Nexus, and Van as PDF).

### 1.1 Live vs implemented vs deferred

| Service | Public landing (staff host) | Learner host | Customer flow in code | Admin / facilities shell |
|---------|----------------------------|--------------|----------------------|--------------------------|
| **FLT Theater** | Bookable | Bookable | Yes | Yes (also FLT Tech) |
| **Gymnasium** | Bookable | Bookable | Yes | Yes |
| **University Van** | Bookable | Hidden | Yes | Yes |
| **Nexus Room** | Card present but disabled | Card disabled | Yes (route + API) | Yes |
| **Boardroom** | Not shown (commented) | Hidden | Route shell only | No |
| **Conference Room** | Not shown (commented) | Hidden | Route shell only | No |

**Also implemented**

- Super Admin, Facilities Admin, FLT Tech shells
- Custom roles with per-service access (`app_roles` + `role_service_access`)
- Equipment, vehicle, and driver registries
- Maintenance block scheduling
- Institutional-domain email gate (`@lpulaguna.edu.ph` or `@lpusc.edu.ph`)
- OTP verification on public reservation submit
- Superadmin audit logs (reservations, maintenance, users, equipment, vehicles)
- Operational dashboards and pending-reservation alert balloon
- Scheduled cancel-or-penalize reminders (7 / 3 / 1 day before)
- Staff-created reservations (admin “new reservation” routes)
- Dual hostname portals: staff vs learner

**Deferred / incomplete**

| Item | Notes |
|------|--------|
| Nexus on landing | Backend, customer stepper, and admin pages exist; landing cards are still disabled |
| Boardroom / Conference | Customer routes exist; landing hidden; no dedicated admin APIs |
| `EOADMIN` | Seeded role with home `/eo/dashboard`; no routed UI |
| `NEXUSADMIN` | Seeded; uses facilities shell and Nexus service only |
| `allowed_reservation_emails` table | Present in SQL; no live allow-list CRUD UI/API — domain regex replaced it |
| Some dashboard analytics | Copy in About/release notes; coverage varies by service |

### 1.2 Dual public portals

| Host | Landing | Bookable from landing |
|------|---------|------------------------|
| `reservation.lpulaguna.com` (and local / other hosts) | Staff “Common Learning Spaces” | Van, FLT, Gymnasium (Nexus card disabled) |
| `learnerreservation.lpulaguna.com` | Learner landing | FLT and Gymnasium only |

On the learner hostname, Angular `staffPortalServicesGuard` redirects Van, Nexus, Boardroom, and Conference routes back to `/customer`. Nginx `server_name` includes both hosts.

---

## 2. System architecture

```
┌──────────────────────┐
│ Browser              │
│ staff or learner     │
│ hostname             │
└──────────┬───────────┘
           │ :80
           ▼
┌──────────────────────┐     ┌─────────────────────────┐
│ Nginx                │────▶│ Angular static SPA      │
│ reverse proxy        │     │ dist/frontend/browser   │
└──────────┬───────────┘     └─────────────────────────┘
           │ /lpu-reservation-system/*
           │ /uploads/*
           ▼
┌──────────────────────┐     ┌─────────────────────────┐
│ Tomcat 11            │────▶│ PostgreSQL 17           │
│ WAR context          │     │ lpu_reservation         │
│ /lpu-reservation-    │     │ clocks stored UTC       │
│ system               │     └─────────────────────────┘
└──────────┬───────────┘
           │ SMTP Office 365
           │ STOMP /topic/reservations/*
           ▼
┌──────────────────────┐
│ Email + staff UIs    │
└──────────────────────┘
```

Optional: `cloudflared` tunnels the Nginx service for off-campus access.

**Request flow**

1. Public users hit the Angular SPA (landing → facility calendar → multi-step form → OTP → submit).
2. Nginx serves the SPA and proxies API, WebSocket, and upload traffic to Tomcat.
3. The Spring MVC WAR authenticates JWT-bearing staff requests (`Authorization: LpuL <token>`), persists via Hibernate/JDBC to PostgreSQL, publishes STOMP events after commit, and sends mail.
4. Admin UIs subscribe to facility-specific topics and refresh lists live.
5. A daily 08:00 Asia/Manila job sends upcoming-reservation reminders.

**Time model:** PostgreSQL and Tomcat run UTC. The application stores UTC wall times; UI and reminder cron use Asia/Manila.

---

## 3. Technology stack

### 3.1 Frontend

| Technology | Version / notes |
|------------|-----------------|
| Angular | ^22 (SPA; SSR build exists but Nginx serves CSR `index.csr.html`) |
| TypeScript | ~6.0 |
| Tailwind CSS | ^4.1 |
| RxJS | ~7.8 |
| UI primitives | Spartan NG Brain + Angular CDK |
| Real-time | `@stomp/stompjs` + `sockjs-client` |
| Dates | Luxon |
| Form export | `pdf-lib`, `docxtemplater`, `pizzip` |
| Package manager | npm 11 |

**Path:** `frontend/frontend/`  
**API base:** `/lpu-reservation-system/api`  
**WebSocket:** `/lpu-reservation-system/ws` (native; SockJS fallback `/ws-sockjs`)

### 3.2 Backend

| Technology | Version / notes |
|------------|-----------------|
| Packaging | WAR (`org.lpu.dev.codes:lpu-reservation-system`) |
| Parent | Spring Boot 3.5.3 (WAR still deployed on Tomcat, not as a Boot fat JAR) |
| Runtime | Tomcat 11 (`tomcat:11.0.22-jdk21`) |
| Spring MVC / WebSocket / ORM | Spring Framework 7.x line via parent + explicit deps |
| Spring Security | web/config 6.3.x + crypto 7.x |
| JWT | jjwt 0.11.5 — header prefix **`LpuL `** |
| ORM | Hibernate 7.x, `ddl-auto=update` |
| Database | PostgreSQL 17 |
| Connection pool | c3p0 |
| Mail | Spring `JavaMailSender` → Office 365 SMTP (`smtp.office365.com:587`, STARTTLS) |
| Passwords | BCrypt |

**Path:** `backend/lpu-reservation-system/`  
**Context path:** `/lpu-reservation-system`

`pom.xml` sets `maven.compiler.release` to 24 while the Tomcat image is JDK 21 — align the toolchain before production hardening.

### 3.3 Infrastructure

| Component | Image / role |
|-----------|----------------|
| PostgreSQL | `postgres:17` (compose service `reservation-postgres`, network alias `postgres`) |
| Application server | `tomcat:11.0.22-jdk21` |
| Frontend build | `node:24-alpine` — production `ng build` then `--watch` |
| Reverse proxy | `nginx:latest` |
| Optional tunnel | `cloudflare/cloudflared` |

Orchestration: `docker-compose.yml` at repository root.  
Environment template: `.env.example`.

---

## 4. Repository layout

```
lpu-reservation-system/
├── docs/                                      # This documentation
├── frontend/
│   └── frontend/                              # Angular application
│       ├── src/app/
│       │   ├── core/auth/                     # JWT, guards, roles, interceptor
│       │   ├── core/portal.ts                 # Learner vs staff hostname
│       │   ├── features/
│       │   │   ├── auth/                      # Login, forgot/reset password
│       │   │   ├── customer/                  # Public reservation UX
│       │   │   ├── admin/                     # Superadmin modules
│       │   │   └── facilities/                # Facilities Admin modules
│       │   └── shared/                        # Layout, UI kit, utilities
│       ├── proxy.conf.js                      # Dev proxy → BACKEND_URL
│       └── public/                            # Static assets / form templates
├── backend/
│   └── lpu-reservation-system/                # Spring MVC WAR
│       └── src/main/java/org/lpu/dev/codes/
│           ├── controller/
│           ├── services/
│           ├── repository/
│           ├── security/
│           ├── config/
│           └── model/
├── data/
│   ├── postgres/init/                         # DB bootstrap
│   ├── tomcat/webapps/                        # Deployed WAR mount
│   └── web/templates/                         # Nginx config template
├── docker-compose.yml
└── .env.example
```

---

## 5. Roles and access control

### 5.1 Canonical roles (seeded)

| Role | System-locked | Home path | Default services |
|------|---------------|-----------|------------------|
| `SUPERADMIN` | Yes | `/dashboard` | FLT, GYMNASIUM, VAN, NEXUS (always all) |
| `FACILITIESADMIN` | No | `/facilities/dashboard` | All four |
| `FLTTECH` | Yes | `/flt-tech/dashboard` | FLT only |
| `NEXUSADMIN` | No | `/facilities/dashboard` | NEXUS only |
| `EOADMIN` | No | `/eo/dashboard` | None (no UI yet) |

Superadmin can create additional roles (`POST /api/admin/roles`) with a label, home path, and a set of service codes. Locked system roles (`SUPERADMIN`, `FLTTECH`) cannot be deleted or have their core identity rewritten.

### 5.2 Service codes

Bookable admin services a role may access:

`FLT` | `GYMNASIUM` | `VAN` | `NEXUS`

Frontend `serviceGuard('FLT')` (and siblings) hide reservation child routes the user cannot access. Backend admin controllers check `RoleAccessService.roleHasService(...)`. Superadmin always has every service.

### 5.3 Authorization model

- **Customers:** unauthenticated public flows under `/customer/*` and `/api/public/*`.
- **Staff:** JWT required. Clients send `Authorization: LpuL <token>`. The Angular interceptor attaches this header; 401 responses log the user out.
- **FLT Tech** may manage FLT reservations but **cannot approve or reject** pending requests. Allowed status transitions are complete or cancel of already-approved items.
- **WebSocket CONNECT** requires a valid `LpuL` token, an active user, and a role that has at least one service (`roleHasAnyService`).
- **Hard deletes** of reservations are Superadmin-only on the admin controllers.
- Spring Security is configured **stateless** with CSRF disabled; most authorization is **imperative inside controllers** (JWT parse + role/service checks), not HTTP matcher rules.

### 5.4 Frontend route groups

| Area | Example paths |
|------|----------------|
| Public | `/` → `/customer`, `/customer/flt`, `/customer/gymnasium`, `/customer/van`, `/customer/nexus-room`, terms pages, `/about` |
| Auth | `/login`, `/forgot-password`, `/reset-password` |
| Superadmin | `/dashboard`, `/users`, `/roles`, `/equipments`, `/vehicles`, `/reservation/{flt\|gymnasium\|nexus\|van}`, `/audit/{flt\|gymnasium\|nexus\|van\|maintenance\|users\|equipments\|vehicles}` |
| Facilities | `/facilities/dashboard`, `/facilities/users`, `/facilities/equipments`, `/facilities/vehicles`, `/facilities/reservation/{flt\|gymnasium\|nexus\|van}` |
| FLT Tech | `/flt-tech/dashboard`, `/flt-tech/reservation/flt` |

`usesFacilitiesShell()` also admits **custom roles** whose `homePath` starts with `/facilities` (or who have services and are not Superadmin/FLT Tech).

---

## 6. Functional modules

### 6.1 Customer reservation flow

Common pattern for FLT, Gymnasium, Van, and Nexus:

1. Select facility from the appropriate landing page.
2. Browse calendar (occupied / approved / maintenance visibility).
3. Build a date/time basket subject to **advance-booking rules**.
4. Complete the multi-step form (event or trip details, equipment where applicable, terms).
5. Verify email via OTP (`/api/public/reservation-otp/send` then `/verify`).
6. Submit with the OTP token → status `PENDING` → confirmation email.
7. Staff JWT sessions may skip OTP where admin-created bookings are used.

**Advance notice (customer UI)**

| Service | Minimum advance |
|---------|-----------------|
| FLT | 14 days |
| Van | 5 days |
| Gymnasium | 3 days |
| Nexus | 3 days |

**Van-specific:** destination, passengers, requested vehicle type, school (`LPU-L` default); approval assigns one or more vehicles (and their assigned drivers).  
**FLT / Gymnasium / Nexus-specific:** equipment requests; coordination meeting after approval; conflict detection against approved/completed slots.

**Email gate:** contact email must be `@lpulaguna.edu.ph` or `@lpusc.edu.ph` (`AllowedReservationEmailService` / frontend `isUniversityEmail`).

### 6.2 Admin / facilities approver flow

Approver pages provide:

- Month filter, search, and status chips (`All`, `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`, `COMPLETED`)
- Desktop tables and mobile layouts; conflict highlighting
- Approve / reject / cancel / complete
- Van: approve modal (vehicle assignment) and reassign
- Coordination calendar (FLT, Gymnasium, Nexus)
- Reschedule calendar
- Edit reservation details
- Maintenance block management (from dashboard/calendars)
- CSV export
- Official form download
- Admin-created bookings (`/reservation/{service}/new`)

Pending items sort first. Overlaps against approved/completed (and coordination slots for room facilities) are highlighted.

### 6.3 Supporting registries

| Module | Purpose |
|--------|---------|
| **Users** | Create/update/toggle staff accounts (superadmin; facilities-scoped users for Facilities Admin) |
| **Roles** | Superadmin CRUD of `app_roles` and service grants |
| **Equipments** | Inventory linked to facilities (FLT / Gymnasium / Nexus) |
| **Vehicles** | Fleet registry; images under `/uploads/`; optional assigned driver name/contact |
| **Drivers** | Driver registry for van operations (`/api/facilities/drivers`) |
| **Maintenance** | Date/time blocks that close a facility for booking |
| **Audit** | Superadmin action history (`admin_audit_logs`) |
| **Dashboard** | Calendar/summary of reservations + maintenance for services the role can see |
| **Alert balloon** | In-app pending-reservation awareness (audio unlock on first gesture) |

### 6.4 Notifications

| Channel | When |
|---------|------|
| Reservation OTP email | Public submit verification |
| Lifecycle emails (FLT / Gym / Van / Nexus) | Confirm, approve, reject, cancel, coordination (room facilities), satisfaction/thank-you where implemented |
| Reminder emails | 7, 3, and 1 day before each **approved** reserved date (08:00 Asia/Manila); de-duplicated in `reservation_reminders` |
| Password reset email | Forgot-password flow (`app.frontend.url` for the link base) |
| WebSocket topics | Live list refresh for approvers |
| In-app alert balloon | Pending reservation awareness for staff |

---

## 7. Reservation status model

Shared lifecycle:

| Status | Meaning |
|--------|---------|
| `PENDING` | Awaiting admin decision |
| `APPROVED` | Accepted (Van includes assigned vehicle(s)) |
| `REJECTED` | Declined |
| `CANCELLED` | Cancelled by staff or process |
| `COMPLETED` | Event/trip finished |
| `CONFLICT` | Overlap / conflict state (room facilities; may revert to `PENDING` when a blocker is cleared) |

WebSocket `STATUS_UPDATED` payloads may include `conflictedIds` and `revertedIds` so the UI can patch sibling rows without a full refetch.

---

## 8. API surface

All REST paths are relative to the Tomcat context:

```
https://<host>/lpu-reservation-system/api/...
```

### 8.1 Authentication

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/login` | Obtain JWT (`rememberMe` supported) |
| `GET` | `/api/auth/me` | Current user profile, role, services, home path |
| `PUT` | `/api/auth/profile` | Update profile |
| `POST` | `/api/auth/forgot-password` | Send reset link |
| `POST` | `/api/auth/reset-password` | Complete reset |

### 8.2 Public APIs

| Prefix | Capabilities |
|--------|----------------|
| `/api/public/flt` | Equipment, occupied dates, approved events, `POST /reserve` |
| `/api/public/gymnasium` | Equipment, approved events, `POST /reserve` |
| `/api/public/nexus` | Equipment, approved events, `POST /reserve` |
| `/api/public/van` | Vehicles, approved events, `POST /reserve` |
| `/api/public/maintenance` | List maintenance blocks |
| `/api/public/reservation-otp` | `POST /send`, `POST /verify` |
| `/api/health` | Health check |
| `/api/flt/survey` | Satisfaction survey (HTML) |

### 8.3 Admin / facilities APIs (JWT)

| Prefix | Purpose |
|--------|---------|
| `/api/admin/flt` | List, status, coordination, reschedule, details, delete |
| `/api/admin/gymnasium` | Same pattern as FLT |
| `/api/admin/nexus` | Same pattern as FLT |
| `/api/admin/van` | List, vehicles, available vehicles, vehicle schedule, approve, reassign, status, reschedule, details, delete |
| `/api/admin/maintenance` | CRUD maintenance blocks |
| `/api/admin/audit` | `GET /logs`, `GET /action-types` (superadmin) |
| `/api/admin/roles` | Role CRUD (superadmin) |
| `/api/admin/users`, `/api/admin/createuser`, … | Superadmin user management |
| `/api/admin/equipment*`, `/api/admin/vehicle*` | Inventories |
| `/api/facilities/users*` | Facilities-scoped user management |
| `/api/facilities/equipment*` | Facilities equipment |
| `/api/facilities/drivers` | Driver CRUD + toggle status |

Exact signatures live in `org.lpu.dev.codes.controller.*Controller`.

---

## 9. Real-time messaging

| Item | Value |
|------|--------|
| Native endpoint | `/lpu-reservation-system/ws` |
| SockJS fallback | `/lpu-reservation-system/ws-sockjs` |
| Protocol | STOMP over WebSocket; simple broker `/topic` |
| Auth | `Authorization: LpuL <token>` on CONNECT |
| Topics | `/topic/reservations/flt`, `.../gymnasium`, `.../van`, `.../nexus` |
| Events | `CREATED`, `STATUS_UPDATED` (optional `conflictedIds` / `revertedIds`) |
| Publish timing | After the DB transaction commits (`ReservationEventPublisher`) |

Frontend: `ReservationRealtimeService`. Approver pages also poll quietly as resilience.

---

## 10. Data and persistence

- **Database:** PostgreSQL `lpu_reservation` (default).
- **Bootstrap:** `data/postgres/init/` on first compose up.
- **Schema evolution:** Hibernate `ddl-auto=update` plus reference SQL `backend/lpu-reservation-system/src/main/resources/db/table.sql`.
- **Seed:** default Superadmin when none exists (`DefaultDataSeeder` / `SuperAdminUserService`); default roles via `RoleAccessService.ensureDefaults()`.
- **Uploads:** vehicle images and similar assets via `/uploads/` proxied to Tomcat.

### 10.1 Core tables (non-exhaustive)

| Table | Role |
|-------|------|
| `users` | Staff accounts, BCrypt hash, reset tokens, `ACTIVE` status |
| `app_roles` | Role catalog (`code`, `label`, `is_system`, `home_path`) |
| `role_service_access` | `(role_code, service_code)` grants |
| `facilities` | FLT, Van, Nexus, Boardroom, Gymnasium reference rows |
| `resources` / equipment entity | Facility-linked equipment |
| `vehicle` | Fleet; `image_url`, assigned driver fields |
| `driver` | Driver registry |
| `flt_reservations` | Theater bookings; JSON `reserved_dates` / `requested_equipment`; coordination; rating |
| `gymnasium_reservations` | Same room-style shape as Nexus |
| `nexus_reservations` | Room-style bookings |
| `van_reservations` | Trip bookings; JSON dates; remarks; school; requested vehicle type |
| `van_reservation_vehicles` | Many-to-many assigned vehicles |
| `maintenance_blocks` | Facility downtime |
| `admin_audit_logs` | Superadmin audit (`service`, `action_type`, JSON `details`) |
| `reservation_reminders` | Unique `(service, reservation_id, reserved_date, reminder_type)` |
| `allowed_reservation_emails` | Legacy table; runtime gate is domain regex, not this table |

Reservation date/time baskets are stored as **JSONB** (`reserved_dates`), not as normalized slot rows.

---

## 11. Frontend architecture

- Standalone Angular components, lazy-loaded feature routes, **OnPush** on feature pages.
- Shared UI kit (`UiButton`, `UiIcon`, `UiToast`, calendar, checkbox, segmented control).
- Glass / list panel language via Tailwind + shared utilities (`glass-panel`, `list-panel`, `facility-card`).
- Persistent admin chrome: `AdminLayout` keeps side nav mounted; `ReservationAlertBalloon` for pending alerts.
- Facility icons: Van `airport_shuttle`, FLT `stadium` / `theaters`, Gymnasium `sports_basketball`, Nexus `co_present`.
- Form export is **client-side**: FLT fills a DOCX template (`docxtemplater`); Gym / Nexus / Van overlay PDFs with `pdf-lib`.
- Dev proxy (`proxy.conf.js`) forwards `/lpu-reservation-system` (including WebSocket) and `/uploads` to `BACKEND_URL`.

---

## 12. Deployment

### 12.1 Docker Compose (recommended)

Services: `reservation-postgres`, `reservation-tomcat`, `reservation-angular` (build), `reservation-web` (nginx), optional `reservation-cloudflared`.

```bash
cp .env.example .env
# fill POSTGRES_*, BACKEND_URL, optional CLOUDFLARE_TUNNEL_TOKEN
docker compose up -d
```

Nginx:

- Serves Angular production build from `frontend/frontend/dist/frontend/browser`
- SPA fallback: `try_files` → `/index.csr.html`
- Proxies `/lpu-reservation-system/` to Tomcat with WebSocket upgrade and long read/send timeouts
- Proxies `/uploads/` to Tomcat
- `SERVER_NAME` includes `localhost`, `reservation.lpulaguna.com`, `learnerreservation.lpulaguna.com`

The Angular container runs a **production build with `--watch`**, not `ng serve`.

### 12.2 Local development

```bash
# Backend: deploy WAR to local Tomcat on :8080 (context /lpu-reservation-system)
cd frontend/frontend
npm install
# BACKEND_URL=http://localhost:8080 in repo-root .env (used by proxy.conf.js)
npm start
```

Angular CLI serves on port `4200` by default. Do **not** set an env var named `PORT` for SSR — it conflicts with the CLI; use `SSR_PORT` instead.

### 12.3 Configuration notes

| Setting | Purpose |
|---------|---------|
| `BACKEND_URL` | Dev proxy / Docker Angular → Tomcat |
| `app.frontend.url` | Backend property for password-reset links |
| Mail properties | Office 365 SMTP in `application.properties` (keep secrets out of git) |
| JDBC URL | Compose hostname `reservation-postgres`; alias `postgres` kept for legacy URLs |
| JWT secret / expiry | Backend `JWTService` |

---

## 13. Security considerations

- JWT bearer auth with custom `LpuL` prefix; interceptor + WebSocket CONNECT both require it.
- Role-gated admin routes (Angular guards) **and** controller-level checks; custom roles are service-scoped.
- Public booking gated by emailed OTP, then a short-lived OTP token on `POST /reserve`.
- Reservation emails restricted to institutional domains (`@lpulaguna.edu.ph`, `@lpusc.edu.ph`).
- Remember-me login can issue a longer-lived token when enabled.
- Password reset uses time-limited email tokens.
- WebSocket broker access limited to roles with at least one bookable service and an active account.
- Uploaded media served through `/uploads/`.
- Passwords stored with BCrypt.
- **Operational notes:** CSRF is disabled (stateless API). `application.properties` currently contains live mail/DB credentials — treat that as a secret-management gap. CORS is often `@CrossOrigin("*")` on controllers. Compiler/runtime Java versions are misaligned (24 vs 21).

---

## 14. Testing and quality

| Layer | Tooling |
|-------|---------|
| Frontend unit | Vitest (`ng test`) |
| Backend | JUnit 5 + Mockito in the WAR module; ancillary project under `backend/test` |
| Typecheck | TypeScript project references / `tsc` |

Automated end-to-end coverage is not a documented baseline. Manual QA should cover staff and learner hosts, the three landing-live facilities, Nexus admin/API if enabling the landing card, OTP → submit → approve → email → WebSocket refresh, van multi-vehicle assignment, maintenance blocks, reminders, and FLT Tech cannot approve/reject.

---

## 15. Known gaps / follow-ups

1. Nexus Room is fully wired in API and admin UI but **not bookable from either landing card**.
2. Boardroom / Conference remain shells.
3. `EOADMIN` has no routed dashboard.
4. Gymnasium/Nexus satisfaction survey email may not have a dedicated HTML controller comparable to `/api/flt/survey`.
5. Declared frontend packages `jspdf` and `exceljs` are unused in `src/`.
6. Legacy `allowed_reservation_emails` table is unused by the current gate.
7. Van SQL still has leftover `vehicle_id` / `driver_id` columns; runtime assignment is `van_reservation_vehicles`.
8. Align Java compiler release with the JDK 21 Tomcat image.
9. Move SMTP and JDBC secrets out of committed `application.properties`.

---

## 16. Operational checklist

- [ ] Staff landing lists Van, FLT, Gymnasium as bookable
- [ ] Learner host lists FLT and Gymnasium only; Van/Nexus URLs redirect home
- [ ] Customer can complete OTP-gated booking for each live facility
- [ ] Superadmin / Facilities Admin can approve, reject, cancel, complete
- [ ] Van approval assigns one or more vehicles
- [ ] FLT / Gymnasium (and Nexus, if enabled) coordination meeting can be set
- [ ] Maintenance blocks appear on customer calendars
- [ ] Approver lists update via WebSocket and remain correct after refresh
- [ ] Lifecycle emails send for confirm / approve / reject / cancel
- [ ] Reminder job would send at 08:00 Asia/Manila for approved upcoming dates
- [ ] Non-university emails are rejected where the domain gate is enforced
- [ ] Audit log records admin actions (superadmin)
- [ ] Form download produces filled FLT / Gym / Van (and Nexus) documents
- [ ] FLT Tech can access FLT only and cannot approve/reject pending
- [ ] Custom roles only see granted services

---

## 17. Glossary

| Term | Definition |
|------|------------|
| **FLT** | Feliciano L. Torres Theater (campus theater) |
| **Nexus** | Nexus Room / common learning space |
| **Coordination** | Required pre-event meeting slot set by admin after approval (FLT / Gym / Nexus) |
| **OTP** | One-time password emailed to verify the reserver’s address |
| **Service code** | `FLT`, `GYMNASIUM`, `VAN`, or `NEXUS` granted to a role |
| **Learner portal** | Hostname `learnerreservation.lpulaguna.com` — subset of facilities |
| **WAR** | Web Application Archive deployed to Tomcat |
| **STOMP** | Messaging protocol over WebSockets for reservation events |
| **LpuL** | Custom HTTP Authorization scheme prefix for JWTs |

---

## 18. Document control

| Field | Value |
|-------|--------|
| Product | LPU Laguna Reservation System |
| App version (UI) | `1.0.0` (`frontend/frontend/src/app/core/app-info.ts`) |
| Audience | Developers, MIS, facilities operations |
| Related paths | `frontend/frontend`, `backend/lpu-reservation-system`, `docker-compose.yml` |

Update this file when landing exposure, roles, APIs, or deployment topology change. Keep `TECHNICAL-DOCUMENTATION-V2-PHASE-1.md` only as a historical snapshot of the three-service Phase 1 cut.
