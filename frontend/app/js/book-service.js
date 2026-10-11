// ALTF4 — booking step 1: choose (or add) a vehicle and choose a service.
// Clients only. Security note: the page logic below is for convenience; the
// database Row Level Security policies decide what each user may read/write.
(async function () {
    'use strict';

    const $ = (id) => document.getElementById(id);
    const state = { vehicles: [], vehicleId: null, service: null };

    function showMessage(text, kind) {
        const msg = $('msg');
        msg.textContent = text; // textContent, never innerHTML
        msg.className = 'text-xs p-3 mb-4 border ' + (kind === 'ok'
            ? 'border-green-700 text-green-400 bg-green-950/30'
            : 'border-red-700 text-red-400 bg-red-950/30');
    }
    function clearMessage() {
        $('msg').className = 'hidden';
        $('msg').textContent = '';
    }

    const peso = (n) => '₱ ' + Number(n).toLocaleString('en-PH', { maximumFractionDigits: 2 });
    function duration(mins) {
        if (mins >= 60 && mins % 60 === 0) {
            const h = mins / 60;
            return h + (h === 1 ? ' hour' : ' hours') + ' bay time';
        }
        return mins + ' minutes bay time';
    }
    const vehicleLabel = (v) =>
        v.make + ' ' + v.model + (v.type ? ' (' + v.type + ')' : '') +
        (v.plate_number ? ' - ' + v.plate_number : '');

    function updateContinue() {
        $('continue-btn').disabled = !(state.vehicleId && state.service);
    }

    // ---- vehicles -------------------------------------------------------
    function renderVehicles(selectId) {
        const sel = $('vehicle-select');
        sel.replaceChildren();
        if (state.vehicles.length === 0) sel.append(new Option('No vehicles yet', ''));
        state.vehicles.forEach((v) => sel.append(new Option(vehicleLabel(v), String(v.id))));
        sel.append(new Option('+ Add a new vehicle', 'new'));

        if (selectId) sel.value = String(selectId);
        else sel.value = state.vehicles.length ? String(state.vehicles[0].id) : 'new';
        onVehicleChange();
    }

    function onVehicleChange() {
        const value = $('vehicle-select').value;
        const adding = value === 'new';
        $('vehicle-form').classList.toggle('hidden', !adding);
        state.vehicleId = adding || value === '' ? null : Number(value);
        updateContinue();
    }

    // ---- services -------------------------------------------------------
    function renderServices(services) {
        const list = $('service-list');
        list.replaceChildren();
        if (services.length === 0) {
            const p = document.createElement('p');
            p.className = 'text-zinc-500';
            p.textContent = 'No services are available yet. Please check back soon.';
            list.append(p);
            return;
        }
        services.forEach((s) => {
            const card = document.createElement('button');
            card.type = 'button';
            card.setAttribute('role', 'radio');
            card.setAttribute('aria-checked', 'false');
            card.className = 'w-full text-left border border-zinc-800 p-3';

            const row = document.createElement('div');
            row.className = 'flex justify-between font-bold text-sm mb-1';
            const name = document.createElement('span');
            name.textContent = s.name;
            const price = document.createElement('span');
            price.className = 'text-altRed';
            price.textContent = peso(s.price_php);
            row.append(name, price);

            const detail = document.createElement('p');
            detail.className = 'text-zinc-500';
            const bits = [];
            if (s.warranty_years) bits.push(s.warranty_years + '-year warranty');
            bits.push(duration(s.duration_mins));
            detail.textContent = bits.join('. ') + '.';

            card.append(row, detail);
            if (s.description) {
                const d = document.createElement('p');
                d.className = 'text-zinc-600 mt-1';
                d.textContent = s.description;
                card.append(d);
            }

            card.addEventListener('click', () => {
                state.service = s;
                list.querySelectorAll('[role=radio]').forEach((el) => {
                    const on = el === card;
                    el.setAttribute('aria-checked', String(on));
                    el.className = 'w-full text-left p-3 border ' +
                        (on ? 'border-altRed bg-altRed/10' : 'border-zinc-800');
                });
                updateContinue();
            });
            list.append(card);
        });
    }

    // ---- start-up -------------------------------------------------------
    const session = await ALT.requireSession();
    if (!session) return;

    let profile;
    try {
        profile = await ALT.getMyProfile(session.user.id);
    } catch (err) {
        return showMessage('Could not load your profile. ' + err.message);
    }
    if (!profile) return showMessage('No profile found for this account.');
    if (ALT.isStaff(profile.role)) {
        window.location.replace('home.html'); // staff use the dashboard
        return;
    }
    $('f-name').value = profile.full_name || '';
    $('f-phone').value = profile.phone || '';

    const [vRes, sRes] = await Promise.all([
        ALT.db.from('vehicles')
            .select('id, make, model, type, plate_number')
            .eq('owner_id', session.user.id)
            .order('created_at'),
        ALT.db.from('services')
            .select('id, name, description, price_php, duration_mins, warranty_years')
            .eq('is_active', true)
            .order('price_php'),
    ]);

    if (vRes.error) showMessage('Could not load your vehicles. ' + vRes.error.message);
    state.vehicles = vRes.data || [];
    renderVehicles();

    if (sRes.error) showMessage('Could not load services. ' + sRes.error.message);
    renderServices(sRes.data || []);

    // ---- events ---------------------------------------------------------
    $('vehicle-select').addEventListener('change', onVehicleChange);

    $('v-cancel').addEventListener('click', () => {
        clearMessage();
        renderVehicles(state.vehicles.length ? state.vehicles[0].id : null);
    });

    $('vehicle-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        clearMessage();
        const make = $('v-make').value.trim();
        const model = $('v-model').value.trim();
        const type = $('v-type').value;
        const plate = $('v-plate').value.trim().toUpperCase();
        if (!make || !model) return showMessage('Enter the vehicle make and model.');

        const btn = $('v-save');
        btn.disabled = true;
        const { data, error } = await ALT.db.from('vehicles')
            .insert({ owner_id: session.user.id, make, model, type, plate_number: plate || null })
            .select('id, make, model, type, plate_number')
            .single();
        btn.disabled = false;

        if (error) return showMessage('Could not save the vehicle. ' + error.message);

        state.vehicles.push(data);
        $('vehicle-form').reset();
        renderVehicles(data.id);
        showMessage('Vehicle saved.', 'ok');
    });

    $('continue-btn').addEventListener('click', () => {
        const vehicle = state.vehicles.find((v) => v.id === state.vehicleId);
        if (!vehicle || !state.service) return;

        // Hand the choice to the next screen. Only IDs are trusted later:
        // the database recomputes price and duration when the booking is made.
        sessionStorage.setItem('altBooking', JSON.stringify({
            vehicleId: vehicle.id,
            vehicleLabel: vehicleLabel(vehicle),
            serviceId: state.service.id,
            serviceName: state.service.name,
        }));

        // TODO (step 3): window.location.href = 'book-schedule.html';
        showMessage('Selection saved. The date and time screen is built in the next step.', 'ok');
    });
})();
