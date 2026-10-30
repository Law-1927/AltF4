(function () {
    'use strict';

    const KEY = 'altf4-color-mode';
    const root = document.documentElement;
    const embeddedAuth = new URLSearchParams(window.location.search).get('embed') === '1';

    function readMode() {
        try {
            return window.localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light';
        } catch (error) {
            console.warn('Could not read the saved color mode.', error);
            return 'light';
        }
    }

    function applyMode(mode, persist) {
        root.dataset.theme = mode;
        const toggle = document.getElementById('color-mode-toggle');
        if (toggle) {
            toggle.textContent = mode === 'dark' ? '☀' : '☾';
            toggle.setAttribute('aria-label', mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
            toggle.title = mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
        }

        if (!persist) return;
        try {
            window.localStorage.setItem(KEY, mode);
        } catch (error) {
            console.warn('Could not save the selected color mode.', error);
        }
    }

    function addToggle() {
        if (embeddedAuth) return;

        const toggle = document.createElement('button');
        toggle.id = 'color-mode-toggle';
        toggle.className = 'color-mode-toggle';
        toggle.type = 'button';
        toggle.addEventListener('click', () => {
            applyMode(root.dataset.theme === 'dark' ? 'light' : 'dark', true);
        });
        document.body.append(toggle);
        applyMode(root.dataset.theme || 'light', false);
    }

    applyMode(readMode(), false);
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addToggle, { once: true });
    } else {
        addToggle();
    }

    window.addEventListener('storage', (event) => {
        if (event.key === KEY && (event.newValue === 'dark' || event.newValue === 'light')) {
            applyMode(event.newValue, false);
        }
    });
})();
