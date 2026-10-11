// ALTF4 app — Tailwind theme (same colors as the wireframe board).
// Must load directly AFTER the Tailwind CDN <script> tag.
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
