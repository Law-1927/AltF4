# AltF4
Software Engineering Project

## ALTF4 — Shimmer and Shield Car Coating Management System

Digital appointment and records management system built by team **ALT F4**
for the client **Shimmer and Shield Car Coating**.

The app is a static web frontend (`frontend/app/`) that talks directly to a
**Supabase** backend (Postgres, Auth, Realtime). See `docs/architecture.md`
for the full breakdown and `docs/SETUP.md` to run it locally.

## Project objectives (from the Letter of Agreement)

1. Develop a Customer and Vehicle Management System
2. Establish a Centralized and Secure Database
3. Automate Appointment Booking and Scheduling

## Folder structure

```
AltF4/
├── frontend/
│   ├── wireframes/   Original 8-screen design board
│   └── app/          The real application (HTML/CSS/JS, no build step)
├── supabase/
│   ├── migrations/   Database schema and rules (source of truth)
│   └── seed_test_services.sql   Sample services for development only
├── database/         Database notes (schema.sql is the superseded draft)
├── backend/          Notes only — there is no custom server
└── docs/             Architecture, setup guide, wireframe walkthrough
```

## Quick start

See `docs/SETUP.md`. In short: open the repo in VS Code, open
`frontend/app/login.html`, and click **Go Live**.

## Status

- [x] SWOT analysis
- [x] Letter of Agreement (signed)
- [x] UI/UX wireframe board (8-screen flow)
- [x] Project Plan
- [x] Backend decision (Supabase)
- [x] Database implementation
- [x] Login, registration, and roles
- [x] Booking flow (service, date and time, confirmation)
- [x] Staff dashboard
- [ ] Client booking history and notices
- [ ] Reports and export
- [ ] Real service catalog and shop hours from the client
- [ ] Production deployment
