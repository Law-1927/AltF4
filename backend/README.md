# Backend

There is **no custom backend server** in this project. The system uses
Supabase (hosted Postgres, Auth, and Realtime), and the browser talks to it
directly. The decision and the reasoning are in `docs/architecture.md`.

Server-side logic lives in the database instead, in
`supabase/migrations/`:

- Row Level Security policies (who can read or change what)
- Triggers (price and end time set by the server, notifications, profile
  creation, role protection, slot syncing)
- An exclusion constraint that prevents double booking
- A `cancel_appointment()` function for clients

## The placeholder folders

`backend/src/` still contains the empty folders from the original
three-layer plan (`config`, `controllers`, `models`, `routes`,
`middleware`, each holding a `.gitkeep`). Nothing uses them. The team can
delete them, or keep the folder for the future cases below.

## When a server-side function would be needed

Some work cannot safely run in the browser. If these are added, they would
most likely be **Supabase Edge Functions** (not a separate server):

- Sending SMS or email notifications (the `notifications` table already
  records what should be sent)
- Generating PDF warranty documents
- Anything that needs a secret key

Secret keys (`sb_secret_...` or the legacy `service_role`) belong only in
such server-side code, never in `frontend/`.
