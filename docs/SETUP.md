# Setup & Live Preview — ALTF4

How to get the project running on your own machine: open the repo, run the
frontend with **Live Server** in VS Code, and connect the Supabase backend.

> **Status:** the booking app (`frontend/app/`) and the Supabase schema
> (`supabase/migrations/`) are built and working. Production deployment
> (section 7) is still planned, so that section describes the intended
> setup, not something you can run today.

---

## 1. What you need

| Tool | Why | Check it with |
|---|---|---|
| [Git](https://git-scm.com/) | Clone and push the repo | `git --version` |
| [VS Code](https://code.visualstudio.com/) | Editor + Live Server | — |
| VS Code extension **Live Server** (by Ritwick Dey) | Live preview in the browser | Extensions panel |
| A modern browser (Chrome, Edge, Firefox) | Viewing the app | — |
| A free [Supabase](https://supabase.com/) account | Backend, auth, database, real-time | — |
| Internet connection | The wireframe loads Tailwind from a CDN | — |

Optional, only for running Supabase locally instead of the hosted project
(section 5): [Docker Desktop](https://www.docker.com/products/docker-desktop/)
and Node.js 18 or newer.

---

## 2. Get the code

```bash
git clone https://github.com/Law-1927/AltF4.git
cd AltF4
code .
```

Folder layout:

```
AltF4/
├── frontend/wireframes/   8-screen wireframe (HTML/CSS/JS, no build step)
├── backend/               placeholders (Supabase replaces most of this)
├── database/              original draft schema (superseded, see below)
├── supabase/migrations/   the real database schema for Supabase
└── docs/                  architecture, wireframes, this file
```

---

## 3. Live preview with Live Server

The frontend is plain HTML with no build step, so Live Server is all you need.
The steps below use the wireframe. To run the real app instead, open
`frontend/app/login.html` the same way
(URL: `http://127.0.0.1:5500/frontend/app/login.html`).

1. Install the **Live Server** extension in VS Code.
2. In the Explorer, open `frontend/wireframes/index.html`.
3. Right-click the file and choose **Open with Live Server**
   (or click **Go Live** in the bottom-right status bar).
4. Your browser opens at `http://127.0.0.1:5500/frontend/wireframes/`
   (the port may differ). The page reloads whenever you save a file.
5. To stop it, click the status bar item again (it now reads *Port: 5500*).

**Tip:** if you open the whole repo folder in VS Code, the URL contains
`/frontend/wireframes/`. If you open only `frontend/wireframes/` as the
workspace, the page is served from the root instead. Both work.

**Heads-up about file order.** `js/config.js` (the Tailwind theme) must stay
loaded directly after the Tailwind CDN `<script>` tag in `index.html`, or the
custom colors (`altRed`, `altDark`, `altPanel`) stop working.

### Opening on your phone (same Wi-Fi)

Live Server also serves on your computer's local network address. Find your
computer's IPv4 address, then browse to `http://<that-address>:5500/...` on
your phone. Useful for checking the mobile layout. On Windows, the firewall
may ask you to allow VS Code the first time.

---

## 4. Set up the Supabase backend (hosted)

This is the simplest route and what the team should use.

### 4.1 Create the project

1. Sign in at supabase.com and click **New project**.
2. Name it (for example `altf4`), set a strong database password, and choose
   the region closest to the Philippines (Southeast Asia / Singapore).
3. Wait for it to finish provisioning.

### 4.2 Apply the schema

1. In the Supabase dashboard, open **SQL Editor** and click **New query**.
2. Paste the full contents of
   `supabase/migrations/20261009000000_initial_schema.sql`.
3. Click **Run**. It should finish with no errors.

It creates the tables, the double-booking rule, row-level security, the
notification triggers, the `reports_daily` view, and the real-time
publication. **Run it once.** Running it twice fails because the tables
already exist. To start over, create a fresh Supabase project (simplest) or drop the tables first.

### 4.3 Create your first admin

New signups are always clients. To make yourself an admin:

1. Sign up through the app (or **Authentication > Users > Add user** in the
   dashboard).
2. In the SQL Editor, run:

```sql
update public.profiles
set role = 'admin'
where email = 'your-email@example.com';
```

Use `'staff'` instead of `'admin'` for staff accounts.

### 4.4 Add services

The schema ships with an empty service catalog. Add the real services and
prices (ask the client for the actual list):

```sql
insert into public.services (name, description, price_php, duration_mins, warranty_years)
values ('Service name', 'Short description', 0.00, 60, null);
```

For development, `supabase/seed_test_services.sql` adds three `[TEST]` sample
services. `duration_mins` is how long the bay is occupied. It is also what the
double-booking rule uses.

### 4.5 Find your API keys

In **Project Settings > API** you need two values:

| Value | Safe in the frontend? |
|---|---|
| **Project URL** (`https://xxxx.supabase.co`) | Yes |
| **anon / public key** | Yes. Row-level security is what protects the data |
| **service_role key** | **NO. Never.** It bypasses all security |

> **Rule for the whole team:** never put the `service_role` key in frontend
> code, in a commit, in a screenshot, or in a chat. If it leaks, rotate it in
> the dashboard immediately.

---

## 5. Run Supabase locally instead (optional)

Only needed if you want an offline copy of the backend. Requires Docker
Desktop running.

```bash
npx supabase init          # creates supabase/config.toml (first time only)
npx supabase start         # starts the local stack in Docker
npx supabase db reset      # applies everything in supabase/migrations/
```

`supabase start` prints a local API URL and keys; use those in place of the
hosted values. The local dashboard (Studio) is at `http://127.0.0.1:54323`.

Stop it with `npx supabase stop`.

---

## 6. How the frontend connects to Supabase

The app in `frontend/app/` is already wired up. Its connection settings are
in one file, `frontend/app/js/supabase-config.js`: the Project URL and the
**publishable** key. Both are safe to commit. Every page loads the
supabase-js library from a CDN, then that config, then
`supabase-client.js`, which creates the shared client.

- **Using the team's Supabase project:** nothing to change.
- **Using your own Supabase project for testing:** apply the migration to it
  (section 4), then put your own URL and publishable key in that one file.
  Do not commit that change over the team's values.
- **Never** put the secret key (`sb_secret_...`) or the legacy
  `service_role` key anywhere in `frontend/`.

New signups only get a session right away if **Confirm email** is off in
Supabase (**Authentication > Sign In / Providers > Email**). Switching it off
is fine for development. Switch it back on before real use.

### Enable email confirmation and configure Brevo SMTP

The registration form sends its confirmation redirect back to the current
`login.html` URL. Configure Supabase's redirect allow list to include the exact
local URL you use and the production login URL before testing this flow.

1. **Prepare a sender domain in Brevo.** Create a Brevo account, add a domain
   you control, and authenticate it by adding the DNS records Brevo provides.
   Wait until Brevo reports the domain as authenticated. Use a sender address
   on that domain; do not use a customer's address as the sender.
2. **Get SMTP credentials.** In Brevo, open **Transactional > Settings >
   SMTP & API** (menu wording may vary), then create/copy an SMTP key. Use the
   SMTP key, not a Brevo API key. Keep it private.
3. **Configure Supabase SMTP.** In the Supabase project, open
   **Authentication > Email > SMTP Settings** (or **Authentication > Settings
   > SMTP**, depending on the dashboard version), enable custom SMTP, then set:

   | Supabase field | Brevo value |
   |---|---|
   | Sender email | The authenticated sender address you chose |
   | Sender name | `Shimmer and Shield` |
   | Host | `smtp-relay.brevo.com` |
   | Port | `587` |
   | Username | The SMTP login shown in Brevo |
   | Password | The Brevo SMTP key |

   Save the settings. Never put SMTP credentials in frontend files, SQL
   migrations, commits, screenshots, or chat.
4. **Set allowed callback URLs.** Open **Authentication > URL Configuration**.
   Set the Site URL to the deployed app's origin. Add the exact login page URL
   to the redirect allow list, for example
   `http://127.0.0.1:5500/frontend/app/login.html` for Live Server and
   `https://your-domain.example/frontend/app/login.html` for production.
   Use the actual host, port, and deployed path. Do not use a broad wildcard
   for production.
5. **Turn confirmation on.** Under **Authentication > Sign In / Providers >
   Email** (menu wording may vary), enable **Confirm email** and save.
   Keep the **Confirm signup** email template's `{{ .ConfirmationURL }}`
   link (or a correctly configured token link) so Supabase can verify the
   address and apply the allowed redirect. Registration should report that a
   confirmation email was sent; the user must follow its link and then log in.
6. **Test delivery.** Register with an address you can access that is not a
   Supabase organization/team address. Confirm the email, verify the link
   returns to the app, and log in. Check the Supabase Auth logs and the Brevo
   email activity if delivery fails; also check spam and the sender-domain DNS
   status.

Brevo advertises a free sending allowance (historically up to 300 emails/day);
check its current [pricing and limits](https://www.brevo.com/pricing/) before
relying on it. Supabase's built-in mailer is for development only and has
strict recipient restrictions and low rate limits. See the current
[Supabase custom SMTP guide](https://supabase.com/docs/guides/auth/auth-smtp)
and [Brevo SMTP guide](https://help.brevo.com/hc/en-us/articles/7924908994450-Send-transactional-emails-using-Brevo-SMTP)
if dashboard labels or provider limits have changed.

The pages and what each does are listed in `frontend/README.md`.

---

## 7. Going live (deployment) (planned)

Two different meanings of "live":

| | Live Server (section 3) | Production deploy |
|---|---|---|
| Where | Your computer only | The public internet |
| Purpose | Developing and testing | Real client use |
| Backend | Any Supabase project | A separate **production** Supabase project |

When the system is ready for the client:

1. Create a **second** Supabase project for production. Do not test against
   real client data.
2. Apply the same migration to it.
3. Host the frontend on a static host (Cloudflare Pages, Netlify, Vercel, or
   GitHub Pages all have free tiers) with the production URL and anon key.
4. In Supabase **Authentication > URL Configuration**, set the Site URL and
   redirect URLs to the deployed address.
5. Turn on email confirmation and review password rules.
6. Create the real admin and staff accounts.
7. Check the **free tier limits**. Free Supabase projects can pause after a
   period of inactivity, which would break a live booking system. Confirm the
   current limits on Supabase's pricing page and decide whether the client
   needs a paid plan.

---

## 8. Troubleshooting

| Problem | Likely cause and fix |
|---|---|
| Live Server shows unstyled page | No internet (Tailwind CDN) or `config.js` moved before the Tailwind tag |
| Right-click has no "Open with Live Server" | Extension not installed or VS Code needs a reload |
| Port 5500 already in use | Live Server picks the next port; use the URL it opens |
| Migration fails with "already exists" | It was already applied; do not run it twice |
| Migration fails on `supabase_realtime` | Run it in a Supabase project, not a plain Postgres database |
| Signup works but no profile row | The `on_auth_user_created` trigger did not run; re-apply the migration on a fresh project |
| Booking rejected "violates exclusion constraint" | That time overlaps an existing booking. This is the double-booking rule working |
| Booking rejected "Appointment must start in the future" | The start time is in the past |
| Query returns empty for a signed-in user | Row-level security. The user is probably not the owner or not staff |
| `npx supabase start` fails | Docker Desktop is not running |
| Home page says "Could not load your profile" | The profile row is missing, or the migration was not applied to this project |
| Booking page lists no services | The catalog is empty. Run `supabase/seed_test_services.sql` for test data |
| A new signup stays on the login page | Email confirmation is on. Confirm via the email, or switch it off for testing |
| Slots or the dashboard do not update live | Run `select tablename from pg_publication_tables where pubname = 'supabase_realtime';` It should list `appointments`, `booked_slots`, and `notifications` |

---

## 9. Notes for the team

- `database/schema.sql` is the original SQLite-style draft. It is kept for
  reference only. The schema used by the project is in
  `supabase/migrations/`.
- Change the database through new migration files, not by editing the one
  already applied. Name them with a timestamp prefix, for example
  `20261015000000_add_staff_assignments.sql`.
- The backend is decided (Supabase). Open decisions: number of service bays,
  business hours and days off, staff assignment, and add-ons or bundles.
