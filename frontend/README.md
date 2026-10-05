# Frontend

## Current contents

- `wireframes/` — the 8-screen UI/UX wireframe board, split into:
  - `index.html` — structure/markup only
  - `css/style.css` — all custom styles
  - `js/config.js` — Tailwind theme config (must stay loaded right after the Tailwind CDN `<script>` tag)

## Where the real app goes later

Once wireframes are approved, this folder is where the actual client-facing
app source lives. The wireframe screens map to these planned pages:

| # | Screen | Planned route |
|---|--------|----------------|
| 1 | Auth (Login/Register) | `/login`, `/register` |
| 2 | Service & Details | `/book/service` |
| 3 | Date & Time Sync | `/book/schedule` |
| 4 | Confirmation | `/book/confirmation` |
| 5–6 | Staff Dashboard (Monitoring) | `/staff/dashboard` |
| 7 | Automated Notice | (system-triggered, no dedicated route) |
| 8 | Reports & Storage | `/staff/reports` |
