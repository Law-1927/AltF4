# ALT F4 agent instructions

Project: Shimmer and Shield Car Coating booking system (static web frontend + Supabase).

## Architecture (verified)
- Static frontend in `frontend/app/` (HTML + plain JS, no build step, no package manager).
- supabase-js loaded from a CDN; the browser talks directly to Supabase. There is NO custom server (`backend/` is placeholders only).
- Schema is in `supabase/migrations/`. Row Level Security is enabled on every table; keep it that way.
- Shop hours in `frontend/app/js/shop-config.js` are placeholders awaiting the client.
- Setup steps: `docs/SETUP.md`.

## Rules
- Make small, focused changes for the one task given. Do not refactor unrelated files.
- Before editing, say which files you will change and why. Wait for my approval.
- Never read, print, or create `.env` files, keys, or credentials. Never add them to code.
- Use only fake or `[TEST]` data. Customer data is personal data (RA 10173).
- Database changes go in a NEW migration file in `supabase/migrations/`; never edit an existing migration.
- Do not install packages, add a build step, or add a backend server unless I ask.
- No tests exist yet. Say "NOT RUN" for anything you did not actually verify; describe how I can check it manually in the browser.
- Do not commit or push. I commit from the terminal.