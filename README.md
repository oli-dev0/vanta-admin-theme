# Vanta Admin
Vanta Admin is a Django admin theme with a darker interface, tighter density,
and a standalone structure that stays close to Django's admin template system.

It is designed to be portable and to avoid frontend runtime dependencies outside
standard Django admin behavior.

## What It Adds

- A fixed sidebar with persistent collapsed state and remembered open sections.
- Light and dark theme support through CSS tokens.
- A flatter visual pass that removes heavy shadows and blur effects from the
  admin shell, login screens, cards, filters, and two-factor auth views.
- A denser dashboard, changelist, filter, message, and form presentation.
- Auto-dismissing admin messages with success, warning, and error treatment.
- Custom single-select controls for changelist actions and normal admin form
  selects, while native multi-selects stay unchanged.
- Default icons for common admin apps, models, and recent actions, including
  incident and uptime-monitor style models.
- A packaged admin favicon loaded through the theme.
- A responsive mobile sidebar overlay.
- Optional themed templates for `django-two-factor-auth` login, setup completion,
  account security, and backup-token flows.

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
