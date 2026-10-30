// ALTF4 — client booking history and notices (T6).
// Displays upcoming and past appointments with cancellation for Pending bookings,
// plus real-time in-app notifications.
(async function () {
    'use strict';

    const $ = (id) => document.getElementById(id);
    const S = window.ALT_SLOTS;

    const BADGE = {
        Pending:   'bg-zinc-800 text-zinc-300 border-zinc-700',
        Ongoing:   'bg-yellow-900/30 text-yellow-500 border-yellow-900',
        Completed: 'bg-green-900/30 text-green-500 border-green-900',
        Cancelled: 'bg-red-900/30 text-red-400 border-red-900',
    };

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

    function fmtTimestamp(isoStr) {
        if (!isoStr) return '';
        const d = new Date(isoStr);
        return new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Manila',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        }).format(d);
    }

    async function handleCancel(booking) {
        clearMessage();
        const ok = window.confirm('Cancel appointment ' + booking.ref_id + '? This cannot be undone.');
        if (!ok) return;

        try {
            const { error } = await ALT.db.rpc('cancel_appointment', { p_id: booking.id });
            if (error) {
                showMessage('Could not cancel booking: ' + error.message, 'error');
                return;
            }
            showMessage('Appointment ' + booking.ref_id + ' has been cancelled.', 'ok');
            await loadAll();
        } catch (err) {
            showMessage('Error cancelling booking: ' + err.message, 'error');
        }
    }

    function createBookingCard(b, isUpcoming) {
        const card = document.createElement('div');
        const isCancelled = b.status === 'Cancelled';
        card.className = 'bg-zinc-950 border border-zinc-800 rounded p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs' +
            (isCancelled ? ' opacity-75' : '');

        const left = document.createElement('div');
        left.className = 'space-y-1';

        const topRow = document.createElement('div');
        topRow.className = 'flex items-center gap-2 flex-wrap';

        const ref = document.createElement('span');
        ref.className = 'font-mono font-bold text-sm tracking-wide text-white';
        ref.textContent = b.ref_id;

        const badge = document.createElement('span');
        badge.className = 'p-1 px-2 border text-[10px] font-bold ' + (BADGE[b.status] || BADGE.Pending);
        badge.textContent = b.status;

        topRow.append(ref, badge);

        const svc = document.createElement('div');
        svc.className = 'font-bold text-zinc-200 text-sm';
        svc.textContent = b.service ? b.service.name : 'Service';

        const veh = document.createElement('div');
        veh.className = 'text-zinc-400';
        const v = b.vehicle || {};
        veh.textContent = [(v.make || '') + ' ' + (v.model || ''), v.plate_number].filter((x) => x && x.trim()).join(' · ');

        const schedule = document.createElement('div');
        schedule.className = 'text-zinc-500 text-[11px]';
        const start = new Date(b.starts_at);
        const end = new Date(b.ends_at);
        schedule.textContent = S.fmtDateLong(start) + ' • ' + S.fmtTime(start) + ' – ' + S.fmtTime(end);

        left.append(topRow, svc, veh, schedule);

        const right = document.createElement('div');
        right.className = 'flex sm:flex-col items-end justify-between sm:justify-center gap-2 border-t sm:border-t-0 border-zinc-900 pt-2 sm:pt-0';

        const total = document.createElement('div');
        total.className = 'text-right';
        const totalLbl = document.createElement('div');
        totalLbl.className = 'text-[10px] text-zinc-500 uppercase';
        totalLbl.textContent = 'Total due';
        const totalVal = document.createElement('div');
        totalVal.className = 'font-mono font-bold text-altRed text-sm';
        totalVal.textContent = peso(b.total_due_php);
        total.append(totalLbl, totalVal);
        right.append(total);

        if (b.status === 'Pending' && isUpcoming) {
            const cancelBtn = document.createElement('button');
            cancelBtn.type = 'button';
            cancelBtn.className = 'border border-red-900/60 text-red-400 hover:bg-red-950/40 px-2 py-1 text-[10px] uppercase font-bold transition-colors';
            cancelBtn.textContent = 'Cancel Booking';
            cancelBtn.addEventListener('click', () => handleCancel(b));
            right.append(cancelBtn);
        }

        card.append(left, right);
        return card;
    }

    function renderBookings(list) {
        const upcomingContainer = $('upcoming-list');
        const pastContainer = $('past-list');
        upcomingContainer.replaceChildren();
        pastContainer.replaceChildren();

        const now = new Date();
        const upcoming = [];
        const past = [];

        list.forEach((b) => {
            const start = new Date(b.starts_at);
            const end = new Date(b.ends_at);
            const pendingUpcoming = b.status === 'Pending' && start >= now;
            const ongoing = b.status === 'Ongoing' && end >= now;
            if (pendingUpcoming || ongoing) {
                upcoming.push(b);
            } else {
                past.push(b);
            }
        });

        if (upcoming.length === 0) {
            const empty = document.createElement('p');
            empty.className = 'text-xs text-zinc-500 py-3';
            empty.textContent = 'No active or upcoming bookings.';
            upcomingContainer.append(empty);
        } else {
            upcoming.forEach((b) => upcomingContainer.append(createBookingCard(b, true)));
        }

        if (past.length === 0) {
            const empty = document.createElement('p');
            empty.className = 'text-xs text-zinc-500 py-3';
            empty.textContent = 'No past appointment history.';
            pastContainer.append(empty);
        } else {
            past.forEach((b) => pastContainer.append(createBookingCard(b, false)));
        }
    }

    function renderNotices(notices) {
        const container = $('notices-list');
        container.replaceChildren();
        $('notices-count').textContent = String(notices.length);

        if (notices.length === 0) {
            const empty = document.createElement('p');
            empty.className = 'text-xs text-zinc-500 py-4 text-center';
            empty.textContent = 'No notifications yet.';
            container.append(empty);
            return;
        }

        notices.forEach((n) => {
            const bubble = document.createElement('div');
            bubble.className = 'bg-zinc-800/80 border border-zinc-700/60 text-white text-xs p-3 rounded-lg shadow-sm space-y-1';

            const header = document.createElement('div');
            header.className = 'flex justify-between items-center text-[10px] text-zinc-400';

            const sender = document.createElement('span');
            sender.className = 'font-bold uppercase tracking-wider text-altRed';
            sender.textContent = 'Shimmer & Shield';

            const time = document.createElement('time');
            time.textContent = fmtTimestamp(n.created_at);

            header.append(sender, time);

            const body = document.createElement('p');
            body.className = 'text-zinc-200 text-xs leading-relaxed whitespace-pre-wrap';
            body.textContent = n.message;

            bubble.append(header, body);
            container.append(bubble);
        });
    }

    let loadSeq = 0;
    async function loadAll() {
        const seq = ++loadSeq;

        // Fetch client bookings and notices in parallel
        const [bookingsRes, noticesRes] = await Promise.all([
            ALT.db.from('appointments')
                .select('id, ref_id, status, starts_at, ends_at, total_due_php, service:services(name), vehicle:vehicles(make, model, plate_number)')
                .order('starts_at', { ascending: false }),
            ALT.db.from('notifications')
                .select('id, appointment_id, message, channel, created_at')
                .order('created_at', { ascending: false }),
        ]);

        if (seq !== loadSeq) return;

        if (bookingsRes.error) {
            showMessage('Could not load bookings: ' + bookingsRes.error.message, 'error');
            return;
        }
        if (noticesRes.error) {
            showMessage('Could not load notices: ' + noticesRes.error.message, 'error');
            return;
        }

        renderBookings(bookingsRes.data || []);
        renderNotices(noticesRes.data || []);
    }

    // ---- start-up -------------------------------------------------------
    const session = await ALT.requireSession();
    if (!session) return;

    $('signout').addEventListener('click', () => ALT.signOut());

    await loadAll();

    // Live updates for real-time notifications and appointment status
    let timer = null;
    const debouncedReload = () => {
        clearTimeout(timer);
        timer = setTimeout(loadAll, 300);
    };

    ALT.db.channel('client-history-live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, debouncedReload)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, debouncedReload)
        .subscribe();
})();
