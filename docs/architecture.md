# System Architecture — ALTF4 (Shimmer and Shield Car Coating)

## 1. Overview

ALTF4 is a digital management system for Shimmer and Shield Car Coating,
built around three objectives set out in the Letter of Agreement:

1. **Customer and Vehicle Management System** — digitize customer and
   vehicle records currently kept manually.
2. **Centralized and Secure Database** — one source of truth for
   customer, vehicle, appointment, and service data.
3. **Automated Appointment Booking and Scheduling** — remove double
   bookings and missed appointments caused by the current manual process.

## 2. Architecture

The backend decision is **Supabase** (hosted Postgres with built-in Auth
and Realtime). There is no custom server: the browser talks to Supabase
directly, and the business rules live inside the database.

```
┌──────────────────────────┐        ┌─────────────────────────────────┐
│  Browser (client / staff)│        │  Supabase                       │
│  frontend/app            │  HTTPS │  ├─ Auth      login, sessions   │
│  static HTML + JS        │ ─────▶ │  ├─ Postgres  tables, Row Level │
│  supabase-js (CDN)       │ ◀───── │  │            Security, triggers│
│                          │  WS    │  └─ Realtime  change feed       │
└──────────────────────────┘        └─────────────────────────────────┘
```

- **frontend/app/** — the real application (see `frontend/README.md`).
  `frontend/wireframes/` is the original design board, kept for reference.
- **supabase/migrations/** — the database schema and all server-side
  rules. This is the source of truth (`database/schema.sql` is the
  superseded first draft).
- **backend/** — empty placeholder folders from the original three-layer
  plan. Nothing runs there. See `backend/README.md`.

### Where each business rule is enforced

| Rule | Enforced by |
|---|---|
| No double booking | Exclusion constraint `no_double_booking` on `appointments` (rejects any overlapping time range, ignores cancelled bookings) |
| Price, end time, and reference number cannot be chosen by the client | Trigger `prepare_appointment` computes them from the service |
| Who can read or change what | Row Level Security policies on every table |
| A user cannot promote themselves | Trigger `protect_profile_role` (only an admin can change roles) |
| Clients can only cancel their own pending bookings | Function `cancel_appointment()` (clients have no update permission) |
| Clients are notified of bookings and status changes | Trigger `notify_appointment` writes a row to `notifications` |
| Other clients' slots are hidden but taken times are visible | `booked_slots` table (times only, no personal data), kept in sync by trigger |
| Shop opening hours and closed days | **Frontend only** (`frontend/app/js/shop-config.js`). Not enforced by the database yet |

## 3. Real-time data flow

Because clients and staff use the system at the same time, changes must
show up without a page refresh. Supabase Realtime publishes changes on
`appointments`, `booked_slots`, and `notifications`.

| Event | How it works | Status |
|---|---|---|
| **appointment.created** | Staff dashboard subscribes to `appointments` and reloads on any change | Implemented |
| **slot.booked** | Booking page subscribes to `booked_slots`; taken slots are struck through live. The database constraint is the final guard if two clients click at once | Implemented |
| **appointment.statusChanged** | Trigger inserts a `notifications` row for the client | Row is created. Client-facing notice screen and SMS/email delivery are not built |

## 4. Security model

- **Roles:** `client` (default for every signup), `staff`, `admin`. Staff
  and admin accounts are promoted by an admin in the Supabase SQL Editor.
- **Clients** see only their own profile, vehicles, appointments, and
  notifications. They can read the service list and the anonymized
  `booked_slots`.
- **Staff / admin** can read all bookings and update their status. Only
  admins can edit services or change roles.
- **Keys:** the Project URL and the **publishable** key are in the
  frontend by design. The **secret / `service_role` key must never** be
  placed in frontend code or committed.
- Page redirects in the frontend (for example, sending a client away from
  the dashboard) are a convenience only. The database policies are what
  actually protect the data.

## 5. User flow (from the wireframe)

| # | Wireframe screen | Page | Status |
|---|---|---|---|
| 1 | Auth | `login.html` | Built |
| 2 | Service & Details | `book-service.html` | Built |
| 3 | Date & Time Sync | `book-schedule.html` | Built |
| 4 | Confirmation | `book-confirmation.html` | Built |
| 5–6 | Staff Dashboard | `dashboard.html` | Built |
| 7 | Automated Notice | — | Not built (notification rows are created; no client screen yet) |
| 8 | Reports & Storage | — | Not built (`reports_daily` view exists) |

See `wireframes.md` for the screen-by-screen design breakdown.

## 6. Decisions

| Decision | Choice | Notes |
|---|---|---|
| Backend | Supabase | Chosen over Laravel + Reverb, Node.js + Socket.IO, Django + Channels, and Firebase. Gives auth, database, and real-time without running a server |
| Database | Postgres (via Supabase) | Replaces the SQLite-style draft in `database/schema.sql` |
| Frontend | Plain HTML, CSS, and JavaScript with `supabase-js`, no build step | Works with VS Code Live Server. Can be revisited if the app outgrows it |

## 7. Known limitations and open items

- **Shop hours are placeholders** (Monday–Saturday, 9 AM–6 PM) pending the
  client, and are not enforced by the database.
- **One service bay is assumed.** The double-booking rule blocks any
  overlap. Supporting two or more bays needs a different rule.
- **Service catalog contains `[TEST]` sample entries.** The client's real
  services and prices must replace them.
- **Notifications are in-app records only.** No SMS or email is sent.
- **Completed and Cancelled are final** in the dashboard. Corrections
  currently need an admin to edit the database.
- **Reports, CSV/PDF export, and client booking history** are not built.
- **Email confirmation on signup** may be switched off in Supabase for
  testing. It should be switched on before real use.
- Open questions for the team: staff assignment per appointment, and
  service add-ons or bundles.

## 8. Status

- [x] Wireframe board — 8 screens, PH-localized
- [x] Wireframe split into HTML/CSS/JS
- [x] Backend decision — Supabase
- [x] Database schema applied (`supabase/migrations/`)
- [x] Auth (register, login, roles)
- [x] Booking flow with conflict checking and live slot updates
- [x] Staff dashboard with status changes
- [ ] Team review of the schema
- [ ] Client booking history and notices screen
- [ ] Reports and export
- [ ] Real service catalog and shop hours from the client
- [ ] Database-level enforcement of shop hours
- [ ] SMS / email notification delivery
- [ ] Production deployment
