from datetime import UTC, datetime, timedelta

from app.common.clock import Clock
from app.config.env import stored_secret

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


def test_a_restarted_ticking_clock_resumes_from_the_latest_recorded_instant():
    later = START + timedelta(minutes=30)
    clock = Clock(START, ticking=True)
    clock.resume_from(later)
    assert clock.now() >= later

    clock.resume_from(START)
    assert clock.now() >= later

    clock.restart()
    assert clock.now() - START < timedelta(seconds=5)


def test_a_frozen_clock_does_not_resume():
    clock = Clock(START, ticking=False)
    clock.resume_from(START + timedelta(hours=1))
    assert clock.now() == START


def test_a_generated_session_secret_is_kept_in_its_file(tmp_path):
    path = tmp_path / "data" / "session-secret"
    first = stored_secret(path)
    assert len(first) >= 32
    assert stored_secret(path) == first
