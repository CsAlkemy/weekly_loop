from datetime import UTC, date, datetime

import pytest
from sqlalchemy.exc import IntegrityError

from app.db.models import Issue, MeetingRating, Score, Todo

NOW = datetime(2026, 11, 11, 15, 0, tzinfo=UTC)


def issue(**overrides) -> Issue:
    values = {
        "id": "i_new",
        "team_id": "team_lead",
        "title": "New deals closed, week of Nov 2",
        "owner_id": "u2",
        "created_at": NOW,
    }
    return Issue(**{**values, **overrides})


async def test_second_unsolved_issue_for_the_same_measurable_week_is_rejected(db):
    db.add(issue(source_measurable_id="m1", source_week_start=date(2026, 11, 2)))
    with pytest.raises(IntegrityError):
        await db.commit()


async def test_new_issue_is_allowed_once_the_earlier_one_is_solved(db):
    db.add(issue(source_measurable_id="m4", source_week_start=date(2026, 10, 26)))
    await db.commit()


async def test_issue_cannot_point_at_another_teams_measurable(db):
    db.add(issue(source_measurable_id="m6", source_week_start=date(2026, 11, 2)))
    with pytest.raises(IntegrityError):
        await db.commit()


async def test_solving_an_issue_requires_a_note(db):
    db.add(issue(solved_at=NOW))
    with pytest.raises(IntegrityError):
        await db.commit()


async def test_an_issue_cannot_have_a_solver_without_being_solved(db):
    db.add(issue(solved_by_id="u2"))
    with pytest.raises(IntegrityError):
        await db.commit()


async def test_a_to_do_cannot_have_a_done_by_without_being_done(db):
    todo = await db.get(Todo, "t12")
    todo.done_by_id = "u2"
    with pytest.raises(IntegrityError):
        await db.commit()


async def test_priority_outside_1_to_5_is_rejected(db):
    db.add(issue(priority=6))
    with pytest.raises(IntegrityError):
        await db.commit()


async def test_score_week_must_start_on_a_monday(db):
    db.add(Score(measurable_id="m1", week_start=date(2026, 11, 10), value=5))
    with pytest.raises(IntegrityError):
        await db.commit()


async def test_rating_outside_1_to_10_is_rejected(db):
    db.add(MeetingRating(meeting_id="mt1", user_id="u4", rating=11))
    with pytest.raises(IntegrityError):
        await db.commit()


async def test_only_attendees_can_rate(db):
    db.add(MeetingRating(meeting_id="mt1", user_id="u6", rating=8))
    with pytest.raises(IntegrityError):
        await db.commit()
