from datetime import UTC, datetime, timedelta

from app.common.clock import Clock
from app.common.shared_clock import load_clock, start_clock, store_clock
from app.config.env import stored_secret
from app.db.models import Meeting

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


async def test_a_restart_starts_at_app_now_when_nothing_happened_later(db):
    restarted = Clock(START, ticking=True)
    await start_clock(db, restarted)
    assert restarted.now() - START < timedelta(seconds=5)


async def test_a_restart_never_counts_the_time_the_app_was_stopped(db):
    days_ago = Clock(START, ticking=True)
    days_ago.advance(3 * 24 * 3600)
    await store_clock(db, days_ago)

    restarted = Clock(START, ticking=True)
    await start_clock(db, restarted)
    assert restarted.now() - START < timedelta(seconds=5)


async def test_a_restart_resumes_from_the_latest_activity(db):
    meeting_start = START + timedelta(minutes=40)
    db.add(
        Meeting(
            id="mt_live",
            team_id="team_lead",
            facilitator_id="u2",
            started_at=meeting_start,
            section="scorecard",
            section_started_at=meeting_start,
        )
    )
    await db.commit()

    restarted = Clock(START, ticking=True)
    await start_clock(db, restarted)
    assert timedelta(0) <= restarted.now() - meeting_start < timedelta(seconds=5)

    restarted.restart()
    assert restarted.now() - START < timedelta(seconds=5)


def test_a_generated_session_secret_is_kept_in_its_file(tmp_path):
    path = tmp_path / "data" / "session-secret"
    first = stored_secret(path)
    assert len(first) >= 32
    assert stored_secret(path) == first
