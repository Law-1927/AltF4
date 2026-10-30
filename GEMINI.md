ALT F4 — Shimmer and Shield Car Coating Management System

Overview



Digital management system for Shimmer and Shield Car Coating, automating appointment scheduling and centralizing customer/vehicle records. Built by team ALT F4 (CvSU).



Team

Kenji Barredo — Project Manager

Aaron Julius Hoy — Team member

Lawrence Maullon — Team member

Ken Heinrich Ramos — Team member

Angela Graido — Branch Manager (client-side, Shimmer and Shield)

Stack

Frontend: Vanilla HTML/CSS/JS + supabase-js (served via Live Server)

Backend: Supabase (PostgreSQL, Auth, Realtime)

Repository: https://github.com/Law-1927/AltF4

Branches: main (scaffold + migrations), docs/obsidian-vault (Obsidian vault + audit notes)

Current State

Login/register, vehicle + service selection, date/slot booking, confirmation, and staff dashboard are built and tested in frontend/app/.

Initial Supabase schema migration ran successfully.

Obsidian vault lives in docs/ with AI engineering task cards and experiment records.

Shop hours are placeholders (Mon–Sat 9–6) pending client confirmation.

Open Backlog

T6: Client booking history and notices

T7: Reports and CSV export

Mobile app version (planned, not started)

Ways of Working

Distinguish between changes that can be applied directly vs. those requiring team input — maintain that distinction when proposing edits.

Layout and formatting on documents are handled by the team, not the agent.

Prefer clean restarts over layered edits when documents need rebuilding.

Document pipeline (when generating .docx): Node.js docx package → soffice headless PDF → pdftoppm JPEG render → visual inspection.
