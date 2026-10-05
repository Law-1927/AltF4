# Backend

Not yet implemented — folders below are placeholders (each holds a
`.gitkeep` so the empty structure survives in version control) for when
build-out starts.

```
backend/src/
├── config/       Environment config, DB connection setup
├── controllers/  Request handlers — one per resource (auth, customers,
│                 vehicles, appointments, services, reports)
├── models/       Data models — mirrors the tables in database/schema.sql
├── routes/       Route definitions, grouped by resource, wired to controllers
└── middleware/   Auth guards, request validation, error handling
```

## Planned resources (from the wireframe + Project Objectives)

- **Auth** — client login/register, staff login
- **Customers** — customer records (name, contact info)
- **Vehicles** — linked to a customer; make/model/type
- **Services** — service catalog (Ceramic Pro, Standard PMS, Deep Detailing, etc.) with pricing
- **Appointments** — booking, scheduling, status (Pending / Ongoing / Completed), conflict/double-booking checks
- **Notifications** — automated client messages (booking confirmation, ready-for-pickup)
- **Reports** — daily revenue, completed jobs, exportable records (PDF warranty, CSV export)
