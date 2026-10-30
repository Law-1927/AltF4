(function () {
    'use strict';

    const toggle = document.getElementById('menuToggle');
    const nav = document.getElementById('mainNav');
    const authModal = document.getElementById('authModal');
    const authFrame = document.getElementById('authFrame');
    const authClose = authModal.querySelector('.auth-close');
    let previouslyFocused = null;
    let authFrameObserver = null;

    function resizeAuthFrame() {
        const content = authFrame.contentDocument?.querySelector('main');
        if (!content) return;

        const panel = authFrame.closest('.auth-panel');
        const header = panel.querySelector('.auth-panel-header');
        const panelStyle = getComputedStyle(panel);
        const maxPanelHeight = parseFloat(panelStyle.maxHeight);
        const panelBorders = parseFloat(panelStyle.borderTopWidth) +
            parseFloat(panelStyle.borderBottomWidth);
        const maxFrameHeight = Math.max(0, maxPanelHeight - header.offsetHeight - panelBorders);
        const contentHeight = Math.ceil(content.getBoundingClientRect().height);

        authFrame.style.height = Math.min(contentHeight, maxFrameHeight) + 'px';
    }

    function observeAuthFrameContent() {
        authFrameObserver?.disconnect();
        const content = authFrame.contentDocument?.querySelector('main');
        if (!content) return;

        authFrameObserver = new ResizeObserver(resizeAuthFrame);
        authFrameObserver.observe(content);
        resizeAuthFrame();
    }

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

    function openAuth(mode) {
        previouslyFocused = document.activeElement;
        authFrame.style.height = '0px';
        authFrame.src = 'login.html?mode=' + encodeURIComponent(mode) + '&embed=1';
        authModal.classList.add('open');
        authModal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('auth-open');
        authClose.focus();
    }

    function closeAuth() {
        authModal.classList.remove('open');
        authModal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('auth-open');
        authFrameObserver?.disconnect();
        authFrameObserver = null;
        if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    }

    authFrame.addEventListener('load', () => {
        observeAuthFrameContent();
        authFrame.contentWindow.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && authModal.classList.contains('open')) closeAuth();
        });
    });

    window.addEventListener('resize', resizeAuthFrame);

    document.querySelectorAll('[data-auth]').forEach((trigger) => {
        trigger.addEventListener('click', (event) => {
            event.preventDefault();
            openAuth(trigger.dataset.auth);
        });
    });

    authModal.querySelectorAll('[data-auth-close]').forEach((button) => {
        button.addEventListener('click', closeAuth);
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            setMenuOpen(false);
            if (authModal.classList.contains('open')) closeAuth();
        }
    });
})();
