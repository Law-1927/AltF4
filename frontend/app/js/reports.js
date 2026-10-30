// ALTF4 — staff reports and cloud records (T7).
// Allows date-range and criteria filtering, real-time metrics rollup, and CSV export.
(async function () {
    'use strict';

    const $ = (id) => document.getElementById(id);
    const shop = window.ALT_SHOP;
    const S = window.ALT_SLOTS;

    const BADGE = {
        Pending:   'bg-zinc-800 text-zinc-300 border-zinc-700',
        Ongoing:   'bg-yellow-900/30 text-yellow-500 border-yellow-900',
        Completed: 'bg-green-900/30 text-green-500 border-green-900',
        Cancelled: 'bg-red-900/30 text-red-400 border-red-900',
    };

    let cachedRows = [];

    function showMessage(text, kind) {
        const msg = $('msg');
        msg.textContent = text;
        msg.className = 'text-xs p-3 mb-4 border ' + (kind === 'ok'
            ? 'border-green-700 text-green-400 bg-green-950/30'
            : 'border-red-700 text-red-400 bg-red-950/30');
    }
    function clearMessage() {
        $('msg').className = 'hidden';
        $('msg').textContent = '';
    }

    const peso = (n) => '₱ ' + Number(n).toLocaleString('en-PH', { maximumFractionDigits: 2 });

    function td(className) {
        const cell = document.createElement('td');
        cell.className = className;
        return cell;
    }

    function render(rows) {
        cachedRows = rows;
        const body = $('rows');
        body.replaceChildren();
        $('empty').classList.toggle('hidden', rows.length > 0);

        let centavos = 0;
        let completedCount = 0;
        let activeCount = 0;

        rows.forEach((r) => {
            if (r.status === 'Completed') {
                completedCount += 1;
                centavos += Math.round(Number(r.total_due_php) * 100);
            } else if (r.status === 'Pending' || r.status === 'Ongoing') {
                activeCount += 1;
            }

            const tr = document.createElement('tr');
            const dim = r.status === 'Cancelled' ? ' text-zinc-600 line-through' : '';
            tr.className = 'border-b border-zinc-900 hover:bg-zinc-900/40' + dim;

            const start = new Date(r.starts_at);
            const end = new Date(r.ends_at);

            // Date & Time
            const timeCell = td('p-3 font-mono text-[11px] whitespace-nowrap');
            timeCell.textContent = S.fmtTime(start);
            const dateSub = document.createElement('div');
            dateSub.className = 'text-[10px] text-zinc-500 font-sans';
            dateSub.textContent = S.fmtDateLong(start);
            timeCell.append(dateSub);

            // Ref ID
            const refCell = td('p-3 font-mono font-bold text-white');
            refCell.textContent = r.ref_id;

            // Client
            const clientCell = td('p-3');
            const c = r.client || {};
            clientCell.textContent = c.full_name || '(no name)';
            if (c.phone) {
                const phoneSub = document.createElement('div');
                phoneSub.className = 'text-[10px] text-zinc-500';
                phoneSub.textContent = c.phone;
                clientCell.append(phoneSub);
            }

            // Vehicle
            const vehicleCell = td('p-3');
            const v = r.vehicle || {};
            vehicleCell.textContent = [(v.make || '') + ' ' + (v.model || '')].filter(Boolean).join(' ') || '(unspecified)';
            if (v.plate_number) {
                const plateSub = document.createElement('div');
                plateSub.className = 'text-[10px] text-zinc-500';
                plateSub.textContent = v.plate_number;
                vehicleCell.append(plateSub);
            }

            // Service
            const serviceCell = td('p-3');
            serviceCell.textContent = r.service ? r.service.name : '-';

            // Total Due
            const totalCell = td('p-3 text-right font-mono font-bold text-altRed whitespace-nowrap');
            totalCell.textContent = peso(r.total_due_php);

            // Status Badge
            const statusCell = td('p-3');
            const badge = document.createElement('span');
            badge.className = 'p-1 px-2 border text-[10px] font-bold ' + (BADGE[r.status] || BADGE.Pending);
            badge.textContent = r.status;
            statusCell.append(badge);

            tr.append(timeCell, refCell, clientCell, vehicleCell, serviceCell, totalCell, statusCell);
            body.append(tr);
        });

        $('st-revenue').textContent = peso(centavos / 100);
        $('st-completed').textContent = String(completedCount);
        $('st-active').textContent = String(activeCount);
        $('st-total').textContent = String(rows.length);
    }

    let loadSeq = 0;
    async function load() {
        clearMessage();
        const seq = ++loadSeq;

        const dateFrom = $('date-from').value;
        const dateTo = $('date-to').value;
        const status = $('filter-status').value;
        const serviceId = $('filter-service').value;

        let query = ALT.db.from('appointments')
            .select('id, ref_id, status, starts_at, ends_at, total_due_php, service_id, ' +
                    'client:profiles!appointments_client_id_fkey(full_name, phone, email), ' +
                    'vehicle:vehicles(make, model, plate_number), ' +
                    'service:services(name)');

        if (dateFrom) {
            const startBounds = S.dayBounds(dateFrom, shop.TZ_OFFSET);
            query = query.gte('starts_at', startBounds.start.toISOString());
        }
        if (dateTo) {
            const endBounds = S.dayBounds(dateTo, shop.TZ_OFFSET);
            query = query.lt('starts_at', endBounds.end.toISOString());
        }
        if (status) {
            query = query.eq('status', status);
        }
        if (serviceId) {
            query = query.eq('service_id', Number(serviceId));
        }

        query = query.order('starts_at', { ascending: false });

        const { data, error } = await query;
        if (seq !== loadSeq) return;

        if (error) {
            showMessage('Could not load reports data: ' + error.message, 'error');
            return;
        }

        render(data || []);
    }

    function exportToCsv() {
        if (!cachedRows || cachedRows.length === 0) {
            showMessage('No records to export in the current selection.', 'error');
            return;
        }

        const headers = [
            'Reference ID',
            'Date',
            'Start Time',
            'End Time',
            'Client Name',
            'Client Phone',
            'Client Email',
            'Vehicle',
            'Plate Number',
            'Service',
            'Status',
            'Total Due (PHP)'
        ];

        const escapeCsv = (val) => {
            let s = (val === null || val === undefined) ? '' : String(val);
            if (/^[\u0000-\u0020]*[=+\-@]/.test(s)) s = "'" + s;
            if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
                return '"' + s.replace(/"/g, '""') + '"';
            }
            return s;
        };

        const lines = [headers.map(escapeCsv).join(',')];

        cachedRows.forEach((r) => {
            const start = new Date(r.starts_at);
            const end = new Date(r.ends_at);
            const c = r.client || {};
            const v = r.vehicle || {};
            const svc = r.service || {};

            const row = [
                r.ref_id,
                S.fmtDateLong(start),
                S.fmtTime(start),
                S.fmtTime(end),
                c.full_name || '',
                c.phone || '',
                c.email || '',
                [(v.make || ''), (v.model || '')].filter(Boolean).join(' '),
                v.plate_number || '',
                svc.name || '',
                r.status,
                r.total_due_php
            ];

            lines.push(row.map(escapeCsv).join(','));
        });

        const csvContent = lines.join('\r\n');
        // Prepend UTF-8 BOM so Microsoft Excel correctly recognizes UTF-8 encoding
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const fromLabel = $('date-from').value || 'all';
        const toLabel = $('date-to').value || 'all';
        const filename = 'altf4-report-' + fromLabel + '-to-' + toLabel + '.csv';

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async function populateServices() {
        const { data, error } = await ALT.db.from('services').select('id, name').order('name');
        if (error) return error;
        const select = $('filter-service');
        (data || []).forEach((s) => {
            select.append(new Option(s.name, s.id));
        });
        return null;
    }

    function setPresetDates(type) {
        const today = S.todayInManila();
        if (type === 'today') {
            $('date-from').value = today;
            $('date-to').value = today;
        } else if (type === 'week') {
            $('date-from').value = S.addDays(today, -6);
            $('date-to').value = today;
        } else if (type === 'month') {
            const [y, m] = today.split('-');
            $('date-from').value = `${y}-${m}-01`;
            $('date-to').value = today;
        } else if (type === 'all') {
            $('date-from').value = '';
            $('date-to').value = '';
        }
        load();
    }

    // ---- start-up -------------------------------------------------------
    const session = await ALT.requireSession();
    if (!session) return;

    let profile;
    try {
        profile = await ALT.getMyProfile(session.user.id);
    } catch (err) {
        showMessage('Could not load profile: ' + err.message, 'error');
        return;
    }

    if (!profile || !ALT.isStaff(profile.role)) {
        window.location.replace('home.html');
        return;
    }

    $('signout').addEventListener('click', () => ALT.signOut());
    $('btn-filter').addEventListener('click', load);
    $('btn-export-csv').addEventListener('click', exportToCsv);

    $('preset-today').addEventListener('click', () => setPresetDates('today'));
    $('preset-week').addEventListener('click', () => setPresetDates('week'));
    $('preset-month').addEventListener('click', () => setPresetDates('month'));
    $('preset-all').addEventListener('click', () => setPresetDates('all'));

    $('filter-status').addEventListener('change', load);
    $('filter-service').addEventListener('change', load);

    const serviceError = await populateServices();

    // Default to current month
    setPresetDates('month');
    if (serviceError) showMessage('Could not load services for report filters: ' + serviceError.message, 'error');
})();
