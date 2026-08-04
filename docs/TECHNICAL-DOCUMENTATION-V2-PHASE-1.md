# LPU Laguna Reservation System

**Version:** 2.0 (Phase 1)  
**Institution:** Lyceum of the Philippines University – Laguna  
**Maintainer:** Management Information Systems (MIS) Department  
**Document type:** Technical documentation  
**Status:** Phase 1 — production-ready for FLT Theater, Gymnasium, and University Van

---

## 1. Overview

The LPU Reservation System (v2) is a web application that allows faculty, staff, students, and accredited organizations to request facility and vehicle reservations, and allows authorized administrators to review, approve, coordinate, and manage those requests.

Version 2 is a full redesign of the reservation platform with a modern Angular SPA frontend, a Spring MVC backend deployed as a WAR on Tomcat, PostgreSQL persistence, JWT authentication, real-time updates over WebSockets, and automated email notifications.

### 1.1 Phase 1 scope

Phase 1 delivers an end-to-end reservation lifecycle for three live services:

| Service | Customer booking | Admin approval | Real-time | Email lifecycle |
|---------|------------------|----------------|-----------|-----------------|
| **FLT Theater** | Yes | Yes | Yes | Yes |
| **Gymnasium** | Yes | Yes | Yes | Yes |
| **University Van** | Yes | Yes (vehicle + driver assignment) | Yes | Yes |

Also included in Phase 1:

- Superadmin, Facilities Admin, and FLT Tech role shells
- Equipment, vehicle, and driver registries
- Maintenance block scheduling (facility downtime)
- Allowed-email gatekeeping for `@lpulaguna.edu.ph`
- OTP verification on public reservation submit
- Audit logging (superadmin)
- Operational dashboards
- Client-side official form export (DOCX / PDF)

### 1.2 Explicitly deferred (post–Phase 1)

| Item | Notes |
|------|--------|
| Boardroom | Landing marked “Coming soon”; shared room form shell only |
| Nexus Room | Landing marked “Coming soon”; no dedicated admin shell |
| Conference Room | Landing marked “Coming soon”; no dedicated admin shell |
| `NEXUSADMIN` / `EOADMIN` | Role constants exist; no routed UI shells yet |
| Some dashboard analytics | Unimplemented services show “Coming soon” |

---

## 2. System architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────────┐
│  Browser    │────▶│  Nginx (:80) │────▶│ Angular static SPA  │
│  (customer  │     │  reverse     │     └─────────────────────┘
│   / admin)  │     │  proxy       │
└─────────────┘     └──────┬───────┘
                           │ /lpu-reservation-system/*
                           │ /uploads/*
                           ▼
                    ┌──────────────┐     ┌─────────────────────┐
                    │ Tomcat 11    │────▶│ PostgreSQL 17       │
                    │ WAR context  │     │ lpu_reservation     │
                    │ /lpu-reserva │     └─────────────────────┘
                    │ tion-system  │
                    └──────┬───────┘
                           │ SMTP (Office 365)
                           ▼
                    ┌──────────────┐
                    │ Email        │
                    └──────────────┘
```

**Request flow (summary):**

1. Public users hit the Angular SPA (landing → facility reservation calendar → OTP → submit).
2. Nginx serves the SPA and proxies API / WebSocket / upload traffic to Tomcat.
3. The Spring MVC WAR authenticates JWT-bearing admin requests (`Authorization: LpuL <token>`), persists via Hibernate/JDBC to PostgreSQL, publishes STOMP events, and sends mail.
4. Admin UIs subscribe to facility-specific topics for live reservation updates.

---

## 3. Technology stack

### 3.1 Frontend

| Technology | Version / notes |
|------------|-----------------|
| Angular | ^22 |
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
**WebSocket base:** `/lpu-reservation-system/ws`

### 3.2 Backend

| Technology | Version / notes |
|------------|-----------------|
| Packaging | WAR (`org.lpu.dev.codes:lpu-reservation-system`) |
| Runtime | Tomcat 11 (JDK 21 image) |
| Spring Framework | 7.x (Web MVC, WebSocket, ORM, JDBC, TX) |
| Spring Security | 6.3.x (web/config) + crypto 7.x |
| JWT | jjwt 0.11.5 — header prefix **`LpuL `** |
| ORM | Hibernate 7.x |
| Database | PostgreSQL 17 |
| Connection pool | c3p0 |
| Mail | Angus Mail + Spring `JavaMailSender` (Office 365 SMTP) |
| Templates | Thymeleaf (survey / HTML mail content as applicable) |

**Path:** `backend/lpu-reservation-system/`  
**Context path:** `/lpu-reservation-system`

### 3.3 Infrastructure

| Component | Image / role |
|-----------|----------------|
| PostgreSQL | `postgres:17` |
| Application server | `tomcat:11.0.22-jdk21` |
| Frontend build | `node:24-alpine` (production `ng build --watch`) |
| Reverse proxy | `nginx:latest` |
| Optional tunnel | `cloudflare/cloudflared` |

Orchestration: `docker-compose.yml` at repository root.  
Environment template: `.env.example`.

---

## 4. Repository layout

```
lpu-reservation-system/
├── docs/                                 # Documentation (this file)
├── frontend/
│   └── frontend/                         # Angular application
│       ├── src/app/
│       │   ├── core/auth/                # JWT, guards, roles, interceptor
│       │   ├── features/
│       │   │   ├── auth/                 # Login, forgot/reset password
│       │   │   ├── customer/             # Public reservation UX
│       │   │   ├── admin/                # Superadmin modules
│       │   │   └── facilities/           # Facilities Admin modules
│       │   └── shared/                   # Layout, UI kit, utilities
│       ├── proxy.conf.js                 # Dev proxy → BACKEND_URL
│       └── public/                       # Static assets / form templates
├── backend/
│   └── lpu-reservation-system/           # Spring MVC WAR
│       └── src/main/java/org/lpu/dev/codes/
│           ├── controller/
│           ├── services/
│           ├── repository/
│           ├── security/
│           ├── config/
│           └── model/
├── data/
│   ├── postgres/init/                    # DB bootstrap
│   ├── tomcat/webapps/                   # Deployed WAR mount
│   └── web/templates/                    # Nginx config template
├── docker-compose.yml
└── .env.example
```

---

## 5. Roles and access control

### 5.1 Canonical roles

| Role | Post-login home | Phase 1 UI |
|------|-----------------|------------|
| `SUPERADMIN` | `/dashboard` | Full admin: users, allowed emails, equipment, vehicles, drivers, reservations, audit |
| `FACILITIESADMIN` | `/facilities/dashboard` | Facilities dashboard, users, equipment, vehicles, drivers, scheduling (FLT / Gym / Van) |
| `FLTTECH` | `/flt-tech/dashboard` | FLT dashboard + FLT Theater reservations only |
| `NEXUSADMIN` | `/nexus/dashboard` | Reserved for later phases (no routes yet) |
| `EOADMIN` | `/eo/dashboard` | Reserved for later phases (no routes yet) |

### 5.2 Authorization model

- **Customers:** unauthenticated public flows under `/customer/*` and `/api/public/*`.
- **Staff:** JWT required. Clients send `Authorization: LpuL <token>`.
- Controllers enforce role checks for admin/facilities endpoints.
- **FLT Tech** may manage FLT reservations but **cannot approve or reject** pending requests; allowed status transitions are limited to `COMPLETED` / `CANCELLED` (and related operational actions as implemented).
- WebSocket connections require an authenticated role in `{SUPERADMIN, FACILITIESADMIN, FLTTECH}`.

### 5.3 Frontend route groups (Phase 1)

| Area | Example paths |
|------|----------------|
| Public | `/` (landing), `/customer/flt`, `/customer/gymnasium`, `/customer/van`, terms pages |
| Auth | `/login`, `/forgot-password`, `/reset-password` |
| Superadmin | `/dashboard`, `/users`, `/allowed-emails`, `/equipments`, `/vehicles`, `/drivers`, `/reservation/{flt\|gymnasium\|van}`, `/audit/*` |
| Facilities | `/facilities/dashboard`, `/facilities/users`, `/facilities/equipments`, `/facilities/vehicles`, `/facilities/drivers`, `/facilities/reservation/{flt\|gymnasium\|van}` |
| FLT Tech | `/flt-tech/dashboard`, `/flt-tech/reservation/flt` |

---

## 6. Functional modules (Phase 1)

### 6.1 Customer reservation flow

Common pattern for FLT, Gymnasium, and Van:

1. Select facility from landing page.
2. Browse calendar (occupied / approved / maintenance visibility).
3. Build a date/time “basket” with advance-booking rules.
4. Complete multi-step form (event details, equipment where applicable, terms acceptance).
5. Verify email via OTP (`/api/public/reservation-otp`).
6. Submit reservation → status `PENDING` → confirmation email.
7. Staff JWT sessions may skip OTP where implemented for admin-created bookings.

**Van-specific:** passenger/destination fields; approval requires vehicle and driver assignment.  
**FLT / Gymnasium-specific:** equipment requests; coordination meeting scheduling after approval; conflict detection against approved/completed slots.

### 6.2 Admin / facilities approver flow

Approver pages provide:

- Month filter + search + status chips (`All`, `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`, `COMPLETED`)
- Mobile and desktop layouts with status pills and conflict highlighting
- Approve / reject / cancel / complete actions
- Coordination calendar (FLT, Gymnasium)
- Reschedule calendar
- Maintenance block management
- CSV export
- Official form download (FLT DOCX templating; Gymnasium / Van PDF fill)

### 6.3 Supporting registries

| Module | Purpose |
|--------|---------|
| **Users** | Create/update/toggle staff accounts (superadmin or facilities-scoped) |
| **Allowed emails** | Whitelist for reservation email checks; domain `@lpulaguna.edu.ph` |
| **Equipments** | Inventory linked to facilities (FLT / Gymnasium usage) |
| **Vehicles** | Fleet registry with images under `/uploads/` |
| **Drivers** | Driver registry for van assignments |
| **Maintenance** | Date/time blocks that close a facility for booking |
| **Audit** | Superadmin action history (`admin_audit_logs`) |
| **Dashboard** | Calendar/summary view of reservations + maintenance across live services |

### 6.4 Notifications

| Channel | When |
|---------|------|
| Reservation OTP email | Public submit verification |
| Lifecycle emails (FLT / Gym / Van) | Confirm, approve, reject, cancel, coordination (FLT/Gym), satisfaction/thank-you where applicable |
| Password reset email | Forgot-password flow |
| WebSocket topics | Live list refresh for approvers |
| In-app alert balloon | Pending reservation awareness for staff |

SMTP: Office 365 (`smtp.office365.com:587`, STARTTLS).

---

## 7. API surface

All REST paths are relative to the Tomcat context:

```
https://<host>/lpu-reservation-system/api/...
```

### 7.1 Authentication

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/login` | Obtain JWT (`rememberMe` supported) |
| `GET` | `/api/auth/me` | Current user profile |
| `PUT` | `/api/auth/profile` | Update profile |
| `POST` | `/api/auth/forgot-password` | Send reset link |
| `POST` | `/api/auth/reset-password` | Complete reset |

### 7.2 Public APIs

| Prefix | Capabilities |
|--------|----------------|
| `/api/public/flt` | Equipment, occupied dates, approved events, `POST /reserve` |
| `/api/public/gymnasium` | Equipment, approved events, `POST /reserve` |
| `/api/public/van` | Vehicles, approved events, `POST /reserve` |
| `/api/public/maintenance` | List maintenance blocks |
| `/api/public/allowed-emails` | `GET /check` |
| `/api/public/reservation-otp` | `POST /send`, `POST /verify` |
| `/api/health` | Health check |
| `/api/flt/survey` | Satisfaction survey (HTML) |

### 7.3 Admin / facilities APIs (JWT)

| Prefix | Purpose |
|--------|---------|
| `/api/admin/flt` | List, status, coordination, reschedule |
| `/api/admin/gymnasium` | List, status, coordination, reschedule |
| `/api/admin/van` | List, approve/reassign, status, schedules, reschedule |
| `/api/admin/maintenance` | CRUD maintenance blocks |
| `/api/admin/audit` | Audit logs / action types (superadmin) |
| `/api/admin/users` (+ related) | User management (superadmin) |
| `/api/admin/equipment*`, `/api/admin/vehicle*` | Inventories |
| `/api/admin/allowed-emails*` | Allow-list management |
| `/api/facilities/users*` | Facilities-scoped user management |
| `/api/facilities/equipment*` | Facilities equipment |
| `/api/facilities/drivers` | Driver management |

Exact method paths live in the corresponding `*Controller.java` classes under `org.lpu.dev.codes.controller`.

---

## 8. Real-time messaging

| Item | Value |
|------|--------|
| Endpoint | `/lpu-reservation-system/ws` (native) / SockJS fallback |
| Protocol | STOMP over WebSocket |
| Auth | `Authorization: LpuL <token>` on connect |
| Topics | `/topic/reservations/flt`, `/topic/reservations/gymnasium`, `/topic/reservations/van` |
| Typical events | `CREATED`, `STATUS_UPDATED` (may include conflicted/reverted IDs) |

Frontend service: `ReservationRealtimeService` under admin reservations shared utilities. Approver pages also poll quietly as a resilience fallback.

---

## 9. Reservation status model

Shared lifecycle used by Phase 1 services:

| Status | Meaning |
|--------|---------|
| `PENDING` | Awaiting admin decision |
| `APPROVED` | Accepted (Van includes assigned vehicle/driver) |
| `REJECTED` | Declined |
| `CANCELLED` | Cancelled by staff or process |
| `COMPLETED` | Event/trip finished |
| `CONFLICT` | FLT-specific overlapping / conflict state (where applicable) |

Approver UIs sort pending items first and highlight schedule overlaps against approved/completed reservations (and coordination slots for FLT/Gym).

---

## 10. Data & persistence

- **Database:** PostgreSQL database `lpu_reservation` (default).
- **Bootstrap:** `data/postgres/init/` ensures the database exists on first compose up.
- **Schema evolution:** Hibernate `ddl-auto=update` plus reference SQL under backend resources (`db/table.sql`).
- **Seed:** default superadmin account is created when none exists (`DefaultDataSeeder`).
- **Uploads:** vehicle images and similar assets served via `/uploads/` proxied to Tomcat.

Core domain entities (non-exhaustive): users, facilities, equipment, vehicles, drivers, allowed reservation emails, FLT / Gymnasium / Van reservations, maintenance blocks, admin audit logs, OTP / password-reset tokens.

---

## 11. Deployment

### 11.1 Docker Compose (recommended)

Services: `postgres`, `tomcat`, `angular` (build), `web` (nginx), optional `cloudflared`.

```bash
cp .env.example .env
# fill POSTGRES_*, TOMCAT_*, BACKEND_URL, optional CLOUDFLARE_TUNNEL_TOKEN
docker compose up -d
```

Nginx:

- Serves Angular production build from `frontend/frontend/dist/frontend/browser`
- Proxies `/lpu-reservation-system/` to Tomcat (WebSocket upgrade enabled)
- Proxies `/uploads/` to Tomcat

### 11.2 Local development

```bash
# Backend: deploy WAR to local Tomcat on :8080 (context /lpu-reservation-system)
# Frontend:
cd frontend/frontend
npm install
# Ensure BACKEND_URL=http://localhost:8080 in env used by proxy.conf.js
npm start
```

Angular CLI serves on port `4200` by default. Do **not** set an env var named `PORT` for SSR — it conflicts with the CLI; use `SSR_PORT` instead.

### 11.3 Configuration notes

| Setting | Purpose |
|---------|---------|
| `BACKEND_URL` | Dev proxy / Docker Angular → Tomcat |
| `app.frontend.url` | Backend property for password-reset links |
| Mail properties | Office 365 SMTP credentials in `application.properties` |
| JWT secret / expiry | Backend security configuration |

---

## 12. Security considerations (Phase 1)

- JWT bearer auth with custom `LpuL` prefix; store tokens securely in the browser (auth service).
- Role-gated admin routes (Angular guards) **and** controller-level checks.
- Public booking gated by OTP email verification.
- Reservation email allow-list (especially Van) restricted to institutional domain.
- Remember-me login can issue a longer-lived token when enabled.
- Password reset uses time-limited email tokens.
- WebSocket broker access limited to staff roles.
- Uploaded media served through controlled `/uploads/` path.

---

## 13. Frontend UX conventions (Phase 1)

- **OnPush** change detection on feature pages.
- Shared UI kit (`UiButton`, `UiIcon`, `UiToast`, date/search controls).
- Glass / list panel visual language via Tailwind + shared CSS utilities (`glass-panel`, `list-panel`, `facility-card`).
- Facility icons (landing / nav / approver headers):
  - Van → `airport_shuttle`
  - FLT → `stadium` / `theaters` (nav)
  - Gymnasium → `sports_basketball`
- Approver tables use skeleton loaders, status chips, and shared filter/sort utilities.

---

## 14. Testing & quality

| Layer | Tooling |
|-------|---------|
| Frontend unit | Vitest (`ng test`) |
| Backend | Separate Maven test project under `backend/test` (ancillary) |
| Typecheck | TypeScript project references / `tsc` |

Automated end-to-end suite coverage is not part of the Phase 1 documentation baseline; manual QA should cover the three live facilities across customer submit → approve → email → realtime refresh.

---

## 15. Known gaps / follow-ups

Documented from the current codebase (do not treat as Phase 1 blockers unless product requires them):

1. Boardroom / Nexus / Conference remain “Coming soon.”
2. `NEXUSADMIN` and `EOADMIN` lack routed shells.
3. Gymnasium satisfaction survey email may reference a survey path without a dedicated controller (FLT survey exists at `/api/flt/survey`).
4. Declared frontend packages `jspdf` and `exceljs` are not used in `src/` (reserved / unused).
5. Compiler release property in `pom.xml` mentions Java 24 while the Tomcat image is JDK 21 — align toolchain before production hardening.

---

## 16. Phase 1 acceptance checklist

Use this as a release verification guide:

- [ ] Landing lists Van, FLT, Gymnasium as bookable; others “Coming soon”
- [ ] Customer can complete OTP-gated booking for each live facility
- [ ] Superadmin / Facilities Admin can approve, reject, cancel, complete
- [ ] Van approval assigns vehicle + driver
- [ ] FLT / Gymnasium coordination meeting can be set
- [ ] Maintenance blocks appear on customer calendars
- [ ] Approver lists update via WebSocket (and remain correct after refresh)
- [ ] Lifecycle emails send for confirm / approve / reject / cancel
- [ ] Allowed-email check rejects non-allowlisted addresses where enforced
- [ ] Audit log records admin actions (superadmin)
- [ ] Form download produces filled FLT / Gym / Van documents
- [ ] FLT Tech can access FLT only and cannot approve/reject pending

---

## 17. Glossary

| Term | Definition |
|------|------------|
| **FLT** | Flexible Learning Theater (campus theater facility) |
| **Coordination** | Required pre-event meeting slot set by admin after approval (FLT/Gym) |
| **OTP** | One-time password emailed to verify the reserver’s contact address |
| **Allow-list** | Approved institutional emails permitted to book |
| **WAR** | Web Application Archive deployed to Tomcat |
| **STOMP** | Messaging protocol used over WebSockets for reservation events |

---

## 18. Document control

| Field | Value |
|-------|--------|
| Product | LPU Laguna Reservation System |
| Version | 2.0 Phase 1 |
| Audience | Developers, MIS, facilities operations |
| Source of truth | This repository’s implemented code |
| Related paths | `frontend/frontend`, `backend/lpu-reservation-system`, `docker-compose.yml` |

*This document describes the system as implemented in the Version 2 Phase 1 codebase. Future phases should extend §1.2 deferred items and update API / role sections accordingly.*
