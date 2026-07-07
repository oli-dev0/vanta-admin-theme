'use strict';

{
    const filterSectionsToggle = document.getElementById('admin-filter-sections-toggle');
    const filterSections = Array.from(document.querySelectorAll('#changelist-filter details'));

    function isDetailsOpen(section) {
        return section.open;
    }

    function updateFilterSectionsToggle() {
        if (!filterSectionsToggle) {
            return;
        }

        const allOpen = filterSections.length > 0 && filterSections.every(isDetailsOpen);
        const label = allOpen ? 'Collapse all filter sections' : 'Expand all filter sections';

        filterSectionsToggle.setAttribute('aria-label', label);
        filterSectionsToggle.setAttribute('title', label);
        filterSectionsToggle.classList.toggle('is-collapse-mode', allOpen);
    }

    function setFilterSectionOpen(section, isOpen) {
        section.open = isOpen;
    }

    function syncChangelistActions() {
        const form = document.getElementById('changelist-form');
        const actions = Array.from(document.querySelectorAll('#changelist .actions'));

        if (!form || actions.length === 0) {
            return;
        }

        const checkboxes = Array.from(form.querySelectorAll('input.action-select[type="checkbox"]'));
        const primaryActionBar = actions[0];

        function syncStickyActionBar() {
            if (!primaryActionBar || !form.classList.contains('has-selected-actions')) {
                form.classList.remove('has-sticky-actions');
                return;
            }

            const formRect = form.getBoundingClientRect();
            const contentBox = form.closest('.changelist-form-container > div') || form.parentElement || form;
            const contentRect = contentBox.getBoundingClientRect();
            const shouldStick = formRect.top < 12 && formRect.bottom > 84;
            form.classList.toggle('has-sticky-actions', shouldStick);

            if (!shouldStick) {
                return;
            }

            const left = Math.max(contentRect.left + 12, 12);
            const rightEdge = Math.min(contentRect.right - 12, window.innerWidth - 12);
            const width = Math.max(rightEdge - left, 0);
            primaryActionBar.style.setProperty('--admin-actions-fixed-left', `${left}px`);
            primaryActionBar.style.setProperty('--admin-actions-fixed-width', `${width}px`);
        }

        actions.forEach((actionBar, index) => {
            actionBar.classList.toggle('admin-actions--duplicate', index > 0);

            if (index === 0 && !actionBar.querySelector('.admin-actions__clear')) {
                const clearButton = document.createElement('button');
                clearButton.type = 'button';
                clearButton.className = 'admin-actions__clear';
                clearButton.setAttribute('aria-label', 'Clear selected rows');
                clearButton.addEventListener('click', () => {
                    checkboxes.forEach((checkbox) => {
                        checkbox.checked = false;
                        checkbox.closest('tr')?.classList.remove('selected');
                        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                    });
                    const actionToggle = form.querySelector('#action-toggle');
                    if (actionToggle) {
                        actionToggle.checked = false;
                    }
                    updateActionsVisibility();
                });
                actionBar.prepend(clearButton);
            }
        });

        function updateActionsVisibility() {
            const hasSelectedRows = checkboxes.some((checkbox) => checkbox.checked);
            form.classList.toggle('has-selected-actions', hasSelectedRows);
            actions.forEach((actionBar) => {
                actionBar.setAttribute('aria-hidden', String(!hasSelectedRows));
            });
            syncStickyActionBar();
        }

        form.addEventListener('change', (event) => {
            if (event.target.matches('input[type="checkbox"]')) {
                updateActionsVisibility();
            }
        });
        window.addEventListener('scroll', syncStickyActionBar, { passive: true });
        window.addEventListener('resize', syncStickyActionBar);
        updateActionsVisibility();
    }

    syncChangelistActions();

    if (filterSectionsToggle) {
        filterSectionsToggle.addEventListener('click', () => {
            const allOpen = filterSections.length > 0 && filterSections.every(isDetailsOpen);
            filterSections.forEach((section) => setFilterSectionOpen(section, !allOpen));
            updateFilterSectionsToggle();
        });
    }

    filterSections.forEach((section) => {
        section.addEventListener('toggle', updateFilterSectionsToggle);
    });

    updateFilterSectionsToggle();
}
