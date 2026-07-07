'use strict';

{
    const validThemeValues = new Set(['light', 'dark']);
    const root = document.documentElement;
    const themeButtons = document.querySelectorAll('[data-admin-theme-value]');

    function updateThemeButtons(theme) {
        themeButtons.forEach((button) => {
            button.setAttribute('aria-pressed', String(button.dataset.adminThemeValue === theme));
        });
    }

    function applyTheme(theme) {
        if (!validThemeValues.has(theme)) {
            return;
        }

        root.dataset.theme = theme;
        localStorage.setItem('theme', theme);
        updateThemeButtons(theme);
    }

    const storedTheme = localStorage.getItem('theme');
    if (validThemeValues.has(storedTheme)) {
        root.dataset.theme = storedTheme;
        updateThemeButtons(storedTheme);
    } else {
        updateThemeButtons(root.dataset.theme);
    }

    themeButtons.forEach((button) => {
        button.addEventListener('click', () => {
            applyTheme(button.dataset.adminThemeValue);
        });
    });
}
