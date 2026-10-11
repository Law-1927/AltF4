// ALTF4 — shop schedule used by the booking screen.
//
// PLACEHOLDER VALUES: confirm the real hours and closed days with the client
// (Shimmer and Shield) and change them here.
//
// IMPORTANT: this only controls what the booking screen OFFERS. The database
// does not enforce opening hours yet, so a direct API call could still book
// outside them. A database rule should be added before going live.
window.ALT_SHOP = {
    TZ_OFFSET: '+08:00',        // Philippines (no daylight saving)
    OPEN_HOUR: 9,               // 9:00 AM
    CLOSE_HOUR: 18,             // 6:00 PM — a job must FINISH by this time
    CLOSED_WEEKDAYS: [0],       // 0 = Sunday, 1 = Monday, ... 6 = Saturday
    SLOT_STEP_MINS: 60,         // a new start time every hour
    BOOKING_WINDOW_DAYS: 60,    // how far ahead clients can book
};
