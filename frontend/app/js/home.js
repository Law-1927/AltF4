// ALTF4 — placeholder home page. Confirms login works and shows the role.
// The booking flow (clients) and dashboard (staff) replace this next.
(async function () {
    'use strict';

    const session = await ALT.requireSession();
    if (!session) return;

    const status = document.getElementById('status');
    try {
        const profile = await ALT.getMyProfile(session.user.id);
        if (!profile) throw new Error('No profile row found for this account.');

        document.getElementById('who').textContent = profile.full_name || profile.email;
        document.getElementById('email').textContent = profile.email || session.user.email;
        document.getElementById('role').textContent = profile.role;
        document.getElementById('next').textContent = ALT.isStaff(profile.role)
            ? 'Staff account: the dashboard comes next.'
            : 'Client account: the booking screens come next.';

        status.classList.add('hidden');
        document.getElementById('account').classList.remove('hidden');
    } catch (err) {
        status.textContent = 'Could not load your profile. ' + err.message;
    }

    document.getElementById('signout').addEventListener('click', () => ALT.signOut());
})();
