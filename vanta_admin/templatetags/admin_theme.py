from decimal import Decimal, ROUND_DOWN
import re

from django import template
from django.utils.html import conditional_escape, format_html


register = template.Library()

FACET_COUNT_PATTERN = re.compile(r"^(?P<label>.*) \((?P<count>\d+)\)$")
COMPACT_SUFFIXES = ("", "k", "m", "b", "t")
MAX_INLINE_FILTER_LABEL_LENGTH = 3


@register.simple_tag
def first_group_name(user):
    if not getattr(user, 'is_authenticated', False):
        return ''

    group = user.groups.order_by('name').first()
    return group.name if group else ''


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
        '{}&nbsp;<span class="admin-facet-count">{}</span>',
        label,
        compact_count,
    )
