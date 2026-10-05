# Database

`schema.sql` is a first-pass draft derived from the wireframe screens and
the LOA's Project Objectives. It is **not yet reviewed by the team** —
treat table names, types, and constraints as a starting point for
discussion, not a final design.

## Tables at a glance

| Table | Purpose |
|---|---|
| `users` | Clients, staff, and admins (role-based) |
| `vehicles` | One-to-many with `users` (a client can have multiple vehicles) |
| `services` | Service catalog — name, price, duration, warranty |
| `appointments` | Central booking table; unique `(scheduled_date, scheduled_time)` prevents double booking |
| `notifications` | Automated client messages tied to an appointment |
| `reports_daily` | Rollup used for the Reports & Storage screen |

Open questions for the team: do we need a separate `staff_assignments`
table (which staff member handled which appointment), and should
`services` support add-ons/bundles?
