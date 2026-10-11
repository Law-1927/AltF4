// ALTF4 — staff dashboard: today's bookings, status changes, live updates.
// Staff/admin only. The page check is for convenience; the database policies
// are what actually stop a client from reading or changing other people's data.
(async function () {
    'use strict';

    const $ = (id) => document.getElementById(id);
    const shop = window.ALT_SHOP;
    const S = window.ALT_SLOTS;
    const OPS = window.ALT_OPS;

    const BADGE = {
        Pending:   'bg-zinc-800 text-zinc-300 border-zinc-700',
        Ongoing:   'bg-yellow-900/30 text-yellow-500 border-yellow-900',
        Completed: 'bg-green-900/30 text-green-500 border-green-900',
        Cancelled: 'bg-red-900/30 text-red-400 border-red-900',
    };

    function showMessage(text, kind) {
        const msg = $('msg');
        msg.textContent = text; // textContent, never innerHTML
        msg.className = 'text-xs p-3 mb-4 border ' + (kind === 'ok'
            ? 'border-green-700 text-green-400 bg-green-950/30'
            : 'border-red-700 text-red-400 bg-red-950/30');
    }
    function clearMessage() { $('msg').className = 'hidden'; $('msg').textContent = ''; }

    const peso = (n) => '₱ ' + Number(n).toLocaleString('en-PH', { maximumFractionDigits: 2 });

    function td(className) {
        const cell = document.createElement('td');
        cell.className = className;
        return cell;
    }

    function statusCell(row) {
        const cell = td('py-3');
        const options = OPS.nextStatuses(row.status);
        const cls = 'p-1 px-2 border text-[10px] font-bold ' + (BADGE[row.status] || BADGE.Pending);

        if (options.length === 0) {           // final state: plain badge
            const badge = document.createElement('span');
            badge.className = cls;
            badge.textContent = row.status;
            cell.append(badge);
            return cell;
        }

        const select = document.createElement('select');
        select.className = cls + ' outline-none';
        select.setAttribute('aria-label', 'Status for ' + row.ref_id);
        [row.status, ...options].forEach((s) => select.append(new Option(s, s)));
        select.value = row.status;
        select.addEventListener('change', () => changeStatus(row, select));
        cell.append(select);
        return cell;
    }

    async function changeStatus(row, select) {
        const to = select.value;
        clearMessage();
        if (to === 'Cancelled' && !window.confirm('Cancel booking ' + row.ref_id + '? The client will be notified.')) {
            select.value = row.status;
            return;
        }
        select.disabled = true;
        const { error } = await ALT.db.from('appointments')
            .update({ status: to })
            .eq('id', row.id)
            .select('id')
            .single();
        if (error) showMessage('Could not update ' + row.ref_id + '. ' + error.message);
        else showMessage(row.ref_id + ' is now ' + to + '.', 'ok');
        await load(); // always re-read so the table shows the real saved state
    }

    function render(rows) {
        const body = $('rows');
        body.replaceChildren();
        $('empty').classList.toggle('hidden', rows.length > 0);

        rows.forEach((r) => {
            const tr = document.createElement('tr');
            const dim = r.status === 'Cancelled' ? ' text-zinc-600 line-through' : '';
            tr.className = 'border-b border-zinc-900' + dim;

            const time = td('py-3 pr-3 font-bold whitespace-nowrap');
            time.textContent = S.fmtTime(new Date(r.starts_at));
            const end = document.createElement('div');
            end.className = 'text-[10px] font-normal text-zinc-500';
            end.textContent = 'until ' + S.fmtTime(new Date(r.ends_at));
            time.append(end);

            const who = td('py-3 pr-3');
            const c = r.client || {};
            const v = r.vehicle || {};
            who.textContent = c.full_name || '(no name)';
            const sub = document.createElement('div');
            sub.className = 'text-[10px] text-zinc-500';
            sub.textContent = [(v.make || '') + ' ' + (v.model || ''), v.plate_number, c.phone]
                .filter((x) => x && x.trim()).join(' · ');
            who.append(sub);

            const svc = td('py-3 pr-3');
            svc.textContent = r.service ? r.service.name : '';
            const ref = document.createElement('div');
            ref.className = 'text-[10px] text-zinc-500';
            ref.textContent = r.ref_id;
            svc.append(ref);

            const total = td('py-3 pr-3 text-right whitespace-nowrap');
            total.textContent = peso(r.total_due_php);

            tr.append(time, who, svc, total, statusCell(r));
            body.append(tr);
        });

        const sum = OPS.summarize(rows);
        $('st-active').textContent = String(sum.active);
        $('st-completed').textContent = String(sum.completed);
        $('st-revenue').textContent = peso(sum.revenue);
    }

    let loadSeq = 0;
    async function load() {
        const date = $('date').value;
        if (!date) return;
        const seq = ++loadSeq;
        const day = S.dayBounds(date, shop.TZ_OFFSET);

        const { data, error } = await ALT.db.from('appointments')
            .select('id, ref_id, status, starts_at, ends_at, total_due_php, ' +
                    'client:profiles!client_id(full_name, phone), ' +
                    'vehicle:vehicles(make, model, plate_number), ' +
                    'service:services(name)')
            .gte('starts_at', day.start.toISOString())
            .lt('starts_at', day.end.toISOString())
            .order('starts_at');

        if (seq !== loadSeq) return; // a newer request replaced this one
        if (error) return showMessage('Could not load bookings. ' + error.message);
        render(data || []);
    }

    // ---- start-up -------------------------------------------------------
    const session = await ALT.requireSession();
    if (!session) return;

    let profile;
    try { profile = await ALT.getMyProfile(session.user.id); }
    catch (err) { return showMessage('Could not load your profile. ' + err.message); }
    if (!profile || !ALT.isStaff(profile.role)) {
        window.location.replace('home.html'); // clients have no dashboard
        return;
    }

    $('signout').addEventListener('click', () => ALT.signOut());
    $('date').value = S.todayInManila();
    $('date').addEventListener('change', load);
    $('prev').addEventListener('click', () => { $('date').value = S.addDays($('date').value || S.todayInManila(), -1); load(); });
    $('next').addEventListener('click', () => { $('date').value = S.addDays($('date').value || S.todayInManila(), 1); load(); });
    $('today').addEventListener('click', () => { $('date').value = S.todayInManila(); load(); });
    await load();

    // Live updates: any booking change refreshes the table (debounced so a
    // burst of changes causes one reload).
    let timer = null;
    ALT.db.channel('dashboard-live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
            clearTimeout(timer);
            timer = setTimeout(load, 300);
        })
        .subscribe();
})();
