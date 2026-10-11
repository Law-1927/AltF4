// ALTF4 — booking confirmation. Reads the booking back from the database, so
// what is shown is exactly what was saved (including the server-set price).
(async function () {
    'use strict';

    const $ = (id) => document.getElementById(id);
    const S = window.ALT_SLOTS;

    function showMessage(text) {
        const msg = $('msg');
        msg.textContent = text;
        msg.className = 'text-xs p-3 mb-4 border border-red-700 text-red-400 bg-red-950/30';
    }

    const session = await ALT.requireSession();
    if (!session) return;

    const id = Number(new URLSearchParams(window.location.search).get('id'));
    if (!Number.isInteger(id) || id <= 0) return showMessage('No booking was specified.');

    // Row Level Security means a client can only ever load their own booking.
    const { data, error } = await ALT.db.from('appointments')
        .select('ref_id, status, starts_at, ends_at, total_due_php, services(name), vehicles(make, model, plate_number)')
        .eq('id', id)
        .maybeSingle();

    if (error) return showMessage('Could not load the booking. ' + error.message);
    if (!data) return showMessage('Booking not found.');

    const start = new Date(data.starts_at);
    const end = new Date(data.ends_at);
    const v = data.vehicles || {};

    $('r-ref').textContent = data.ref_id;
    $('r-service').textContent = data.services ? data.services.name : '';
    $('r-vehicle').textContent = (v.make || '') + ' ' + (v.model || '') + (v.plate_number ? ' - ' + v.plate_number : '');
    $('r-date').textContent = S.fmtDateLong(start);
    $('r-time').textContent = S.fmtTime(start) + ' – ' + S.fmtTime(end);
    $('r-status').textContent = data.status;
    $('r-total').textContent = '₱ ' + Number(data.total_due_php).toLocaleString('en-PH', { maximumFractionDigits: 2 });
    $('receipt').classList.remove('hidden');
})();
