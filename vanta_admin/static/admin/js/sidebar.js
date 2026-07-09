'use strict';

{
    const sidebarStateKey = 'django.admin.theme.sidebar.isCollapsed';
    const sidebarWidthStateKey = 'django.admin.theme.sidebar.width';
    const navSectionsStateKey = 'django.admin.theme.sidebar.openSections';
    const navSectionOrderStateKey = 'django.admin.theme.sidebar.sectionOrder';
    const minSidebarWidth = 220;
    const maxSidebarWidth = 420;
    const sidebarResizeStep = 16;

    const body = document.body;
    const root = document.documentElement;
    const sidebar = document.getElementById('nav-sidebar');
    const collapseButton = document.getElementById('admin-sidebar-collapse');
    const resizeHandle = document.getElementById('admin-sidebar-resize-handle');
    const menuButton = document.getElementById('admin-sidebar-menu-button');
    const sectionsToggle = document.getElementById('admin-sidebar-sections-toggle');
    const accountDetails = document.querySelector('.admin-sidebar__account');
    const navFilter = document.getElementById('admin-nav-filter');
    const navGroups = document.querySelector('.admin-sidebar__groups');
    const mobileQuery = window.matchMedia('(max-width: 1024px)');
    const navSections = Array.from(document.querySelectorAll('[data-admin-nav-section]'));
    const reorderHandles = Array.from(document.querySelectorAll('.admin-sidebar__reorder-handle'));
    const programmaticSectionToggles = new WeakSet();
    let filterBaselineOpenSections = null;
    let hadFilterQuery = false;
    let draggedSection = null;
    let draggedHandle = null;
    let resizeStartX = 0;
    let resizeStartWidth = 0;

    function clampSidebarWidth(width) {
        return Math.min(maxSidebarWidth, Math.max(minSidebarWidth, width));
    }

    function getStoredSidebarWidth() {
        const width = Number.parseInt(localStorage.getItem(sidebarWidthStateKey), 10);
        return Number.isFinite(width) ? clampSidebarWidth(width) : null;
    }

    function setSidebarWidth(width, shouldPersist) {
        const nextWidth = clampSidebarWidth(width);

        root.style.setProperty('--admin-sidebar-width', `${nextWidth}px`);

        if (resizeHandle) {
            resizeHandle.setAttribute('aria-valuemin', String(minSidebarWidth));
            resizeHandle.setAttribute('aria-valuemax', String(maxSidebarWidth));
            resizeHandle.setAttribute('aria-valuenow', String(nextWidth));
        }

        if (shouldPersist) {
            localStorage.setItem(sidebarWidthStateKey, String(nextWidth));
        }
    }

    function getCurrentSidebarWidth() {
        if (!sidebar) {
            return getStoredSidebarWidth() || minSidebarWidth;
        }

        return clampSidebarWidth(Math.round(sidebar.getBoundingClientRect().width));
    }

    function canResizeSidebar() {
        return (
            sidebar
            && resizeHandle
            && !mobileQuery.matches
            && !body.classList.contains('admin-sidebar-collapsed')
        );
    }

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

        if (resizeHandle) {
            resizeHandle.hidden = mobileQuery.matches;
        }
    }

    function isSectionOpen(section) {
        return section.hasAttribute('open');
    }

    function getSectionKey(section) {
        return section.dataset.adminNavSection;
    }

    function getOrderedNavSections() {
        if (!navGroups) {
            return navSections;
        }

        return Array.from(navGroups.querySelectorAll('[data-admin-nav-section]'));
    }

    function isFilteringNavigation() {
        return navFilter && normalizeFilterValue(navFilter.value).length > 0;
    }

    function canReorderSections() {
        return navGroups && !isFilteringNavigation();
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

    function hasOpenSections() {
        return navSections.some((section) => !section.hidden && isSectionOpen(section));
    }

    function syncSectionsToggle() {
        if (!sectionsToggle) {
            return;
        }

        const shouldCollapse = hasOpenSections();
        const label = shouldCollapse ? 'Collapse all' : 'Expand all';

        sectionsToggle.classList.toggle('is-collapse-mode', shouldCollapse);
        sectionsToggle.setAttribute('aria-label', label);
        sectionsToggle.setAttribute('title', label);
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

    function getStoredSectionOrder() {
        try {
            const value = JSON.parse(localStorage.getItem(navSectionOrderStateKey));
            return Array.isArray(value) ? value.filter((sectionKey) => typeof sectionKey === 'string') : [];
        } catch (error) {
            return [];
        }
    }

    function persistOpenSections() {
        const openSections = Array.from(getCurrentOpenSections());

        localStorage.setItem(navSectionsStateKey, JSON.stringify(openSections));
    }

    function persistSectionOrder() {
        const sectionOrder = getOrderedNavSections()
            .map(getSectionKey)
            .filter(Boolean);

        localStorage.setItem(navSectionOrderStateKey, JSON.stringify(sectionOrder));
    }

    function applyStoredSectionOrder() {
        if (!navGroups) {
            return;
        }

        const storedOrder = getStoredSectionOrder();
        if (storedOrder.length === 0) {
            return;
        }

        const sectionsByKey = new Map();
        navSections.forEach((section) => {
            const sectionKey = getSectionKey(section);
            if (sectionKey) {
                sectionsByKey.set(sectionKey, section);
            }
        });

        storedOrder.forEach((sectionKey) => {
            const section = sectionsByKey.get(sectionKey);
            if (section) {
                navGroups.append(section);
                sectionsByKey.delete(sectionKey);
            }
        });

        navSections.forEach((section) => {
            if (sectionsByKey.get(getSectionKey(section)) === section) {
                navGroups.append(section);
            }
        });
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
            const sectionTitle = section.querySelector('.admin-sidebar__group-label');
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
        syncReorderHandles();
        syncSectionsToggle();
    }

    function syncReorderHandles() {
        const isDisabled = !canReorderSections();

        if (sidebar) {
            sidebar.classList.toggle('admin-sidebar--reorder-disabled', isDisabled);
        }

        reorderHandles.forEach((handle) => {
            handle.setAttribute('aria-disabled', String(isDisabled));
        });
    }

    function moveSection(section, targetIndex) {
        if (!navGroups || !section) {
            return;
        }

        const sections = getOrderedNavSections();
        const currentIndex = sections.indexOf(section);
        if (currentIndex === -1) {
            return;
        }

        const sectionsWithoutCurrent = sections.filter((candidate) => candidate !== section);
        const boundedIndex = Math.min(sectionsWithoutCurrent.length, Math.max(0, targetIndex));
        const referenceSection = sectionsWithoutCurrent[boundedIndex] || null;
        navGroups.insertBefore(section, referenceSection);
        persistSectionOrder();
    }

    function moveSectionByKey(section, key) {
        const sections = getOrderedNavSections();
        const currentIndex = sections.indexOf(section);
        if (currentIndex === -1) {
            return;
        }

        if (key === 'ArrowUp') {
            moveSection(section, currentIndex - 1);
        } else if (key === 'ArrowDown') {
            moveSection(section, currentIndex + 1);
        } else if (key === 'Home') {
            moveSection(section, 0);
        } else if (key === 'End') {
            moveSection(section, sections.length - 1);
        }
    }

    function getSectionDropIndex(clientY) {
        const sections = getOrderedNavSections().filter((section) => section !== draggedSection && !section.hidden);

        for (let index = 0; index < sections.length; index += 1) {
            const rect = sections[index].getBoundingClientRect();
            if (clientY < rect.top + (rect.height / 2)) {
                return index;
            }
        }

        return sections.length;
    }

    function startSectionDrag(section, handle) {
        draggedSection = section;
        draggedHandle = handle;
        section.classList.add('is-reordering');
        if (sidebar) {
            sidebar.classList.add('admin-sidebar--is-reordering');
        }
    }

    function stopSectionDrag() {
        if (draggedSection) {
            draggedSection.classList.remove('is-reordering');
        }

        draggedSection = null;
        draggedHandle = null;
        if (sidebar) {
            sidebar.classList.remove('admin-sidebar--is-reordering');
        }
    }

    function moveDraggedSection(event) {
        if (!draggedSection) {
            return;
        }

        event.preventDefault();
        moveSection(draggedSection, getSectionDropIndex(event.clientY));
    }

    function finishSectionDrag(event) {
        if (!draggedSection) {
            return;
        }

        persistSectionOrder();
        if (draggedHandle && draggedHandle.hasPointerCapture(event.pointerId)) {
            draggedHandle.releasePointerCapture(event.pointerId);
        }
        stopSectionDrag();
    }

    function applyOpenSections(openSections, shouldPersist) {
        if (!openSections) {
            syncSectionsToggle();
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

        syncSectionsToggle();
        root.classList.remove('admin-nav-state-pending');
    }

    function applyStoredOpenSections() {
        applyOpenSections(getStoredOpenSections(), true);
    }

    const storedCollapsed = localStorage.getItem(sidebarStateKey);
    const storedSidebarWidth = getStoredSidebarWidth();
    if (storedSidebarWidth) {
        setSidebarWidth(storedSidebarWidth, false);
    } else if (resizeHandle) {
        setSidebarWidth(getCurrentSidebarWidth(), false);
    }
    setCollapsed(storedCollapsed === 'true', false);
    setMobileOpen(false);
    applyStoredSectionOrder();
    applyStoredOpenSections();
    syncReorderHandles();
    syncSectionsToggle();

    if (resizeHandle) {
        resizeHandle.addEventListener('pointerdown', (event) => {
            if (!canResizeSidebar()) {
                return;
            }

            resizeStartX = event.clientX;
            resizeStartWidth = getCurrentSidebarWidth();
            body.classList.add('admin-sidebar-resizing');
            resizeHandle.setPointerCapture(event.pointerId);
            event.preventDefault();
        });

        resizeHandle.addEventListener('pointermove', (event) => {
            if (!body.classList.contains('admin-sidebar-resizing')) {
                return;
            }

            setSidebarWidth(resizeStartWidth + event.clientX - resizeStartX, false);
        });

        resizeHandle.addEventListener('pointerup', (event) => {
            if (!body.classList.contains('admin-sidebar-resizing')) {
                return;
            }

            body.classList.remove('admin-sidebar-resizing');
            setSidebarWidth(getCurrentSidebarWidth(), true);
            resizeHandle.releasePointerCapture(event.pointerId);
        });

        resizeHandle.addEventListener('pointercancel', () => {
            body.classList.remove('admin-sidebar-resizing');
            setSidebarWidth(getCurrentSidebarWidth(), true);
        });

        resizeHandle.addEventListener('keydown', (event) => {
            if (!canResizeSidebar()) {
                return;
            }

            if (event.key === 'ArrowLeft') {
                setSidebarWidth(getCurrentSidebarWidth() - sidebarResizeStep, true);
                event.preventDefault();
            } else if (event.key === 'ArrowRight') {
                setSidebarWidth(getCurrentSidebarWidth() + sidebarResizeStep, true);
                event.preventDefault();
            } else if (event.key === 'Home') {
                setSidebarWidth(minSidebarWidth, true);
                event.preventDefault();
            } else if (event.key === 'End') {
                setSidebarWidth(maxSidebarWidth, true);
                event.preventDefault();
            }
        });
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

    if (sectionsToggle) {
        sectionsToggle.addEventListener('click', () => {
            const shouldOpen = !hasOpenSections();

            navSections.forEach((section) => {
                if (section.hidden) {
                    return;
                }

                setSectionOpen(section, shouldOpen, true);
            });

            persistOpenSections();
            syncSectionsToggle();
        });
    }

    navSections.forEach((section) => {
        syncSectionAria(section);
        section.addEventListener('toggle', () => {
            syncSectionAria(section);
            syncSectionsToggle();
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

    reorderHandles.forEach((handle) => {
        const section = handle.closest('[data-admin-nav-section]');

        handle.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
        });

        handle.addEventListener('pointerdown', (event) => {
            if (!section || !canReorderSections()) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            handle.setPointerCapture(event.pointerId);
            startSectionDrag(section, handle);
        });

        handle.addEventListener('pointercancel', () => {
            stopSectionDrag();
        });

        handle.addEventListener('keydown', (event) => {
            if (![' ', 'Enter', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            if (!section || !canReorderSections() || [' ', 'Enter'].includes(event.key)) {
                return;
            }

            if (['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
                moveSectionByKey(section, event.key);
                handle.focus();
            }
        });
    });

    document.addEventListener('pointermove', moveDraggedSection);
    document.addEventListener('pointerup', finishSectionDrag);
    document.addEventListener('pointercancel', stopSectionDrag);

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
