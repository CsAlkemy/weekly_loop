from datetime import UTC, datetime, timedelta

from app.common.clock import Clock

START = datetime(2026, 11, 11, 15, 0, tzinfo=UTC)


def test_frozen_clock_stays_at_app_now():
    clock = Clock(START, ticking=False)
    assert clock.now() == START
    assert clock.now() == START


def test_ticking_clock_starts_at_app_now_and_moves_forward():
    clock = Clock(START, ticking=True)
    first = clock.now()
    assert first >= START
    assert clock.now() >= first


def test_clock_can_be_advanced_and_restarted():
    clock = Clock(START, ticking=True)
    clock.advance(600)
    assert clock.now() - START >= timedelta(minutes=10)

    clock.restart()
    assert clock.now() - START < timedelta(seconds=5)
