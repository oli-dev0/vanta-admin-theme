from decimal import Decimal, ROUND_DOWN
import re

from django import template
from django.utils.html import conditional_escape, format_html


register = template.Library()

FACET_COUNT_PATTERN = re.compile(r"^(?P<label>.*) \((?P<count>\d+)\)$")
COMPACT_SUFFIXES = ("", "k", "m", "b", "t")
MAX_INLINE_FILTER_LABEL_LENGTH = 3
DEFAULT_ADMIN_ICON = "admin-icon-file"
NON_FILTER_CHANGE_LIST_PARAMS = {
    "all",
    "e",
    "o",
    "p",
    "q",
    "_facets",
    "_popup",
    "is_facets",
}

APP_ICON_MAP = {
    "auth": "admin-icon-shield",
    "authentication": "admin-icon-shield",
    "accounts": "admin-icon-users",
    "account": "admin-icon-users",
    "users": "admin-icon-users",
    "people": "admin-icon-users",
    "contacts": "admin-icon-envelope",
    "contact": "admin-icon-envelope",
    "messages": "admin-icon-envelope",
    "support": "admin-icon-envelope",
    "blog": "admin-icon-card",
    "content": "admin-icon-card",
    "cms": "admin-icon-card",
    "shop": "admin-icon-card",
    "store": "admin-icon-card",
    "commerce": "admin-icon-card",
    "products": "admin-icon-card",
    "orders": "admin-icon-file",
    "projects": "admin-icon-folder",
    "tasks": "admin-icon-clock",
    "reports": "admin-icon-clock",
    "analytics": "admin-icon-clock",
    "analytic": "admin-icon-clock",
    "sites": "admin-icon-external",
    "settings": "admin-icon-lock",
}

MODEL_ICON_MAP = {
    "account": "admin-icon-user",
    "article": "admin-icon-card",
    "audit": "admin-icon-clock",
    "blogpost": "admin-icon-card",
    "cart": "admin-icon-card",
    "category": "admin-icon-folder",
    "client": "admin-icon-user",
    "comment": "admin-icon-envelope",
    "contact": "admin-icon-user",
    "contactmessage": "admin-icon-envelope",
    "coupon": "admin-icon-card",
    "customer": "admin-icon-user",
    "customerorder": DEFAULT_ADMIN_ICON,
    "document": DEFAULT_ADMIN_ICON,
    "email": "admin-icon-envelope",
    "entry": "admin-icon-card",
    "event": "admin-icon-clock",
    "feedback": "admin-icon-envelope",
    "file": DEFAULT_ADMIN_ICON,
    "group": "admin-icon-users",
    "image": "admin-icon-card",
    "incident": "admin-icon-alert-triangle",
    "inquiry": "admin-icon-envelope",
    "invoice": DEFAULT_ADMIN_ICON,
    "invoicepayment": "admin-icon-card",
    "kumamonitor": "admin-icon-heart",
    "lead": "admin-icon-user",
    "log": "admin-icon-clock",
    "marketingcampaign": "admin-icon-clock",
    "media": "admin-icon-card",
    "member": "admin-icon-user",
    "message": "admin-icon-envelope",
    "milestone": "admin-icon-clock",
    "notification": "admin-icon-envelope",
    "order": DEFAULT_ADMIN_ICON,
    "orderitem": "admin-icon-card",
    "page": "admin-icon-card",
    "payment": "admin-icon-card",
    "permission": "admin-icon-shield",
    "plan": "admin-icon-card",
    "post": "admin-icon-card",
    "product": "admin-icon-card",
    "profile": "admin-icon-user",
    "project": "admin-icon-folder",
    "report": "admin-icon-clock",
    "role": "admin-icon-shield",
    "session": "admin-icon-lock",
    "setting": "admin-icon-lock",
    "site": "admin-icon-external",
    "subscriber": "admin-icon-user",
    "subscription": "admin-icon-card",
    "supportticket": "admin-icon-envelope",
    "tag": "admin-icon-folder",
    "task": "admin-icon-clock",
    "ticket": "admin-icon-envelope",
    "todo": "admin-icon-clock",
    "token": "admin-icon-lock",
    "user": "admin-icon-user",
}

# Ordered from specific to broad so ambiguous names resolve predictably.
CATEGORY_KEYWORDS = (
    (("support", "ticket", "message", "email", "notification", "inquiry", "feedback"), "admin-icon-envelope"),
    (("permission", "role", "auth", "staff"), "admin-icon-shield"),
    (("user", "customer", "client", "contact", "subscriber", "member", "lead", "profile", "account"), "admin-icon-user"),
    (("group", "team", "people"), "admin-icon-users"),
    (("project", "folder", "category", "tag"), "admin-icon-folder"),
    (("post", "blog", "page", "article", "entry", "content", "media", "image"), "admin-icon-card"),
    (("product", "order", "invoice", "payment", "subscription", "plan", "cart", "coupon"), "admin-icon-card"),
    (("task", "todo", "milestone", "event", "calendar", "campaign", "report", "analytics", "metric", "stat", "log", "audit"), "admin-icon-clock"),
    (("setting", "config", "site", "domain", "session", "token"), "admin-icon-lock"),
)


@register.simple_tag
def first_group_name(user):
    if not getattr(user, 'is_authenticated', False):
        return ''

    group = user.groups.order_by('name').first()
    return group.name if group else ''


def _normalize_icon_name(value):
    if value is None:
        return ""

    text = re.sub(r"(?<!^)(?=[A-Z])", " ", str(value))
    text = re.sub(r"[^a-zA-Z0-9]+", " ", text).lower()
    parts = [part[:-1] if len(part) > 3 and part.endswith("s") else part for part in text.split()]
    return "".join(parts)


def _admin_context_value(item, key):
    if isinstance(item, dict):
        return item.get(key)
    return getattr(item, key, None)


def _icon_for_names(names, exact_map):
    normalized_names = [_normalize_icon_name(name) for name in names]

    for name in normalized_names:
        if name in exact_map:
            return exact_map[name]

    for name in normalized_names:
        # Category order is intentional fallback behavior; keep it stable.
        for keywords, icon in CATEGORY_KEYWORDS:
            if any(keyword in name for keyword in keywords):
                return icon

    return DEFAULT_ADMIN_ICON


@register.filter
def admin_app_icon(app):
    return _icon_for_names(
        (
            _admin_context_value(app, "app_label"),
            _admin_context_value(app, "name"),
        ),
        APP_ICON_MAP,
    )


@register.filter
def admin_model_icon(model, app_label=None):
    return _icon_for_names(
        (
            _admin_context_value(model, "object_name"),
            _admin_context_value(model, "name"),
            app_label,
        ),
        MODEL_ICON_MAP,
    )


@register.filter
def admin_content_type_icon(content_type):
    return _icon_for_names(
        (
            _admin_context_value(content_type, "model"),
            _admin_context_value(content_type, "name"),
            _admin_context_value(content_type, "app_label"),
        ),
        MODEL_ICON_MAP,
    )


def _format_compact_count(value):
    count = int(value)
    if count < 1000:
        return str(count)

    compact_value = Decimal(count)
    suffix_index = 0

    while compact_value >= 1000 and suffix_index < len(COMPACT_SUFFIXES) - 1:
        compact_value /= 1000
        suffix_index += 1

    compact_value = compact_value.quantize(Decimal("0.1"), rounding=ROUND_DOWN)
    if compact_value == compact_value.to_integral():
        compact_str = str(compact_value.quantize(Decimal("1")))
    else:
        compact_str = format(compact_value.normalize(), "f")

    return f"{compact_str}{COMPACT_SUFFIXES[suffix_index]}"


def _facet_label_text(value):
    if value is None:
        return ""

    text = str(value)
    match = FACET_COUNT_PATTERN.match(text)
    return match.group("label") if match else text


@register.simple_tag
def active_admin_filter_count(cl):
    params = getattr(cl, "params", {}) or {}
    return sum(
        1
        for key, value in params.items()
        if key not in NON_FILTER_CHANGE_LIST_PARAMS and value not in (None, "")
    )




def _clone_admin_item(item):
    if isinstance(item, dict):
        cloned = dict(item)
        models = cloned.get("models")
        if models is not None:
            cloned["models"] = [_clone_admin_item(model) for model in models]
        return cloned
    return item


def _set_admin_item_value(item, key, value):
    if isinstance(item, dict):
        item[key] = value
        return item
    setattr(item, key, value)
    return item


@register.simple_tag
def grouped_admin_nav_apps(available_apps):
    grouped_apps = []
    auth_group = None

    for app in available_apps or []:
        app_label = _admin_context_value(app, "app_label")
        app_copy = _clone_admin_item(app)

        if app_label == "auth":
            auth_group = app_copy
            grouped_apps.append(auth_group)
            continue

        if app_label in {"otp_static", "otp_totp"}:
            if auth_group is None:
                auth_group = {
                    "app_label": "auth",
                    "name": "Auth",
                    "app_url": _admin_context_value(app_copy, "app_url"),
                    "has_module_perms": True,
                    "models": [],
                }
                grouped_apps.append(auth_group)

            for model in _admin_context_value(app_copy, "models") or []:
                model_copy = _clone_admin_item(model)
                object_name = (_admin_context_value(model_copy, "object_name") or "").lower()
                if object_name == "staticdevice":
                    _set_admin_item_value(model_copy, "name", "2FA backup codes")
                elif object_name == "totpdevice":
                    _set_admin_item_value(model_copy, "name", "2FA")
                auth_group["models"].append(model_copy)
            continue

        grouped_apps.append(app_copy)

    return grouped_apps

@register.simple_tag
def admin_filter_choice_layout(choices):
    for choice in choices:
        label = _facet_label_text(choice.get("display", ""))
        if len(label.strip()) > MAX_INLINE_FILTER_LABEL_LENGTH:
            return "admin-filter-options admin-filter-options--stacked"

    return "admin-filter-options admin-filter-options--inline"


@register.filter(needs_autoescape=True)
def format_admin_facet_label(value, autoescape=True):
    if value is None:
        return ""

    text = str(value)
    match = FACET_COUNT_PATTERN.match(text)
    if not match:
        return text

    escaper = conditional_escape if autoescape else (lambda item: item)
    label = escaper(match.group("label"))
    compact_count = _format_compact_count(match.group("count"))
    return format_html(
        '{}&nbsp;-&nbsp;<span class="admin-facet-count">{}</span>',
        label,
        compact_count,
    )
