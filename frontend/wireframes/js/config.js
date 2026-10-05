// ALTF4 — Tailwind theme configuration for the wireframe board.
// Must load AFTER the Tailwind CDN <script> tag and BEFORE the DOM
// is scanned for classes, so keep this <script> tag directly after it.

tailwind.config = {
    theme: {
        extend: {
            colors: {
                altRed: '#E60000',
                altDark: '#0a0a0a',
                altPanel: '#171717',
            },
        },
    },
};
