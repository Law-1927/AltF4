// ALTF4 — home page. Shows who is signed in and routes by role.
// Clients get the booking link; the staff dashboard replaces the staff note later.
(async function () {
    'use strict';

    const session = await ALT.requireSession();
    if (!session) return;

    const status = document.getElementById('status');
    try {
        const profile = await ALT.getMyProfile(session.user.id);
        if (!profile) throw new Error('No profile row found for this account.');

        const staff = ALT.isStaff(profile.role);
        document.getElementById('who').textContent = profile.full_name || profile.email;
        document.getElementById('email').textContent = profile.email || session.user.email;
        document.getElementById('role').textContent = profile.role;
        document.getElementById('next').textContent = staff
            ? 'Staff account: the dashboard comes next.'
            : '';
        document.getElementById('book-link').classList.toggle('hidden', staff);

        status.classList.add('hidden');
        document.getElementById('account').classList.remove('hidden');
    } catch (err) {
        status.textContent = 'Could not load your profile. ' + err.message;
    }

    document.getElementById('signout').addEventListener('click', () => ALT.signOut());
})();
