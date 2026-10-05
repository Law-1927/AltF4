# Wireframe Walkthrough

Source: `frontend/wireframes/index.html`. Eight screens, laid out
left-to-right as one continuous customer-to-staff flow, localized for
the Philippines (PHP pricing, local names and phone number format).

| # | Screen | Actor | Key elements |
|---|--------|-------|--------------|
| 1 | Auth (Login/Register) | Client | Email/password login, register toggle |
| 2 | Service & Details | Client | Vehicle selector, service catalog with PHP pricing (Ceramic Pro ₱45,000, Standard PMS ₱8,500, Deep Detailing ₱12,000) |
| 3 | Date & Time Sync | Client | Live bay-availability check, date picker, slot grid (booked slots shown struck through) |
| 4 | Confirmation | Client | Booking reference ID, summary, total due |
| 5–6 | Staff Dashboard (Monitoring) | Staff | Daily appointment table — time, client/car, service, status dropdown (Ongoing/Completed) |
| 7 | Automated Notice | System → Client | Chat-style notification mockup (e.g. "ready for pickup" message) |
| 8 | Reports & Storage | Staff | Daily revenue, completed-job count, per-client cloud records, PDF warranty download, CSV export |

## Design notes

- Dark theme (`#111` background, `#E60000` "altRed" accent) throughout.
- `.wireframe-screen` is a fixed-width "device frame" (375px default,
  wider for dashboard/report screens).
- Connector arrows between screens show the flow direction; the dashed
  connector before the Staff Dashboard is labeled "Data Sync → To
  Staff" to call out the frontend/backend handoff.

## Known gaps to flag for the team

- No screen yet for a client's appointment history / past records view.
- No screen yet for service catalog management (staff adding/editing
  services or prices).
- No error/validation states shown (e.g. failed login, fully booked day).
