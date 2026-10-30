# Frontend

Plain HTML, CSS, and JavaScript with `supabase-js` loaded from a CDN. There
is no build step: open the folder in VS Code and use **Live Server**
(see `docs/SETUP.md`).

## Contents

- `wireframes/` — the original 8-screen UI/UX design board. Kept as the
  design reference.
  - `index.html` — structure/markup only
  - `css/style.css` — all custom styles
  - `js/config.js` — Tailwind theme config (must stay loaded right after the
    Tailwind CDN `<script>` tag)
- `app/` — the real application.

## The app (`app/`)

| Wireframe screen | Page | Who | Status |
|---|---|---|---|
| 1. Auth (Login/Register) | `login.html` | Everyone | Built |
| — | `home.html` | Signed-in users | Built (routes by role) |
| 2. Service & Details | `book-service.html` | Clients | Built |
| 3. Date & Time Sync | `book-schedule.html` | Clients | Built |
| 4. Confirmation | `book-confirmation.html` | Clients | Built |
| 5–6. Staff Dashboard | `dashboard.html` | Staff, admin | Built |
| 7. Automated Notice & History | `history.html` | Clients | Built |
| 8. Reports & Storage | `reports.html` | Staff, admin | Built |

`index.html` simply redirects to `login.html`.

### Scripts (`app/js/`)

| File | Purpose |
|---|---|
| `supabase-config.js` | Project URL and publishable key (safe to commit). **Never put the secret or `service_role` key here** |
| `supabase-client.js` | Shared Supabase client and auth helpers |
| `shop-config.js` | Opening hours, closed days, and booking window (**placeholder values**) |
| `slots.js` | Pure date and time-slot logic (no page access) |
| `ops.js` | Pure dashboard helpers: allowed status changes and daily totals |
| `login.js`, `home.js`, `book-service.js`, `book-schedule.js`, `book-confirmation.js`, `dashboard.js`, `history.js`, `reports.js` | One script per page |
| `theme.js` | Tailwind color theme, same as the wireframe |

Each page loads, in order: Tailwind, `theme.js`, the supabase-js CDN
script, `supabase-config.js`, `supabase-client.js`, then its own scripts.

## Conventions

- Text from the database is always written with `textContent`, never
  `innerHTML`, so stored values cannot inject markup.
- Page-level redirects (such as keeping clients off the dashboard) are a
  convenience only. Access is enforced by the database's Row Level Security.

## Known gaps

- No staff screen for managing the service catalog.
- Opening hours are placeholders and are not enforced by the database.
