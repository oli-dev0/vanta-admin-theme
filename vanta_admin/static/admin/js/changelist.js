'use strict';

{
    const changelist = document.getElementById('changelist');
    const filterPanel = document.getElementById('changelist-filter');
    const filterPanelToggle = document.getElementById('admin-filter-panel-toggle');
    const filterSectionsToggle = document.getElementById('admin-filter-sections-toggle');
    const filterSections = Array.from(document.querySelectorAll('#changelist-filter details'));
    const filterPanelReopenKey = `django.admin.theme.changelistFilter.reopen:${window.location.pathname}`;
    let filterPanelCloseTimer = null;

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

    function setFilterPanelOpen(isOpen) {
        if (!changelist || !filterPanel || !filterPanelToggle) {
            return;
        }

        window.clearTimeout(filterPanelCloseTimer);
        const hasActiveFilters = filterPanelToggle.classList.contains('has-active-filters');
        const openLabel = hasActiveFilters
            ? filterPanelToggle.dataset.openActiveLabel || 'Open filters, active filters applied'
            : filterPanelToggle.dataset.openLabel || 'Open filters';
        const label = isOpen
            ? filterPanelToggle.dataset.closeLabel || 'Close filters'
            : openLabel;

        changelist.classList.toggle('has-open-filters', isOpen);
        filterPanelToggle.setAttribute('aria-expanded', String(isOpen));
        filterPanelToggle.setAttribute('aria-label', label);
        filterPanelToggle.setAttribute('title', label);

        if (isOpen) {
            filterPanel.hidden = false;
            window.requestAnimationFrame(() => {
                filterPanel.classList.add('is-open');
            });
            return;
        }

        filterPanel.classList.remove('is-open');
        filterPanelCloseTimer = window.setTimeout(() => {
            if (!filterPanel.classList.contains('is-open')) {
                filterPanel.hidden = true;
            }
        }, 180);
    }

    function shouldReopenFilterPanel() {
        try {
            return window.sessionStorage.getItem(filterPanelReopenKey) === 'true';
        } catch (error) {
            return false;
        }
    }

    function clearFilterPanelReopen() {
        try {
            window.sessionStorage.removeItem(filterPanelReopenKey);
        } catch (error) {}
    }

    function rememberFilterPanelReopen() {
        try {
            window.sessionStorage.setItem(filterPanelReopenKey, 'true');
        } catch (error) {}
    }

    function syncSearchClear() {
        const searchForm = document.getElementById('changelist-search');
        const searchInput = document.getElementById('searchbar');
        const clearButton = searchForm?.querySelector('.admin-search-clear');

        if (!searchForm || !searchInput || !clearButton) {
            return;
        }

        clearButton.addEventListener('click', (event) => {
            event.preventDefault();
            searchInput.value = '';
            const searchParams = new URLSearchParams(window.location.search);
            searchParams.delete('q');
            const queryString = searchParams.toString();
            window.location.assign(`${window.location.pathname}${queryString ? `?${queryString}` : ''}`);
        });
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

            const actionOffset = 64;
            const left = Math.max(contentRect.left + actionOffset, actionOffset);
            primaryActionBar.style.setProperty('--admin-actions-fixed-left', `${left}px`);
            primaryActionBar.style.setProperty('--admin-actions-fixed-width', `${Math.max(contentRect.width - (actionOffset * 2), 0)}px`);
        }

        actions.forEach((actionBar, index) => {
            actionBar.classList.toggle('admin-actions--duplicate', index > 0);
        });

        const cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.className = 'admin-actions__cancel';
        cancelButton.setAttribute('aria-label', 'Cancel selection');
        cancelButton.setAttribute('title', 'Cancel selection');
        cancelButton.textContent = 'Cancel';
        cancelButton.addEventListener('click', () => {
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
        const actionSubmit = primaryActionBar.querySelector('button.button, input[type="submit"]');
        if (actionSubmit) {
            actionSubmit.after(cancelButton);
        } else {
            primaryActionBar.append(cancelButton);
        }

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

    syncSearchClear();
    syncChangelistActions();

    if (filterPanelToggle && filterPanel) {
        setFilterPanelOpen(shouldReopenFilterPanel());
        clearFilterPanelReopen();

        filterPanelToggle.addEventListener('click', () => {
            setFilterPanelOpen(filterPanelToggle.getAttribute('aria-expanded') !== 'true');
        });

        document.addEventListener('click', (event) => {
            if (
                filterPanelToggle.getAttribute('aria-expanded') !== 'true'
                || filterPanel.contains(event.target)
                || filterPanelToggle.contains(event.target)
            ) {
                return;
            }

            setFilterPanelOpen(false);
        });

        filterPanel.addEventListener('click', (event) => {
            const link = event.target.closest('a[href]');
            if (!link) {
                return;
            }

            const url = new URL(link.href, window.location.href);
            if (url.pathname === window.location.pathname) {
                rememberFilterPanelReopen();
            }
        });

        document.addEventListener('keydown', (event) => {
            if (
                event.key === 'Escape'
                && filterPanelToggle.getAttribute('aria-expanded') === 'true'
                && (
                    filterPanel.contains(document.activeElement)
                    || filterPanelToggle === document.activeElement
                )
            ) {
                setFilterPanelOpen(false);
                filterPanelToggle.focus();
            }
        });
    }

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
