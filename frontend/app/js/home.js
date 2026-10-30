// ALTF4 — home page. Shows who is signed in and routes by role:
// clients get the booking link, staff and admins get the dashboard link.
(async function () {
    'use strict';

    const session = await ALT.requireSession();
    if (!session) return;

    const status = document.getElementById('status');
    try {
        const profile = await ALT.getMyProfile(session.user.id);
        if (!profile) {
            await ALT.signOut('local');
            return;
        }

        const staff = ALT.isStaff(profile.role);
        document.getElementById('who').textContent = profile.full_name || profile.email;
        document.getElementById('email').textContent = profile.email || session.user.email;
        document.getElementById('role').textContent = profile.role;
        document.getElementById('book-link').hidden = staff;
        document.getElementById('history-link').hidden = staff;
        document.getElementById('dash-link').hidden = !staff;
        document.getElementById('reports-link').hidden = !staff;

        status.classList.add('hidden');
        document.getElementById('account').classList.remove('hidden');
    } catch (err) {
        status.textContent = 'Could not load your profile. ' + err.message;
    }

    document.getElementById('signout').addEventListener('click', () => ALT.signOut());
})();
