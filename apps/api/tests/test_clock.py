from datetime import UTC, datetime, timedelta

from app.common.clock import Clock
from app.common.shared_clock import load_clock, store_clock
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


async def test_a_second_api_process_reads_the_same_ticking_clock(db):
    first = Clock(START, ticking=True)
    first.advance(600)
    await store_clock(db, first)

    second = Clock(START, ticking=True)
    await load_clock(db, second)
    assert abs((second.now() - first.now()).total_seconds()) < 1
    assert second.now() - START >= timedelta(minutes=10)


async def test_a_new_app_now_starts_the_shared_clock_again(db):
    old = Clock(START - timedelta(days=7), ticking=True)
    old.advance(3600)
    await store_clock(db, old)

    fresh = Clock(START, ticking=True)
    await load_clock(db, fresh)
    assert fresh.now() - START < timedelta(seconds=5)


def test_a_generated_session_secret_is_kept_in_its_file(tmp_path):
    path = tmp_path / "data" / "session-secret"
    first = stored_secret(path)
    assert len(first) >= 32
    assert stored_secret(path) == first
