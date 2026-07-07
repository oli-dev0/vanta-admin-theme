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
    const mobileQuery = window.matchMedia('(max-width: 1024px)');
    const navSections = Array.from(document.querySelectorAll('[data-admin-nav-section]'));

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
            persistOpenSections();
        });
    });

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
