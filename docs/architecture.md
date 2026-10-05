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

These map onto a standard three-layer architecture:

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  frontend/  │ ───▶ │  backend/   │ ───▶ │  database/  │
│  (UI)       │ ◀─── │  (API)      │ ◀─── │  (data)     │
└─────────────┘      └─────────────┘      └─────────────┘
```

- **frontend/** — what the client and staff see and interact with.
- **backend/** — business logic and rules, sitting between the UI and the data.
- **database/** — persistent storage for customers, vehicles,
  appointments, services, and notifications.

## 2. Real-time data flow

Because the system spans a website and a mobile app used by clients and
staff at the same time, real-time data reflection is a core requirement:

- **appointment.created** — pushed to the staff dashboard the instant a
  client books, and used to lock the slot so a second client cannot book
  the same time.
- **appointment.statusChanged** — pushed to the client's device when
  staff update a job's status, triggering the automated notice.
- **slot.booked** — pushed to any client currently viewing the booking
  calendar, so the slot disappears from availability immediately.

Backend options compared for this (see Project Plan for full detail):
Laravel + Reverb, Node.js + Socket.IO, Django + Channels, Firebase, and
Supabase — no final decision made yet.

## 3. User flow (from the wireframe)

1. **Auth** (frontend) → client logs in or registers.
2. **Service & Details** (frontend → backend) → client selects a
   vehicle and a service.
3. **Date & Time Sync** (frontend ↔ backend ↔ database) → backend
   checks slot availability in real time to prevent double booking.
4. **Confirmation** (frontend) → booking reference generated and shown.
5–6. **Staff Dashboard** (frontend → backend) → staff view and update
   the day's appointments.
7. **Automated Notice** (backend → notifications) → status changes
   trigger a client-facing message.
8. **Reports & Storage** (backend → database) → daily revenue and
   completed-job counts aggregated; records exportable (PDF/CSV).

See `wireframes.md` for a screen-by-screen breakdown.

## 4. Status / next steps

- [x] Wireframe board — 8 screens, PH-localized
- [x] Wireframe split into HTML/CSS/JS
- [x] Draft database schema (`database/schema.sql`)
- [ ] Team review of the draft schema
- [ ] Backend framework decision
- [ ] Frontend framework decision for the actual app build
- [ ] Auth implementation
- [ ] Booking conflict-checking logic
- [ ] Notification delivery mechanism
