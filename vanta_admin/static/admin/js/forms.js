'use strict';

{
    const customSelects = Array.from(document.querySelectorAll('select')).filter((select) => (
        !select.multiple
        && (!select.size || select.size <= 1)
        && select.dataset.vantaEnhanced !== 'true'
    ));

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

    function parseStructuredLabel(text) {
        const parts = text.split('|').map((part) => part.trim()).filter(Boolean);

        if (parts.length < 3) {
            return null;
        }

        return {
            category: parts[0],
            section: parts[1],
            label: parts.slice(2).join(' | ')
        };
    }

    function createOption(optionData, selected = false) {
        return new Option(optionData.text, optionData.value, false, selected);
    }

    function enhanceHorizontalSelector(selector, selectorIndex) {
        if (selector.dataset.vantaEnhanced === 'true' || selector.classList.contains('stacked')) {
            return;
        }

        const fromSelect = selector.querySelector('select[id$="_from"]');
        const toSelect = selector.querySelector('select[id$="_to"]');

        if (!fromSelect || !toSelect || !fromSelect.multiple || !toSelect.multiple) {
            return;
        }

        const fieldId = fromSelect.id.replace(/_from$/, '');
        const fieldLabel = selector.closest('.form-row')?.querySelector('label')?.textContent.trim()
            || toSelect.name
            || 'items';
        const selectedValues = new Set(Array.from(toSelect.options).map((option) => option.value));
        const optionMap = new Map();

        [...Array.from(fromSelect.options), ...Array.from(toSelect.options)].forEach((option) => {
            if (!optionMap.has(option.value)) {
                const text = option.textContent.trim();
                const structured = parseStructuredLabel(text);
                optionMap.set(option.value, {
                    value: option.value,
                    text,
                    category: structured?.category || '',
                    section: structured?.section || '',
                    label: structured?.label || text
                });
            }
        });

        const options = Array.from(optionMap.values());

        if (!options.length) {
            return;
        }

        const usesCategories = options.some((option) => option.category && option.section);
        const categories = usesCategories
            ? Array.from(new Set(options.map((option) => option.category)))
            : [];
        let activeCategory = categories[0] || '';
        let searchQuery = '';

        const widget = document.createElement('div');
        const header = document.createElement('div');
        const title = document.createElement('div');
        const countWrap = document.createElement('div');
        const clearAllSelected = document.createElement('button');
        const clearAllSeparator = document.createElement('span');
        const clearAllIcon = document.createElement('span');
        const clearAllText = document.createElement('span');
        const count = document.createElement('div');
        const tools = document.createElement('div');
        const searchWrap = document.createElement('div');
        const search = document.createElement('input');
        const addVisible = document.createElement('button');
        const removeVisible = document.createElement('button');
        const categoryNav = document.createElement('div');
        const addAllCategories = document.createElement('button');
        const addAllCategoriesIcon = document.createElement('span');
        const addAllCategoriesText = document.createElement('span');
        const listActions = document.createElement('div');
        const list = document.createElement('div');
        const empty = document.createElement('p');
        const categoryButtons = new Map();
        const widgetId = `admin-checkbox-selector-${selectorIndex}`;

        widget.className = 'admin-checkbox-selector';
        widget.id = widgetId;
        header.className = 'admin-checkbox-selector__header';
        title.className = 'admin-checkbox-selector__title';
        countWrap.className = 'admin-checkbox-selector__count-wrap';
        clearAllSelected.className = 'admin-checkbox-selector__clear-selected';
        clearAllSeparator.className = 'admin-checkbox-selector__clear-selected-separator';
        clearAllIcon.className = 'admin-checkbox-selector__clear-selected-icon';
        clearAllText.className = 'admin-checkbox-selector__clear-selected-text';
        count.className = 'admin-checkbox-selector__count';
        tools.className = 'admin-checkbox-selector__tools';
        searchWrap.className = 'admin-checkbox-selector__search-wrap';
        search.className = 'admin-checkbox-selector__search';
        addVisible.className = 'admin-checkbox-selector__bulk-button';
        removeVisible.className = 'admin-checkbox-selector__bulk-button admin-checkbox-selector__bulk-button--muted';
        categoryNav.className = 'admin-checkbox-selector__categories';
        addAllCategories.className = 'admin-checkbox-selector__give-all';
        addAllCategoriesIcon.className = 'admin-checkbox-selector__give-all-icon';
        addAllCategoriesText.className = 'admin-checkbox-selector__give-all-text';
        listActions.className = 'admin-checkbox-selector__list-actions';
        list.className = 'admin-checkbox-selector__list';
        empty.className = 'admin-checkbox-selector__empty';

        title.textContent = fieldLabel.replace(/^Available\s+/i, '');
        clearAllSelected.type = 'button';
        clearAllSelected.setAttribute('aria-label', `Clear selected ${title.textContent}`);
        clearAllSelected.title = `Clear selected ${title.textContent}`;
        clearAllSeparator.textContent = '|';
        clearAllIcon.textContent = 'x';
        clearAllText.textContent = 'remove all';
        clearAllSelected.append(clearAllIcon, clearAllText);
        search.type = 'search';
        search.id = `${fieldId}_vanta_filter`;
        search.autocomplete = 'off';
        search.placeholder = 'Filter items';
        search.setAttribute('aria-label', `Filter ${title.textContent}`);
        addVisible.type = 'button';
        addVisible.textContent = 'Add all';
        removeVisible.type = 'button';
        removeVisible.textContent = 'Remove all';
        addAllCategories.type = 'button';
        addAllCategories.setAttribute('aria-label', `Give all ${title.textContent}`);
        addAllCategoriesIcon.textContent = '+';
        addAllCategoriesText.textContent = 'give all';
        addAllCategories.append(addAllCategoriesIcon, addAllCategoriesText);
        empty.textContent = 'No matching items.';

        function optionMatches(option) {
            if (usesCategories && option.category !== activeCategory) {
                return false;
            }

            if (!searchQuery) {
                return true;
            }

            return option.text.toLowerCase().includes(searchQuery);
        }

        function visibleOptions() {
            return options.filter(optionMatches);
        }

        function syncNativeSelects() {
            const fromOptions = [];
            const toOptions = [];

            options.forEach((option) => {
                if (selectedValues.has(option.value)) {
                    toOptions.push(createOption(option, true));
                } else {
                    fromOptions.push(createOption(option));
                }
            });

            fromSelect.replaceChildren(...fromOptions);
            toSelect.replaceChildren(...toOptions);

            if (window.SelectBox?.cache) {
                window.SelectBox.cache[fromSelect.id] = fromOptions.map((option) => ({
                    value: option.value,
                    text: option.text,
                    displayed: 1
                }));
                window.SelectBox.cache[toSelect.id] = toOptions.map((option) => ({
                    value: option.value,
                    text: option.text,
                    displayed: 1
                }));
            }

            toSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }

        function syncCounts() {
            count.textContent = `${selectedValues.size} selected`;

            categoryButtons.forEach((button, category) => {
                const badge = button.querySelector('.admin-checkbox-selector__category-count');
                const selectedInCategory = options.filter((option) => (
                    option.category === category && selectedValues.has(option.value)
                )).length;

                button.classList.toggle('is-active', category === activeCategory);
                button.setAttribute('aria-pressed', String(category === activeCategory));
                badge.textContent = String(selectedInCategory);
                badge.hidden = selectedInCategory === 0;
            });
        }

        function renderList() {
            const visible = visibleOptions();
            const fragment = document.createDocumentFragment();
            const sections = new Map();

            list.replaceChildren();

            visible.forEach((option) => {
                const sectionName = usesCategories ? option.section : '';
                if (!sections.has(sectionName)) {
                    sections.set(sectionName, []);
                }
                sections.get(sectionName).push(option);
            });

            sections.forEach((sectionOptions, sectionName) => {
                const sectionBlock = document.createElement('section');
                sectionBlock.className = sectionName
                    ? 'admin-checkbox-selector__section-block'
                    : 'admin-checkbox-selector__section-block admin-checkbox-selector__section-block--flat';

                if (sectionName) {
                    const sectionTitle = document.createElement('h3');
                    sectionTitle.className = 'admin-checkbox-selector__section-title';
                    sectionTitle.textContent = sectionName;
                    sectionBlock.append(sectionTitle);
                }

                const group = document.createElement('div');
                group.className = 'admin-checkbox-selector__section';

                sectionOptions.forEach((option) => {
                    const row = document.createElement('label');
                    const checkbox = document.createElement('input');
                    const text = document.createElement('span');

                    row.className = 'admin-checkbox-selector__item';
                    checkbox.type = 'checkbox';
                    checkbox.value = option.value;
                    checkbox.checked = selectedValues.has(option.value);
                    checkbox.id = `${fieldId}_vanta_${option.value}`;
                    text.textContent = option.label;

                    checkbox.addEventListener('change', () => {
                        if (checkbox.checked) {
                            selectedValues.add(option.value);
                        } else {
                            selectedValues.delete(option.value);
                        }
                        syncNativeSelects();
                        syncCounts();
                    });

                    row.append(checkbox, text);
                    group.append(row);
                });

                sectionBlock.append(group);
                fragment.append(sectionBlock);
            });

            if (!visible.length) {
                fragment.append(empty);
            }

            list.append(fragment, listActions);
            syncCounts();
        }

        categories.forEach((category) => {
            const button = document.createElement('button');
            const buttonText = document.createElement('span');
            const badge = document.createElement('span');

            button.type = 'button';
            button.className = 'admin-checkbox-selector__category';
            button.setAttribute('aria-controls', widgetId);
            buttonText.textContent = category;
            badge.className = 'admin-checkbox-selector__category-count';
            badge.hidden = true;
            button.append(buttonText, badge);
            button.addEventListener('click', () => {
                activeCategory = category;
                renderList();
            });
            categoryButtons.set(category, button);
            categoryNav.append(button);
        });

        addAllCategories.addEventListener('click', () => {
            options.forEach((option) => selectedValues.add(option.value));
            syncNativeSelects();
            renderList();
        });

        search.addEventListener('input', () => {
            searchQuery = search.value.trim().toLowerCase();
            renderList();
        });

        addVisible.addEventListener('click', () => {
            visibleOptions().forEach((option) => selectedValues.add(option.value));
            syncNativeSelects();
            renderList();
        });

        removeVisible.addEventListener('click', () => {
            visibleOptions().forEach((option) => selectedValues.delete(option.value));
            syncNativeSelects();
            renderList();
        });

        clearAllSelected.addEventListener('click', () => {
            selectedValues.clear();
            syncNativeSelects();
            renderList();
        });

        toSelect.form?.addEventListener('submit', () => {
            syncNativeSelects();
            Array.from(toSelect.options).forEach((option) => {
                option.selected = true;
            });
        }, { capture: true });

        countWrap.append(count, clearAllSeparator, clearAllSelected);
        header.append(title, countWrap);
        searchWrap.append(search);
        tools.append(searchWrap);
        listActions.append(addVisible, removeVisible);
        widget.append(header);
        if (usesCategories) {
            categoryNav.prepend(addAllCategories);
            widget.append(categoryNav);
        }
        widget.append(tools, list);

        selector.dataset.vantaEnhanced = 'true';
        selector.classList.add('admin-checkbox-selector-source');
        selector.prepend(widget);
        syncNativeSelects();
        renderList();
    }

    function enhanceHorizontalSelectors() {
        document.querySelectorAll('.selector').forEach(enhanceHorizontalSelector);
    }

    function enhanceInlineDeleteControls(root = document) {
        root.querySelectorAll('.inline-group .delete input[type="checkbox"][name$="-DELETE"]').forEach((checkbox) => {
            if (checkbox.dataset.vantaDeleteEnhanced === 'true') {
                return;
            }

            const row = checkbox.closest('tr.form-row, .inline-related');
            const originalText = row?.querySelector('.original p')?.textContent.trim().replace(/\s+/g, ' ');
            const button = document.createElement('button');
            const label = originalText ? `Delete ${originalText}` : 'Delete inline row';

            checkbox.dataset.vantaDeleteEnhanced = 'true';
            checkbox.classList.add('admin-inline-delete-native');

            button.type = 'button';
            button.className = 'admin-inline-delete-button';
            button.setAttribute('aria-label', label);
            button.title = label;

            checkbox.after(button);

            if (checkbox.checked) {
                row?.classList.add('is-inline-deleted');
            }

            button.addEventListener('click', () => {
                checkbox.checked = true;
                checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                row?.classList.add('is-inline-deleted');
            });
        });
    }

    enhanceInlineDeleteControls();

    window.addEventListener('load', () => {
        window.setTimeout(enhanceHorizontalSelectors, 0);
        window.setTimeout(enhanceInlineDeleteControls, 0);
    });

    const inlineObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    enhanceInlineDeleteControls(node);
                }
            });
        });
    });

    inlineObserver.observe(document.body, { childList: true, subtree: true });

    function syncStickySubmitRow() {
        const form = document.querySelector('body.change-form form[id$="_form"]');
        const submitRow = form?.querySelector('.submit-row:last-of-type');

        if (!form || !submitRow) {
            return;
        }

        let placeholder = submitRow.nextElementSibling;
        if (!placeholder || !placeholder.classList.contains('admin-submit-row-placeholder')) {
            placeholder = document.createElement('div');
            placeholder.className = 'admin-submit-row-placeholder';
            submitRow.after(placeholder);
        }

        function syncSubmitRowPosition() {
            const formRect = form.getBoundingClientRect();
            const rowRect = submitRow.getBoundingClientRect();
            const isFixed = submitRow.classList.contains('is-sticky-submit-row');
            const naturalTop = isFixed
                ? placeholder.getBoundingClientRect().top
                : rowRect.top;
            const shouldStick = naturalTop + rowRect.height > window.innerHeight && formRect.top < window.innerHeight;

            submitRow.classList.toggle('is-sticky-submit-row', shouldStick);
            form.classList.toggle('has-sticky-submit-row', shouldStick);

            if (shouldStick) {
                const contentRect = form.getBoundingClientRect();
                const left = Math.max(contentRect.left, 12);
                const rightEdge = Math.min(contentRect.right, window.innerWidth - 12);
                const width = Math.max(rightEdge - left, 0);

                submitRow.style.setProperty('--admin-submit-row-fixed-left', `${left}px`);
                submitRow.style.setProperty('--admin-submit-row-fixed-width', `${width}px`);
                placeholder.style.height = `${rowRect.height}px`;
            } else {
                submitRow.style.removeProperty('--admin-submit-row-fixed-left');
                submitRow.style.removeProperty('--admin-submit-row-fixed-width');
                placeholder.style.height = '0px';
            }
        }

        window.addEventListener('scroll', syncSubmitRowPosition, { passive: true });
        window.addEventListener('resize', syncSubmitRowPosition);
        syncSubmitRowPosition();
    }

    syncStickySubmitRow();

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
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
    });
}
