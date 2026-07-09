from datetime import timedelta
from decimal import Decimal, ROUND_DOWN
import re
import sys
from urllib.parse import urlencode

from django import get_version, template
from django.conf import settings
from django.contrib.admin.models import ADDITION, CHANGE, DELETION, LogEntry
from django.db import connection
from django.urls import NoReverseMatch, reverse
from django.utils import timezone
from django.utils.html import conditional_escape, format_html
from django.utils.text import capfirst, Truncator
from django.utils.translation import gettext as _


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
RECENT_ACTIVITY_LIMIT = 10
RECENT_ACTIVITY_QUERY_LIMIT = 60
RECENT_ACTIVITY_GROUPS = ("today", "yesterday")
UNAVAILABLE_VALUE = _("Unavailable")
SAFE_ENVIRONMENT_SETTING_NAMES = (
    "ENVIRONMENT_LABEL",
    "ENVIRONMENT_NAME",
    "ENVIRONMENT",
    "APP_ENV",
    "DJANGO_ENV",
)

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


@register.simple_tag
def admin_display_name(user):
    get_short_name = getattr(user, "get_short_name", None)
    short_name = get_short_name() if callable(get_short_name) else ""
    if short_name:
        return short_name

    get_username = getattr(user, "get_username", None)
    username = get_username() if callable(get_username) else ""
    if username:
        return username

    return str(user) if user else _("admin")


def _visible_admin_model_keys(app_list):
    visible_keys = set()

    for app in app_list or []:
        app_label = _admin_context_value(app, "app_label")
        for model in _admin_context_value(app, "models") or []:
            object_name = _admin_context_value(model, "object_name")
            if app_label and object_name:
                visible_keys.add((str(app_label).lower(), str(object_name).lower()))

    return visible_keys


def _can_show_log_entry(entry, visible_model_keys):
    content_type = entry.content_type
    if not content_type:
        return True

    if not visible_model_keys:
        return False

    return (content_type.app_label.lower(), content_type.model.lower()) in visible_model_keys


def _admin_log_action_label(entry):
    action_labels = {
        ADDITION: _("Added"),
        CHANGE: _("Changed"),
        DELETION: _("Deleted"),
    }
    action_label = action_labels.get(entry.action_flag, _("Updated"))

    content_type = entry.content_type
    model_label = capfirst(content_type.name) if content_type else _("item")
    object_label = Truncator(entry.object_repr or "").chars(80)
    if object_label.isdigit():
        object_label = ""

    if object_label:
        return _('%(action)s %(model)s "%(object)s"') % {
            "action": action_label,
            "model": model_label,
            "object": object_label,
        }

    return _("%(action)s %(model)s") % {
        "action": action_label,
        "model": model_label,
    }


def _safe_admin_log_url(entry):
    if entry.is_deletion() or not entry.content_type:
        return ""

    try:
        return entry.get_admin_url()
    except (AttributeError, NoReverseMatch):
        return ""


def _group_recent_activity(entries, limit):
    today = timezone.localdate()
    yesterday = today - timedelta(days=1)
    grouped = {group_key: [] for group_key in RECENT_ACTIVITY_GROUPS}

    for entry in entries:
        local_action_time = timezone.localtime(entry.action_time)
        entry_date = local_action_time.date()
        if entry_date == today:
            group_key = "today"
        elif entry_date == yesterday:
            group_key = "yesterday"
        else:
            continue

        grouped[group_key].append(
            {
                "time": local_action_time.strftime("%I:%M %p").lstrip("0"),
                "iso_time": local_action_time.isoformat(),
                "label": _admin_log_action_label(entry),
                "url": _safe_admin_log_url(entry),
            }
        )

        total_entries = sum(len(grouped[key]) for key in RECENT_ACTIVITY_GROUPS)
        if total_entries >= limit:
            break

    groups = [
        {"key": "today", "label": _("Today"), "items": grouped["today"]},
        {"key": "yesterday", "label": _("Yesterday"), "items": grouped["yesterday"]},
    ]
    return groups


def _safe_admin_history_url(user=None):
    try:
        url = reverse("admin:admin_logentry_changelist")
    except NoReverseMatch:
        return ""

    if user is not None and getattr(user, "pk", None):
        return f"{url}?{urlencode({'user__id__exact': user.pk})}"

    return url


@register.simple_tag(takes_context=True)
def get_vanta_recent_activity(context, limit=RECENT_ACTIVITY_LIMIT):
    user = context.get("user")
    if not getattr(user, "is_authenticated", False):
        return {"groups": _group_recent_activity([], int(limit)), "has_activity": False, "history_url": ""}

    visible_model_keys = _visible_admin_model_keys(context.get("app_list"))
    log_entries = (
        LogEntry.objects.select_related("content_type", "user")
        .filter(user=user)
        .order_by("-action_time")[:RECENT_ACTIVITY_QUERY_LIMIT]
    )
    visible_entries = [
        entry for entry in log_entries if _can_show_log_entry(entry, visible_model_keys)
    ]

    # The dashboard only includes this admin's own log entries and only for
    # models visible in this index context.
    groups = _group_recent_activity(visible_entries, int(limit))
    return {
        "groups": groups,
        "has_activity": any(group["items"] for group in groups),
        "history_url": _safe_admin_history_url(user),
    }


def _row(label, value):
    return {"label": label, "value": value or UNAVAILABLE_VALUE}


@register.simple_tag
def get_vanta_system_rows():
    current_time = timezone.localtime(timezone.now()).strftime("%Y-%m-%d %H:%M")
    return [
        _row(_("Django version"), get_version()),
        _row(_("Python version"), ".".join(str(part) for part in sys.version_info[:3])),
        _row(_("Database"), capfirst(connection.vendor)),
        _row(_("Timezone"), getattr(settings, "TIME_ZONE", "")),
        _row(_("Server time"), current_time),
    ]


def _safe_environment_label():
    for setting_name in SAFE_ENVIRONMENT_SETTING_NAMES:
        value = getattr(settings, setting_name, "")
        if not value:
            continue

        text = str(value).strip()
        if len(text) <= 40 and re.fullmatch(r"[\w .:-]+", text):
            return capfirst(text)

    return ""


def _email_status():
    backend = getattr(settings, "EMAIL_BACKEND", "")
    if not backend:
        return UNAVAILABLE_VALUE

    if any(marker in backend for marker in ("console", "locmem", "dummy")):
        return _("Local/test backend")

    return _("Configured")


def _media_storage_status():
    storages = getattr(settings, "STORAGES", {}) or {}
    if "default" in storages or getattr(settings, "DEFAULT_FILE_STORAGE", ""):
        return _("Configured")

    return UNAVAILABLE_VALUE


@register.simple_tag(takes_context=True)
def get_vanta_environment_rows(context):
    request = context.get("request")
    site_name = getattr(getattr(request, "site", None), "name", "")

    # Keep values deliberately generic; raw environment variables, database URLs,
    # storage paths, hostnames, and provider names do not belong on this page.
    rows = []
    environment_label = _safe_environment_label()
    if environment_label:
        rows.append(_row(_("Environment"), environment_label))

    rows.extend(
        [
            _row(_("Debug mode"), _("Enabled") if settings.DEBUG else _("Disabled")),
            _row(_("Site name"), site_name),
            _row(_("Email"), _email_status()),
            _row(
                _("Static files"),
                _("Configured")
                if getattr(settings, "STATIC_URL", "")
                else UNAVAILABLE_VALUE,
            ),
            _row(_("Media storage"), _media_storage_status()),
        ]
    )
    return rows


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
