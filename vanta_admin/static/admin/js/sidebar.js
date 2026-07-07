'use strict';

{
    const sidebarStateKey = 'django.admin.theme.sidebar.isCollapsed';
    const navSectionsStateKey = 'django.admin.theme.sidebar.openSections';

    const body = document.body;
    const root = document.documentElement;
    const sidebar = document.getElementById('nav-sidebar');
    const collapseButton = document.getElementById('admin-sidebar-collapse');
    const menuButton = document.getElementById('admin-sidebar-menu-button');
    const accountDetails = document.querySelector('.admin-sidebar__account');
    const navFilter = document.getElementById('admin-nav-filter');
    const mobileQuery = window.matchMedia('(max-width: 1024px)');
    const navSections = Array.from(document.querySelectorAll('[data-admin-nav-section]'));
    const programmaticSectionToggles = new WeakSet();
    let filterBaselineOpenSections = null;
    let hadFilterQuery = false;

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

    function syncMobileVisibility() {
        if (sidebar) {
            const isHiddenOnMobile = !body.classList.contains('admin-sidebar-mobile-open') && mobileQuery.matches;
            sidebar.setAttribute('aria-hidden', String(isHiddenOnMobile));
            sidebar.toggleAttribute('inert', isHiddenOnMobile);
        }
    }

    function isSectionOpen(section) {
        return section.hasAttribute('open');
    }

    function getSectionKey(section) {
        return section.dataset.adminNavSection;
    }

    function isCurrentSection(section) {
        return section.classList.contains('is-current-app');
    }

    function syncSectionAria(section) {
        const summary = section.querySelector('.admin-sidebar__group-title');
        if (summary) {
            summary.setAttribute('aria-expanded', String(isSectionOpen(section)));
        }
    }

    function getCurrentOpenSections() {
        return new Set(navSections
            .filter(isSectionOpen)
            .map(getSectionKey)
            .filter(Boolean));
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
        const openSections = Array.from(getCurrentOpenSections());

        localStorage.setItem(navSectionsStateKey, JSON.stringify(openSections));
    }

    function persistFilteredSectionToggle(section) {
        const sectionKey = getSectionKey(section);
        if (!sectionKey) {
            return;
        }

        const openSections = new Set(filterBaselineOpenSections || getStoredOpenSections() || []);

        if (isSectionOpen(section)) {
            openSections.add(sectionKey);
        } else {
            openSections.delete(sectionKey);
        }

        filterBaselineOpenSections = openSections;
        localStorage.setItem(navSectionsStateKey, JSON.stringify(Array.from(openSections)));
    }

    function setSectionOpen(section, isOpen, shouldPersist) {
        if (section.open === isOpen) {
            return;
        }

        if (!shouldPersist) {
            programmaticSectionToggles.add(section);
        }

        section.open = isOpen;
        syncSectionAria(section);
    }

    function normalizeFilterValue(value) {
        return value.trim().toLowerCase();
    }

    function getNavItemText(element) {
        return element.textContent.trim().toLowerCase();
    }

    function filterNavigation() {
        if (!navFilter) {
            return;
        }

        const query = normalizeFilterValue(navFilter.value);
        const hasQuery = query.length > 0;

        if (hasQuery && !hadFilterQuery) {
            filterBaselineOpenSections = getCurrentOpenSections();
        }

        navSections.forEach((section) => {
            const sectionTitle = section.querySelector('.admin-sidebar__group-title span');
            const modelItems = Array.from(section.querySelectorAll('.admin-sidebar__model'));
            const matchesSection = sectionTitle && getNavItemText(sectionTitle).includes(query);
            let hasVisibleModel = false;

            modelItems.forEach((item) => {
                const matchesModel = getNavItemText(item).includes(query);
                const isVisible = !hasQuery || matchesSection || matchesModel;

                item.hidden = !isVisible;
                hasVisibleModel = hasVisibleModel || isVisible;
            });

            section.hidden = hasQuery && !matchesSection && !hasVisibleModel;

            if (hasQuery && !section.hidden) {
                setSectionOpen(section, true, false);
            }

            syncSectionAria(section);
        });

        if (!hasQuery) {
            applyOpenSections(filterBaselineOpenSections || getStoredOpenSections());
            navSections.forEach((section) => {
                section.hidden = false;
                section.querySelectorAll('.admin-sidebar__model').forEach((item) => {
                    item.hidden = false;
                });
            });
            filterBaselineOpenSections = null;
        }

        hadFilterQuery = hasQuery;
    }

    function applyOpenSections(openSections, shouldPersist) {
        if (!openSections) {
            root.classList.remove('admin-nav-state-pending');
            return;
        }

        const nextOpenSections = new Set(openSections);
        navSections
            .filter(isCurrentSection)
            .map(getSectionKey)
            .filter(Boolean)
            .forEach((sectionKey) => nextOpenSections.add(sectionKey));

        navSections.forEach((section) => {
            const sectionKey = getSectionKey(section);
            if (!sectionKey) {
                return;
            }

            setSectionOpen(section, nextOpenSections.has(sectionKey), false);
        });

        if (shouldPersist) {
            localStorage.setItem(navSectionsStateKey, JSON.stringify(Array.from(nextOpenSections)));
        }

        root.classList.remove('admin-nav-state-pending');
    }

    function applyStoredOpenSections() {
        applyOpenSections(getStoredOpenSections(), true);
    }

    const storedCollapsed = localStorage.getItem(sidebarStateKey);
    setCollapsed(storedCollapsed === 'true', false);
    setMobileOpen(false);
    applyStoredOpenSections();

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

    navSections.forEach((section) => {
        syncSectionAria(section);
        section.addEventListener('toggle', () => {
            syncSectionAria(section);
            if (programmaticSectionToggles.has(section)) {
                programmaticSectionToggles.delete(section);
                return;
            }

            if (hadFilterQuery) {
                persistFilteredSectionToggle(section);
                return;
            }

            persistOpenSections();
        });
    });

    if (navFilter) {
        navFilter.addEventListener('input', filterNavigation);
    }

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            setMobileOpen(false);
            if (accountDetails) {
                accountDetails.open = false;
            }
        }
    });

    document.addEventListener('click', (event) => {
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
}
