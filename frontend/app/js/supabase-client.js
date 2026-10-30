// ALTF4 — shared Supabase client and small auth helpers.
// Load order on every page: supabase-js (CDN) -> supabase-config.js -> this file.
(function () {
    'use strict';

    const client = window.supabase.createClient(
        window.ALT_CONFIG.SUPABASE_URL,
        window.ALT_CONFIG.SUPABASE_PUBLISHABLE_KEY
    );

    // Send the visitor to the login page if nobody is signed in.
    // NOTE: this only controls what the page shows. The real access rules are
    // the Row Level Security policies in the database.
    async function requireSession() {
        const { data } = await client.auth.getSession();
        if (!data.session) {
            window.location.replace('login.html');
            return null;
        }
        return data.session;
    }

    // Load the signed-in user's own profile row. We filter by id because
    // staff can read every profile, so an unfiltered query would return many.
    async function getMyProfile(userId) {
        const { data, error } = await client
            .from('profiles')
            .select('id, role, full_name, email, phone')
            .eq('id', userId)
            .maybeSingle();
        if (error) throw error;
        return data;
    }

    function isStaff(role) {
        return role === 'staff' || role === 'admin';
    }

    async function signOut(scope) {
        const { error } = await client.auth.signOut(scope ? { scope } : undefined);
        if (error) throw error;
        window.location.replace('login.html');
    }

    window.ALT = { db: client, requireSession, getMyProfile, isStaff, signOut };
})();
