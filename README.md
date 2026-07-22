# Vanta Admin
Vanta Admin is a Django admin theme with a darker interface, tighter density,
and a standalone structure that stays close to Django's admin template system.

It is designed to be portable and to avoid frontend runtime dependencies outside
standard Django admin behavior. You still use Django admin; Vanta changes the
shell, navigation, common controls, messages, and visual treatment so the admin
feels more deliberate in everyday use.

## What It Adds

- A cleaner admin layout with a fixed sidebar that remembers how you left it.
- A Vanta-styled object history page, so audit trails feel like part of the same admin interface.
- A redesigned admin landing page with a welcome message, a larger scrollable recent-activity panel, project placeholders, and compact system context.
- A sidebar navigation filter that lets users quickly narrow large admin menus by app or model name.
- A clear button for the sidebar navigation filter, so users can reset large admin menus quickly.
- A resizable desktop sidebar that remembers each user's preferred width in the browser.
- A sidebar expand/collapse-all control for quickly opening or closing visible navigation sections.
- Draggable sidebar app sections, so users can reorder admin navigation categories in their own browser with a clearer drag preview and drop position.
- Keyboard-accessible sidebar section reordering with Arrow Up, Arrow Down, Home, and End on the reorder handle, plus Escape to cancel a drag.
- Light and dark mode, using the same calm Vanta look across the admin.
- A more settled light-mode palette with clearer search focus states and stronger changelist table headers.
- Less visual noise on the main admin screens, login pages, cards, filters, and
  two-factor auth pages.
- Denser dashboards, tables, filters, messages, and forms so admin work feels
  easier to scan.
- Better edit pages for longer admin forms, with save buttons that stay easier
  to reach while scrolling.
- Cleaner buttons for saving, deleting, viewing history, and changing passwords.
- Clearer form errors on admin pages, login, and two-factor auth screens.
- Admin messages that appear clearly, pause while hovered, and dismiss
  themselves after a short time, with a Vanta-styled manual close button.
- A recent-activity dashboard that keeps Today and Yesterday visible and
  explains when either period has no activity.
- Changelist actions that appear only when rows are selected, stay available
  while scrolling, include a clear cancel button, and use a more deliberate
  sticky action-bar treatment.
- Changelist filters that open from a compact toolbar button instead of taking a
  permanent right-side column.
- Active-filter indicators in the toolbar, including a count when filters are
  applied.
- An enhanced horizontal selector for many-to-many admin fields, with category
  grouping, item filtering, selected counts, and add/remove visible controls.
- Cleaner inline admin formsets, including compact tabular rows, stacked inline
  panels, and Vanta-styled delete controls.
- A clear-search control for changelist search forms that removes the current
  search while preserving the rest of the list state.
- More complete enhanced relationship controls, including a give-all action for
  grouped many-to-many selectors.
- Styled select controls for common admin dropdowns, plus a clearer enhanced
  horizontal selector for many-to-many fields.
- Vanta-styled changelist pagination with result summaries, previous and next
  controls, and a direct page jump.
- Built-in icons for common admin areas, models, and recent actions.
- A cleaner account menu with display preferences, project links, password
  access, 2FA settings, logout, and a Vanta support link.
- A 12-hour and 24-hour time-format preference for changelist date/time values,
  stored in the browser for each admin user.
- A small, normal, and large font-size preference for the admin interface, stored
  in the browser for each admin user.
- Shorter changelist date formatting that makes date-heavy tables easier to
  scan.
- Simpler breadcrumbs on edit pages, so the page path feels less cluttered.
- A packaged favicon for the admin.
- A mobile sidebar overlay that makes the admin easier to use on smaller
  screens.
- Optional matching templates for `django-two-factor-auth` login, setup
  completion, account security, disable confirmation, and backup-token screens.

Vanta Admin does not replace Django admin, change your permissions, or configure
two-factor authentication for you. If your project uses `django-two-factor-auth`,
Vanta provides matching templates and CSS for the visible 2FA screens.

## Tested With
Vanta Admin was created and tested with:

- Python 3.13.14
- Django 6.0.6

The package currently declares support for Django 5.2 up to, but not including,
Django 7. Older supported-range versions may also work well, but they have not
been verified as thoroughly yet.

## Installation

### PyPI with pip
```bash
pip install vanta-admin
```

### PyPI with uv
```bash
uv add vanta-admin
```

### Directly from GitHub with pip
```bash
pip install "git+https://github.com/oli-dev0/vanta-admin-theme.git@main"
```

### Directly from GitHub with uv
```bash
uv add "git+https://github.com/oli-dev0/vanta-admin-theme.git@main"
```

## Django Setup
In your Django settings file, add `vanta_admin` to `INSTALLED_APPS` before
`django.contrib.admin` so its templates override the default admin templates.

This is usually in `settings.py`, or in your project's active settings module
if you split settings across multiple files:
```python
INSTALLED_APPS = [
    'vanta_admin',
    'django.contrib.admin',
    # ...
]
```

Then run your normal static asset flow for Django:
```bash
python manage.py collectstatic
```

## Optional Two-Factor Auth Theme Support

If your project already uses `django-two-factor-auth`, place `vanta_admin` before
the two-factor apps and before `django.contrib.admin` so Vanta's templates are
found first:

```python
INSTALLED_APPS = [
    'vanta_admin',
    'django_otp',
    'django_otp.plugins.otp_static',
    'django_otp.plugins.otp_totp',
    'two_factor',
    'django.contrib.admin',
    # ...
]
```

Configure `django-two-factor-auth` normally in your project URLs and settings.
Vanta only provides the theme layer.

## Notes
- The package name on PyPI is `vanta-admin`.
- The Django app label you add to `INSTALLED_APPS` is `vanta_admin`.
- Two-factor auth support is visual/template support for projects that already
  install and configure `django-two-factor-auth`.
- Vanta keeps Django admin server-rendered. It does not add a frontend runtime
  or a custom dashboard framework.

## Links
- Website: https://vanta-admin.org/
- Repository: https://github.com/oli-dev0/vanta-admin-theme
- Issues: https://github.com/oli-dev0/vanta-admin-theme/issues
