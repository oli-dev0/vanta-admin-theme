# Vanta Admin
Vanta Admin is a Django admin theme with a darker interface, tighter density,
and a standalone structure that stays close to Django's admin template system.

It is designed to be portable and to avoid frontend runtime dependencies outside
standard Django admin behavior.

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
pip install "git+https://github.com/oli-dev0/vanta-admin.git@main#subdirectory=packages/vanta_admin"
```

### Directly from GitHub with uv
```bash
uv add "git+https://github.com/oli-dev0/vanta-admin.git@main#subdirectory=packages/vanta_admin"
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

## Notes
- The package name on PyPI is `vanta-admin`.
- The Django app label you add to `INSTALLED_APPS` is `vanta_admin`.

## Links
- Website: https://vanta-admin.org/
- Repository: https://github.com/oli-dev0/vanta-admin
- Issues: https://github.com/oli-dev0/vanta-admin/issues
