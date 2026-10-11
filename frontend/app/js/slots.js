// ALTF4 — pure slot/date helpers (no page access, so they can be unit tested).
(function (root) {
    'use strict';

    const TZ = 'Asia/Manila';

    function pad(n) { return String(n).padStart(2, '0'); }

    // 'YYYY-MM-DD' -> 0..6 (Sunday = 0), computed in UTC so the browser's own
    // time zone can never shift the day.
    function weekdayOf(dateStr) {
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    }

    function addDays(dateStr, n) {
        const [y, m, d] = dateStr.split('-').map(Number);
        const t = new Date(Date.UTC(y, m - 1, d + n));
        return t.getUTCFullYear() + '-' + pad(t.getUTCMonth() + 1) + '-' + pad(t.getUTCDate());
    }

    // Today's calendar date in the Philippines, as 'YYYY-MM-DD'.
    function todayInManila(now) {
        return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(now || new Date());
    }

    // Instant for "dateStr at minutesFromMidnight" in the shop's time zone.
    function toInstant(dateStr, minutes, offset) {
        return new Date(dateStr + 'T' + pad(Math.floor(minutes / 60)) + ':' + pad(minutes % 60) + ':00' + offset);
    }

    function dayBounds(dateStr, offset) {
        return { start: toInstant(dateStr, 0, offset), end: toInstant(addDays(dateStr, 1), 0, offset) };
    }

    function fmtTime(date) {
        return new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true }).format(date);
    }

    function fmtDateLong(date) {
        return new Intl.DateTimeFormat('en-US', {
            timeZone: TZ, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        }).format(date);
    }

    // First open day on or after `fromDate`.
    function firstOpenDay(fromDate, shop) {
        let d = fromDate;
        for (let i = 0; i < 8; i++) {
            if (!shop.CLOSED_WEEKDAYS.includes(weekdayOf(d))) return d;
            d = addDays(d, 1);
        }
        return fromDate;
    }

    // Build every possible start time for one day.
    //   status: 'free' | 'booked' | 'past'
    // A slot is 'booked' if ANY existing booking overlaps its full duration
    // (touching end-to-start is fine).
    function buildSlots(opts) {
        const { date, durationMins, shop, booked, now } = opts;
        if (shop.CLOSED_WEEKDAYS.includes(weekdayOf(date))) return { closed: true, slots: [] };

        const open = shop.OPEN_HOUR * 60;
        const close = shop.CLOSE_HOUR * 60;
        const slots = [];
        for (let t = open; t + durationMins <= close; t += shop.SLOT_STEP_MINS) {
            const start = toInstant(date, t, shop.TZ_OFFSET);
            const end = new Date(start.getTime() + durationMins * 60000);
            let status = 'free';
            if (start <= now) status = 'past';
            else if (booked.some((b) => new Date(b.starts_at) < end && new Date(b.ends_at) > start)) status = 'booked';
            slots.push({ start, end, label: fmtTime(start), status });
        }
        return { closed: false, slots };
    }

    const api = { weekdayOf, addDays, todayInManila, toInstant, dayBounds, fmtTime, fmtDateLong, firstOpenDay, buildSlots };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.ALT_SLOTS = api;
})(typeof window !== 'undefined' ? window : globalThis);
