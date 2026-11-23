from datetime import date
from decimal import Decimal


def week_label(week: date) -> str:
    return f"week of {week:%b} {week.day}"


def number(value: Decimal | float | int | None) -> str:
    return "empty" if value is None else format(Decimal(str(value)).normalize(), "f")
