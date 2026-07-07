'use strict';

{
    const validThemeValues = new Set(['light', 'dark']);
    const validTimeFormatValues = new Set(['12', '24']);
    const timeFormatStorageKey = 'django.admin.theme.timeFormat';
    const root = document.documentElement;
    const themeButtons = document.querySelectorAll('[data-admin-theme-value]');
    const timeFormatButtons = document.querySelectorAll('[data-admin-time-format-value]');

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

    function updateTimeFormatButtons(timeFormat) {
        timeFormatButtons.forEach((button) => {
            button.setAttribute('aria-pressed', String(button.dataset.adminTimeFormatValue === timeFormat));
        });
    }

    function formatHour(hour, meridiem) {
        let formattedHour = Number(hour);

        if (meridiem === 'p.m.' && formattedHour !== 12) {
            formattedHour += 12;
        } else if (meridiem === 'a.m.' && formattedHour === 12) {
            formattedHour = 0;
        }

        return String(formattedHour).padStart(2, '0');
    }

    function abbreviateMonth(text) {
        return text.replace(
            /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/g,
            (month) => month.slice(0, 3),
        );
    }

    function formatDateOrder(text) {
        return text.replace(
            /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{1,2}), (\d{4}), ([^,]+)/g,
            (match, month, day, year, time) => `${day} ${month} ${year} ${time}`,
        );
    }

    function formatTableDateText(text) {
        return formatDateOrder(abbreviateMonth(text));
    }

    function formatTableTimeText(text) {
        const formattedMinuteTime = text.replace(
            /(\b[A-Z][a-z]+ \d{1,2}, \d{4}, )(\d{1,2}):(\d{2}) (a\.m\.|p\.m\.)(?=$|[^\w])/g,
            (match, datePrefix, hour, minute, meridiem) => `${datePrefix}${formatHour(hour, meridiem)}:${minute}`,
        );

        const formattedTime = formattedMinuteTime.replace(
            /(\b[A-Z][a-z]+ \d{1,2}, \d{4}, )(\d{1,2}) (a\.m\.|p\.m\.)(?=$|[^\w])/g,
            (match, datePrefix, hour, meridiem) => `${datePrefix}${Number(formatHour(hour, meridiem))}h`,
        );

        return formatTableDateText(formattedTime);
    }

    function updateTableTimeFormat(timeFormat) {
        document.querySelectorAll('#changelist table tbody th, #changelist table tbody td').forEach((cell) => {
            if (cell.childElementCount !== 0) {
                return;
            }

            if (!cell.dataset.adminOriginalTimeText) {
                cell.dataset.adminOriginalTimeText = cell.textContent;
            }

            const originalText = cell.dataset.adminOriginalTimeText;
            const formattedText = timeFormat === '24' ? formatTableTimeText(originalText) : formatTableDateText(originalText);

            cell.textContent = formattedText;
        });
    }

    function applyTimeFormat(timeFormat) {
        if (!validTimeFormatValues.has(timeFormat)) {
            return;
        }

        localStorage.setItem(timeFormatStorageKey, timeFormat);
        updateTimeFormatButtons(timeFormat);
        updateTableTimeFormat(timeFormat);
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

    const storedTimeFormat = localStorage.getItem(timeFormatStorageKey);
    const initialTimeFormat = validTimeFormatValues.has(storedTimeFormat) ? storedTimeFormat : '12';
    updateTimeFormatButtons(initialTimeFormat);
    updateTableTimeFormat(initialTimeFormat);

    timeFormatButtons.forEach((button) => {
        button.addEventListener('click', () => {
            applyTimeFormat(button.dataset.adminTimeFormatValue);
        });
    });
}
