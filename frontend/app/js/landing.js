(function () {
    'use strict';

    const toggle = document.getElementById('menuToggle');
    const nav = document.getElementById('mainNav');

    function setMenuOpen(open) {
        nav.classList.toggle('open', open);
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    }

    toggle.addEventListener('click', () => {
        setMenuOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    nav.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => setMenuOpen(false));
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') setMenuOpen(false);
    });
})();
