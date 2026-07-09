'use strict';

{
    const adminMessages = Array.from(document.querySelectorAll('ul.messagelist li, #id_unusable_warning li'));
    const adminMessageDuration = 4000;

    function dismissAdminMessage(message) {
        window.clearTimeout(message.adminDismissTimer);
        message.adminDismissTimer = null;
        message.classList.add('is-removing');
        window.setTimeout(() => {
            const messageList = message.closest('ul.messagelist, #id_unusable_warning');
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
        message.classList.remove('is-paused');
        message.style.transition = 'opacity 160ms ease, transform 160ms ease';
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
        message.classList.add('is-paused');
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

    adminMessages.forEach((message) => {
        message.classList.remove('is-counting', 'is-paused', 'is-removing');
        message.style.transition = 'none';
        message.offsetWidth;
        message.addEventListener('mouseenter', () => pauseAdminMessageTimer(message));
        message.addEventListener('mouseleave', () => resumeAdminMessageTimer(message));

        window.requestAnimationFrame(() => {
            message.style.transition = 'opacity 160ms ease, transform 160ms ease';
            window.requestAnimationFrame(() => {
                message.classList.add('is-counting');
                setAdminMessageTimer(message, adminMessageDuration);
            });
        });
    });
}
