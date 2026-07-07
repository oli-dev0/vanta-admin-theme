'use strict';

{
    const sidebarStateKey = 'django.admin.theme.sidebar.isCollapsed';
    const navSectionsStateKey = 'django.admin.theme.sidebar.openSections';
    const validThemeValues = new Set(['light', 'dark']);

    const body = document.body;
    const root = document.documentElement;
    const sidebar = document.getElementById('nav-sidebar');
    const collapseButton = document.getElementById('admin-sidebar-collapse');
    const filterSectionsToggle = document.getElementById('admin-filter-sections-toggle');
    const menuButton = document.getElementById('admin-sidebar-menu-button');
    const accountDetails = document.querySelector('.admin-sidebar__account');
    const themeButtons = document.querySelectorAll('[data-admin-theme-value]');
    const mobileQuery = window.matchMedia('(max-width: 1024px)');
    const navSections = Array.from(document.querySelectorAll('[data-admin-nav-section]'));
    const filterSections = Array.from(document.querySelectorAll('#changelist-filter details'));
    const adminMessages = Array.from(document.querySelectorAll('ul.messagelist li'));
    const adminMessageDuration = 4000;
    const customSelects = Array.from(document.querySelectorAll('select')).filter((select) => (
        !select.multiple
        && (!select.size || select.size <= 1)
        && select.dataset.vantaEnhanced !== 'true'
    ));

    function setCollapsed(isCollapsed, shouldPersist) {
        body.classList.toggle('admin-sidebar-collapsed', isCollapsed);

        if (collapseButton) {
            collapseButton.setAttribute('aria-expanded', String(!isCollapsed));
            const label = isCollapsed ? 'Expand sidebar' : 'Collapse sidebar';
            collapseButton.setAttribute('aria-label', label);
            const text = collapseButton.querySelector('.admin-sidebar__collapse-text');
            if (text) {
                text.textContent = label;
            }
        }

        if (shouldPersist) {
            localStorage.setItem(sidebarStateKey, String(isCollapsed));
        }
    }

    function setMobileOpen(isOpen) {
        body.classList.toggle('admin-sidebar-mobile-open', isOpen);

        if (menuButton) {
            menuButton.setAttribute('aria-expanded', String(isOpen));
            menuButton.setAttribute('aria-label', isOpen ? 'Close admin navigation' : 'Open admin navigation');
        }

        syncMobileVisibility();
    }

    function isSectionOpen(section) {
        return section.hasAttribute('open');
    }

    function getSectionKey(section) {
        return section.dataset.adminNavSection;
    }

    function syncSectionAria(section) {
        const summary = section.querySelector('.admin-sidebar__group-title');
        if (summary) {
            summary.setAttribute('aria-expanded', String(isSectionOpen(section)));
        }
    }

    function getStoredOpenSections() {
        try {
            const value = JSON.parse(localStorage.getItem(navSectionsStateKey));
            return Array.isArray(value) ? new Set(value) : null;
        } catch (error) {
            return null;
        }
    }

    function persistOpenSections() {
        const openSections = navSections
            .filter(isSectionOpen)
            .map(getSectionKey)
            .filter(Boolean);

        localStorage.setItem(navSectionsStateKey, JSON.stringify(openSections));
    }

    function applyStoredOpenSections() {
        const storedOpenSections = getStoredOpenSections();

        if (!storedOpenSections) {
            root.classList.remove('admin-nav-state-pending');
            return;
        }

        navSections.forEach((section) => {
            const sectionKey = getSectionKey(section);
            if (!sectionKey) {
                return;
            }

            section.open = storedOpenSections.has(sectionKey);
            syncSectionAria(section);
        });

        root.classList.remove('admin-nav-state-pending');
    }

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

    function syncMobileVisibility() {
        if (sidebar) {
            const isHiddenOnMobile = !body.classList.contains('admin-sidebar-mobile-open') && mobileQuery.matches;
            sidebar.setAttribute('aria-hidden', String(isHiddenOnMobile));
            sidebar.toggleAttribute('inert', isHiddenOnMobile);
        }
    }

    function dismissAdminMessage(message) {
        window.clearTimeout(message.adminDismissTimer);
        message.adminDismissTimer = null;
        message.classList.add('is-removing');
        window.setTimeout(() => {
            const messageList = message.closest('ul.messagelist');
            message.remove();
            if (messageList && messageList.children.length === 0) {
                messageList.remove();
            }
        }, 180);
    }

    function setAdminMessageTimer(message, duration) {
        window.clearTimeout(message.adminDismissTimer);
        message.adminTimerStartedAt = Date.now();
        message.adminTimerRemaining = duration;
        message.style.transition = `background-size ${duration}ms linear, opacity 160ms ease, transform 160ms ease`;
        message.style.backgroundSize = '100% 100%';
        message.adminDismissTimer = window.setTimeout(() => dismissAdminMessage(message), duration);
    }

    function pauseAdminMessageTimer(message) {
        if (!message.adminDismissTimer || message.classList.contains('is-removing')) {
            return;
        }

        const elapsed = Date.now() - message.adminTimerStartedAt;
        message.adminTimerRemaining = Math.max(0, message.adminTimerRemaining - elapsed);
        window.clearTimeout(message.adminDismissTimer);
        message.adminDismissTimer = null;
        message.style.backgroundSize = window.getComputedStyle(message).backgroundSize;
        message.style.transition = 'opacity 160ms ease, transform 160ms ease';
    }

    function resumeAdminMessageTimer(message) {
        if (message.adminDismissTimer || message.classList.contains('is-removing')) {
            return;
        }

        if (message.adminTimerRemaining <= 0) {
            dismissAdminMessage(message);
            return;
        }

        window.requestAnimationFrame(() => {
            setAdminMessageTimer(message, message.adminTimerRemaining);
        });
    }

    function startAdminMessageTimers() {
        adminMessages.forEach((message) => {
            message.classList.remove('is-counting', 'is-removing');
            message.style.transition = 'none';
            message.style.backgroundSize = '0 100%';
            message.offsetWidth;
            message.addEventListener('mouseenter', () => pauseAdminMessageTimer(message));
            message.addEventListener('mouseleave', () => resumeAdminMessageTimer(message));

            window.requestAnimationFrame(() => {
                message.style.transition = `background-size ${adminMessageDuration}ms linear, opacity 160ms ease, transform 160ms ease`;
                window.requestAnimationFrame(() => {
                    message.classList.add('is-counting');
                    setAdminMessageTimer(message, adminMessageDuration);
                });
            });
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

    function applyTheme(theme) {
        if (!validThemeValues.has(theme)) {
            return;
        }

        root.dataset.theme = theme;
        localStorage.setItem('theme', theme);
        updateThemeButtons(theme);
    }

    function updateThemeButtons(theme) {
        themeButtons.forEach((button) => {
            button.setAttribute('aria-pressed', String(button.dataset.adminThemeValue === theme));
        });
    }

    function enhanceActionSelect(select, index) {
        const label = select.closest('label');
        if (select.dataset.vantaEnhanced === 'true') {
            return null;
        }

        const options = Array.from(select.options);
        const isActionSelect = select.matches('#changelist .actions select[name="action"]');
        const insertAfter = label && label.contains(select) ? label : select;
        const dropdown = document.createElement('div');
        const button = document.createElement('button');
        const buttonText = document.createElement('span');
        const menu = document.createElement('div');
        const menuId = `admin-action-select-menu-${index}`;
        const optionButtons = [];
        const isRequired = select.required;

        select.dataset.vantaEnhanced = 'true';
        select.classList.add('admin-action-select__native');
        select.tabIndex = -1;
        select.setAttribute('aria-hidden', 'true');
        select.required = false;
        if (label) {
            label.classList.add('admin-action-select__label');
        }

        dropdown.className = isActionSelect
            ? 'admin-action-select'
            : 'admin-action-select admin-action-select--field';
        button.type = 'button';
        button.className = 'admin-action-select__button';
        button.disabled = select.disabled;
        button.setAttribute('aria-haspopup', 'listbox');
        button.setAttribute('aria-expanded', 'false');
        button.setAttribute('aria-controls', menuId);
        buttonText.className = 'admin-action-select__button-text';
        button.append(buttonText);

        menu.id = menuId;
        menu.className = 'admin-action-select__menu';
        menu.setAttribute('role', 'listbox');
        menu.setAttribute('tabindex', '-1');

        function getSelectedOption() {
            return select.selectedOptions[0] || options[0];
        }

        function setOpen(isOpen) {
            dropdown.classList.toggle('is-open', isOpen);
            button.setAttribute('aria-expanded', String(isOpen));

            if (isOpen) {
                const selectedButton = optionButtons.find((optionButton) => optionButton.dataset.value === select.value);
                window.requestAnimationFrame(() => {
                    (selectedButton || optionButtons[0])?.focus();
                });
            }
        }

        function syncButtonLabel() {
            const selectedOption = getSelectedOption();
            buttonText.textContent = selectedOption ? selectedOption.textContent.trim() : '';
            button.setAttribute('aria-invalid', String(dropdown.classList.contains('has-error')));
            optionButtons.forEach((optionButton) => {
                const isSelected = optionButton.dataset.value === select.value;
                optionButton.classList.toggle('is-selected', isSelected);
                optionButton.setAttribute('aria-selected', String(isSelected));
            });
        }

        function chooseOption(optionButton, shouldClose = true) {
            select.value = optionButton.dataset.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            dropdown.classList.remove('has-error');
            syncButtonLabel();

            if (shouldClose) {
                setOpen(false);
                button.focus();
            }
        }

        options.forEach((option) => {
            const optionButton = document.createElement('button');
            optionButton.type = 'button';
            optionButton.className = 'admin-action-select__option';
            optionButton.dataset.value = option.value;
            optionButton.textContent = option.textContent.trim();
            optionButton.setAttribute('role', 'option');
            optionButton.setAttribute('aria-selected', String(option.selected));
            optionButton.disabled = option.disabled;

            optionButton.addEventListener('click', () => chooseOption(optionButton));
            optionButton.addEventListener('keydown', (event) => {
                const currentIndex = optionButtons.indexOf(optionButton);
                const lastIndex = optionButtons.length - 1;

                if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    optionButtons[Math.min(currentIndex + 1, lastIndex)]?.focus();
                } else if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    optionButtons[Math.max(currentIndex - 1, 0)]?.focus();
                } else if (event.key === 'Home') {
                    event.preventDefault();
                    optionButtons[0]?.focus();
                } else if (event.key === 'End') {
                    event.preventDefault();
                    optionButtons[lastIndex]?.focus();
                } else if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    chooseOption(optionButton);
                } else if (event.key === 'Escape') {
                    event.preventDefault();
                    setOpen(false);
                    button.focus();
                }
            });

            optionButtons.push(optionButton);
            menu.append(optionButton);
        });

        button.addEventListener('click', () => {
            setOpen(!dropdown.classList.contains('is-open'));
        });

        button.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setOpen(true);
            } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                setOpen(true);
                window.requestAnimationFrame(() => optionButtons.at(-1)?.focus());
            } else if (event.key === 'Escape') {
                setOpen(false);
            }
        });

        select.addEventListener('change', syncButtonLabel);
        select.form?.addEventListener('submit', (event) => {
            if (isRequired && !select.value) {
                event.preventDefault();
                dropdown.classList.add('has-error');
                syncButtonLabel();
                setOpen(true);
                button.focus();
            }
        });

        dropdown.append(button, menu);
        insertAfter.after(dropdown);
        syncButtonLabel();

        return dropdown;
    }

    const customDropdowns = customSelects
        .map(enhanceActionSelect)
        .filter(Boolean);

    const storedCollapsed = localStorage.getItem(sidebarStateKey);
    setCollapsed(storedCollapsed === 'true', false);
    setMobileOpen(false);
    startAdminMessageTimers();
    syncChangelistActions();
    applyStoredOpenSections();

    const storedTheme = localStorage.getItem('theme');
    if (validThemeValues.has(storedTheme)) {
        root.dataset.theme = storedTheme;
        updateThemeButtons(storedTheme);
    } else {
        updateThemeButtons(root.dataset.theme);
    }

    if (collapseButton) {
        collapseButton.addEventListener('click', () => {
            if (mobileQuery.matches) {
                setMobileOpen(false);
                return;
            }

            setCollapsed(!body.classList.contains('admin-sidebar-collapsed'), true);
        });
    }

    if (menuButton) {
        menuButton.addEventListener('click', () => {
            setMobileOpen(!body.classList.contains('admin-sidebar-mobile-open'));
        });
    }

    if (filterSectionsToggle) {
        filterSectionsToggle.addEventListener('click', () => {
            const allOpen = filterSections.length > 0 && filterSections.every(isDetailsOpen);
            filterSections.forEach((section) => setFilterSectionOpen(section, !allOpen));
            updateFilterSectionsToggle();
        });
    }

    navSections.forEach((section) => {
        syncSectionAria(section);
        section.addEventListener('toggle', () => {
            syncSectionAria(section);
            persistOpenSections();
        });
    });

    filterSections.forEach((section) => {
        section.addEventListener('toggle', updateFilterSectionsToggle);
    });

    themeButtons.forEach((button) => {
        button.addEventListener('click', () => {
            applyTheme(button.dataset.adminThemeValue);
        });
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            setMobileOpen(false);
            if (accountDetails) {
                accountDetails.open = false;
            }
            customDropdowns.forEach((dropdown) => {
                dropdown.classList.remove('is-open');
                dropdown.querySelector('.admin-action-select__button')?.setAttribute('aria-expanded', 'false');
            });
        }
    });

    document.addEventListener('click', (event) => {
        customDropdowns.forEach((dropdown) => {
            if (!dropdown.contains(event.target)) {
                dropdown.classList.remove('is-open');
                dropdown.querySelector('.admin-action-select__button')?.setAttribute('aria-expanded', 'false');
            }
        });

        if (
            accountDetails
            && accountDetails.open
            && !accountDetails.contains(event.target)
        ) {
            accountDetails.open = false;
        }

        if (
            body.classList.contains('admin-sidebar-mobile-open')
            && sidebar
            && !sidebar.contains(event.target)
            && menuButton
            && !menuButton.contains(event.target)
        ) {
            setMobileOpen(false);
        }
    });

    mobileQuery.addEventListener('change', syncMobileVisibility);
    updateFilterSectionsToggle();
}
