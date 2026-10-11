// ALTF4 — booking step 2: pick a date and an open time slot, then book.
// Clients only. The database has the final say: its exclusion constraint
// rejects any overlapping booking, even if two clients click at once.
(async function () {
    'use strict';

    const $ = (id) => document.getElementById(id);
    const shop = window.ALT_SHOP;
    const S = window.ALT_SLOTS;

    let service = null;
    let vehicle = null;
    let selected = null;     // the chosen slot object
    let loadSeq = 0;         // guards against out-of-order responses

    function showMessage(text, kind) {
        const msg = $('msg');
        msg.textContent = text; // textContent, never innerHTML
        msg.className = 'text-xs p-3 mb-4 border ' + (kind === 'ok'
            ? 'border-green-700 text-green-400 bg-green-950/30'
            : 'border-red-700 text-red-400 bg-red-950/30');
    }
    function clearMessage() { $('msg').className = 'hidden'; $('msg').textContent = ''; }

    const peso = (n) => '₱ ' + Number(n).toLocaleString('en-PH', { maximumFractionDigits: 2 });
    function duration(mins) {
        if (mins >= 60 && mins % 60 === 0) {
            const h = mins / 60;
            return h + (h === 1 ? ' hour' : ' hours');
        }
        return mins + ' minutes';
    }
    const vehicleLabel = (v) => v.make + ' ' + v.model + (v.plate_number ? ' - ' + v.plate_number : '');

    function readDraft() {
        try {
            const d = JSON.parse(sessionStorage.getItem('altBooking'));
            if (d && Number.isInteger(d.vehicleId) && Number.isInteger(d.serviceId)) return d;
        } catch (_) { /* fall through */ }
        return null;
    }

    function updateConfirm() { $('confirm-btn').disabled = !selected; }

    function setCheck(text, ok) {
        const el = $('check');
        el.textContent = '';
        const label = document.createElement('span');
        label.className = (ok ? 'text-green-500' : 'text-red-500') + ' font-bold';
        label.textContent = 'System Check: ';
        el.append(label, document.createTextNode(text));
        el.classList.remove('hidden');
    }

    function renderSlots(result) {
        const grid = $('slots');
        grid.replaceChildren();

        if (result.closed) {
            setCheck('The shop is closed on this day. Please pick another date.', false);
            return;
        }
        const free = result.slots.filter((s) => s.status === 'free');
        if (result.slots.length === 0) {
            setCheck('This service cannot be scheduled within shop hours. Please contact the shop.', false);
        } else if (free.length === 0) {
            setCheck('No open slots on this day. Please try another date.', false);
        } else {
            setCheck('The bay is available for ' + service.name + ' (' + duration(service.duration_mins) + ').', true);
        }

        result.slots.forEach((s) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.textContent = s.label;
            const isSel = selected && selected.start.getTime() === s.start.getTime();
            if (s.status !== 'free') {
                b.disabled = true;
                b.className = 'p-2 border border-zinc-800 ' +
                    (s.status === 'booked' ? 'line-through text-zinc-600' : 'text-zinc-700');
                b.title = s.status === 'booked' ? 'Already booked' : 'Time has passed';
            } else {
                b.className = 'p-2 border ' + (isSel
                    ? 'border-altRed bg-altRed text-white font-bold'
                    : 'border-zinc-700 hover:border-altRed');
                b.addEventListener('click', () => {
                    selected = s;
                    clearMessage();
                    renderSlots(result);
                    updateConfirm();
                });
            }
            grid.append(b);
        });
    }

    async function loadSlots() {
        const date = $('date').value;
        const previous = selected ? selected.start.getTime() : null;
        selected = null;
        updateConfirm();
        if (!date) return;

        const today = S.todayInManila();
        const last = S.addDays(today, shop.BOOKING_WINDOW_DAYS);
        if (date < today || date > last) {
            $('slots').replaceChildren();
            return setCheck('Please choose a date within the next ' + shop.BOOKING_WINDOW_DAYS + ' days.', false);
        }

        const seq = ++loadSeq;
        const day = S.dayBounds(date, shop.TZ_OFFSET);
        const { data, error } = await ALT.db.from('booked_slots')
            .select('starts_at, ends_at')
            .lt('starts_at', day.end.toISOString())
            .gt('ends_at', day.start.toISOString());
        if (seq !== loadSeq) return; // a newer request replaced this one
        if (error) return showMessage('Could not load availability. ' + error.message);

        const result = S.buildSlots({
            date, durationMins: service.duration_mins, shop, booked: data || [], now: new Date(),
        });

        // Keep the chosen slot if it is still free; warn if someone just took it.
        if (previous !== null) {
            const still = result.slots.find((s) => s.start.getTime() === previous && s.status === 'free');
            if (still) selected = still;
            else showMessage('The slot you picked was just taken. Please choose another.');
        }
        renderSlots(result);
        updateConfirm();
    }

    // ---- start-up -------------------------------------------------------
    const session = await ALT.requireSession();
    if (!session) return;

    let profile;
    try { profile = await ALT.getMyProfile(session.user.id); }
    catch (err) { return showMessage('Could not load your profile. ' + err.message); }
    if (!profile) return showMessage('No profile found for this account.');
    if (ALT.isStaff(profile.role)) { window.location.replace('home.html'); return; }

    const draft = readDraft();
    if (!draft) { window.location.replace('book-service.html'); return; }

    // Re-read the service and vehicle from the database instead of trusting
    // what the previous page stored.
    const [sRes, vRes] = await Promise.all([
        ALT.db.from('services').select('id, name, price_php, duration_mins')
            .eq('id', draft.serviceId).eq('is_active', true).maybeSingle(),
        ALT.db.from('vehicles').select('id, make, model, type, plate_number')
            .eq('id', draft.vehicleId).eq('owner_id', session.user.id).maybeSingle(),
    ]);
    if (sRes.error || vRes.error || !sRes.data || !vRes.data) {
        return showMessage('Your selection is no longer available. Please go back and choose again.');
    }
    service = sRes.data;
    vehicle = vRes.data;

    $('s-service').textContent = service.name;
    $('s-vehicle').textContent = vehicleLabel(vehicle);
    $('s-duration').textContent = duration(service.duration_mins) + ' bay time';
    $('s-price').textContent = peso(service.price_php);
    $('summary').classList.remove('hidden');

    const today = S.todayInManila();
    $('date').min = today;
    $('date').max = S.addDays(today, shop.BOOKING_WINDOW_DAYS);
    $('date').value = S.firstOpenDay(today, shop);
    $('date').addEventListener('change', loadSlots);
    await loadSlots();

    // Live updates: refresh whenever anyone's booking changes the slot table.
    ALT.db.channel('booked-slots-live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'booked_slots' }, () => loadSlots())
        .subscribe();

    // ---- confirm --------------------------------------------------------
    $('confirm-btn').addEventListener('click', async () => {
        if (!selected) return;
        const btn = $('confirm-btn');
        btn.disabled = true;
        clearMessage();

        // We send only WHAT and WHEN. The database sets the reference number,
        // end time and price itself.
        const { data, error } = await ALT.db.from('appointments')
            .insert({
                client_id: session.user.id,
                vehicle_id: vehicle.id,
                service_id: service.id,
                starts_at: selected.start.toISOString(),
            })
            .select('id')
            .single();

        if (error) {
            showMessage(error.code === '23P01'
                ? 'Sorry, that time was just taken. Please choose another slot.'
                : 'Could not complete the booking. ' + error.message);
            await loadSlots();
            return;
        }
        sessionStorage.removeItem('altBooking');
        window.location.replace('book-confirmation.html?id=' + data.id);
    });
})();
