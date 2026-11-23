from datetime import UTC, date, datetime, timedelta
from zoneinfo import ZoneInfo

from app.common.weeks import (
    last_closed_week,
    local_date,
    quarter_of,
    recent_weeks,
    week_bounds,
    week_of,
)

CHICAGO = ZoneInfo("America/Chicago")
SEED_NOW = datetime(2026, 11, 11, 15, 0, tzinfo=UTC)


def utc(value: str) -> datetime:
    return datetime.fromisoformat(value)


def test_week_is_named_by_its_monday_in_company_time():
    assert week_of(SEED_NOW, CHICAGO) == date(2026, 11, 9)


def test_sunday_2359_chicago_is_still_the_old_week():
    assert week_of(utc("2026-11-09T05:59:00Z"), CHICAGO) == date(2026, 11, 2)


def test_monday_0001_chicago_is_the_new_week():
    assert week_of(utc("2026-11-09T06:01:00Z"), CHICAGO) == date(2026, 11, 9)


def test_week_containing_the_dst_change_ends_an_hour_later_in_utc():
    start, end = week_bounds(date(2026, 10, 26), CHICAGO)
    assert start == utc("2026-10-26T05:00:00Z")
    assert end == utc("2026-11-02T06:00:00Z")
    assert end - start == timedelta(hours=169)
    assert week_of(utc("2026-11-02T05:30:00Z"), CHICAGO) == date(2026, 10, 26)


def test_today_is_the_company_date_not_the_utc_date():
    assert local_date(utc("2026-11-12T03:00:00Z"), CHICAGO) == date(2026, 11, 11)


def test_last_closed_week_is_the_full_week_before_the_current_one():
    assert last_closed_week(SEED_NOW, CHICAGO) == date(2026, 11, 2)


def test_scorecard_window_is_13_weeks_ending_with_the_current_week():
    weeks = recent_weeks(SEED_NOW, CHICAGO)
    assert len(weeks) == 13
    assert weeks[0] == date(2026, 8, 17)
    assert weeks[-1] == date(2026, 11, 9)


def test_quarter_is_the_calendar_quarter():
    assert quarter_of(date(2026, 11, 11)) == "2026-Q4"
    assert quarter_of(date(2026, 9, 30)) == "2026-Q3"
