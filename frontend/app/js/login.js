// ALTF4 — login / register page logic.
(function () {
    'use strict';

    const $ = (id) => document.getElementById(id);
    const msg = $('msg');

    function showMessage(text, kind) {
        // textContent (not innerHTML) so server text can never inject markup.
        msg.textContent = text;
        msg.className = 'text-xs p-3 mb-4 border ' + (kind === 'ok'
            ? 'border-green-700 text-green-400 bg-green-950/30'
            : 'border-red-700 text-red-400 bg-red-950/30');
    }
    function clearMessage() {
        msg.className = 'hidden';
        msg.textContent = '';
    }

    function setTab(which) {
        const isLogin = which === 'login';
        $('login-form').classList.toggle('hidden', !isLogin);
        $('register-form').classList.toggle('hidden', isLogin);
        $('tab-login').className = 'w-1/2 pb-2 text-center border-b-2 ' +
            (isLogin ? 'font-bold text-altRed border-altRed' : 'text-zinc-500 border-transparent');
        $('tab-register').className = 'w-1/2 pb-2 text-center border-b-2 ' +
            (isLogin ? 'text-zinc-500 border-transparent' : 'font-bold text-altRed border-altRed');
        clearMessage();
    }

    $('tab-login').addEventListener('click', () => setTab('login'));
    $('tab-register').addEventListener('click', () => setTab('register'));

    // Already signed in? Skip the form.
        // TEMPORARY: set to true to restore "already signed in -> go to home".
    const SKIP_FORM_IF_SIGNED_IN = false;
    if (SKIP_FORM_IF_SIGNED_IN) {
        ALT.db.auth.getSession().then(({ data }) => {
            if (data.session) window.location.replace('home.html');
        });
    }

    $('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        clearMessage();
        const email = $('login-email').value.trim();
        const password = $('login-password').value;
        if (!email || !password) return showMessage('Enter your email and password.');

        const btn = $('login-btn');
        btn.disabled = true;
        const { error } = await ALT.db.auth.signInWithPassword({ email, password });
        btn.disabled = false;

        if (error) {
            // Unconfirmed accounts get their own hint; everything else stays generic.
            const unconfirmed = /not confirmed/i.test(error.message);
            return showMessage(unconfirmed
                ? 'Please confirm your email first, then log in.'
                : 'Incorrect email or password.');
        }
        window.location.replace('home.html');
    });

    $('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        clearMessage();
        const full_name = $('reg-name').value.trim();
        const phone = $('reg-phone').value.trim();
        const email = $('reg-email').value.trim();
        const password = $('reg-password').value;

        if (!full_name || !phone || !email) return showMessage('Please fill in every field.');
        if (password.length < 8) return showMessage('Password must be at least 8 characters.');

        const btn = $('reg-btn');
        btn.disabled = true;
        const { data, error } = await ALT.db.auth.signUp({
            email,
            password,
            options: { data: { full_name, phone } },
        });
        btn.disabled = false;

        if (error) return showMessage(error.message);

        if (!data.session) {
            // Email confirmation is switched on in Supabase.
            setTab('login');
            $('login-email').value = email;
            return showMessage('Account created. Check your email to confirm it, then log in.', 'ok');
        }
        window.location.replace('home.html');
    });
})();
