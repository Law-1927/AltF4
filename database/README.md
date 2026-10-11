# Database

The database runs on **Supabase (Postgres)**. The schema is in
`supabase/migrations/20261009000000_initial_schema.sql` — that file is the
source of truth.

`schema.sql` in this folder is the original first-pass draft (SQLite-style).
It is kept for reference only and is **superseded**.

## Tables at a glance

| Table | Purpose |
|---|---|
| `profiles` | One row per signed-up user (client, staff, or admin). Passwords and email login are handled by Supabase Auth, not stored here |
| `vehicles` | A client can have many vehicles |
| `services` | Service catalog: name, price, bay duration, warranty |
| `appointments` | Central booking table. The start time and service decide the end time and price |
| `booked_slots` | Taken time ranges only (no personal data), so clients can see what is unavailable. Kept in sync by a trigger |
| `notifications` | Automated client messages tied to an appointment |
| `reports_daily` (view) | Daily revenue and completed-job counts for the Reports screen |

## Key rules

- **No double booking:** an exclusion constraint rejects any overlapping
  time range (cancelled bookings are ignored). This assumes **one service
  bay**.
- **Server decides price and times:** the client sends only the vehicle,
  service, and start time.
- **Row Level Security** is on for every table. Clients see only their own
  data; staff and admins see everything.
- **Roles:** every signup is a `client`. Promote staff or admins from the
  Supabase SQL Editor, for example:
  `update public.profiles set role = 'staff' where email = '...';`

## Changing the database

Do not edit the migration that has already been applied. Add a new file in
`supabase/migrations/` with a timestamp prefix, for example
`20261020000000_add_staff_assignments.sql`, and run it in the SQL Editor
(or with the Supabase CLI).

`supabase/seed_test_services.sql` adds `[TEST]` sample services for
development. Remove them with
`delete from public.services where name like '[TEST]%';`

## Open questions for the team

- Do we need a `staff_assignments` table (which staff member handled which
  appointment)?
- Should `services` support add-ons or bundles?
- How many service bays does the shop have? More than one changes the
  double-booking rule.
- What are the real opening hours and closed days? They are currently
  placeholders in the frontend, not enforced by the database.
