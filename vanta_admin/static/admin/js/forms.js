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
