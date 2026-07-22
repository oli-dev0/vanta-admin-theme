'use strict';

{
    const jump = document.querySelector('[data-admin-pagination-jump]');
    const input = jump?.querySelector('input[name="p"]');
    const button = jump?.querySelector('[data-admin-pagination-go]');

    if (jump && input && button) {
        function goToPage() {
            const minimum = Number(input.min) || 1;
            const maximum = Number(input.max) || minimum;
            const requestedPage = Number.parseInt(input.value, 10);

            if (!Number.isInteger(requestedPage)) {
                input.focus();
                return;
            }

            const page = Math.min(Math.max(requestedPage, minimum), maximum);
            input.value = page;
            const url = new URL(window.location.href);
            url.searchParams.set('p', String(page));
            window.location.assign(url.toString());
        }

        button.addEventListener('click', goToPage);
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                goToPage();
            }
        });
    }
}
