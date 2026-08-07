from django import template

try:
    from django.template.defaulttags import csp_nonce_attr as django_csp_nonce_attr
except ImportError:  # Django 6.0 doesn't provide the template tag.
    django_csp_nonce_attr = None


register = template.Library()


@register.simple_tag(takes_context=True)
def vanta_csp_nonce_attr(context, media=None):
    """Render Django 6.1 CSP nonces while remaining usable on Django 6.0."""
    if django_csp_nonce_attr is not None:
        return django_csp_nonce_attr(context, media)
    return media.render() if media else ""
