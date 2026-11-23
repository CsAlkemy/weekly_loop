from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo


def local_date(instant: datetime, tz: ZoneInfo) -> date:
    return instant.astimezone(tz).date()


def week_start(day: date) -> date:
    return day - timedelta(days=day.weekday())


def week_of(instant: datetime, tz: ZoneInfo) -> date:
    return week_start(local_date(instant, tz))


def week_bounds(start: date, tz: ZoneInfo) -> tuple[datetime, datetime]:
    """UTC instants [start, end) of the company-time week beginning on `start`."""

    def local_midnight(day: date) -> datetime:
        return datetime.combine(day, time.min, tzinfo=tz).astimezone(UTC)

    return local_midnight(start), local_midnight(start + timedelta(days=7))


def last_closed_week(now: datetime, tz: ZoneInfo) -> date:
    return week_of(now, tz) - timedelta(days=7)


def recent_weeks(now: datetime, tz: ZoneInfo, count: int = 13) -> list[date]:
    current = week_of(now, tz)
    return [current - timedelta(weeks=offset) for offset in range(count - 1, -1, -1)]


def quarter_of(day: date) -> str:
    return f"{day.year}-Q{(day.month - 1) // 3 + 1}"


@dataclass(frozen=True)
class CompanyTime:
    now: datetime
    tz: ZoneInfo

    @property
    def today(self) -> date:
        return local_date(self.now, self.tz)

    @property
    def current_week(self) -> date:
        return week_of(self.now, self.tz)

    @property
    def last_closed_week(self) -> date:
        return last_closed_week(self.now, self.tz)

    @property
    def quarter(self) -> str:
        return quarter_of(self.today)
