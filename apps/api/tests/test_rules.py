from datetime import date, datetime
from decimal import Decimal
from zoneinfo import ZoneInfo

import pytest

from app.common.enums import GoalType, MeasurableStatus, RockStatus
from app.db.models import Issue, Measurable, Milestone, Rock, Todo
from app.rules.rules import (
    average_rating,
    is_overdue,
    issue_order,
    measurable_status,
    percent,
    rock_progress,
    rock_status,
    todo_completion,
)

CHICAGO = ZoneInfo("America/Chicago")
TODAY = date(2026, 11, 11)
WEEK = date(2026, 11, 2)

ON, OFF, PENDING = MeasurableStatus.ON_TRACK, MeasurableStatus.OFF_TRACK, MeasurableStatus.PENDING

AT_LEAST_10 = Measurable(goal_type=GoalType.AT_LEAST, goal_value=Decimal("10"))
AT_MOST_3 = Measurable(goal_type=GoalType.AT_MOST, goal_value=Decimal("3.0"))
EXACTLY_1 = Measurable(goal_type=GoalType.EXACTLY, goal_value=Decimal("1"))
BETWEEN_2_AND_4 = Measurable(
    goal_type=GoalType.BETWEEN, goal_min=Decimal("2"), goal_max=Decimal("4")
)


def utc(value: str) -> datetime:
    return datetime.fromisoformat(value)


def todo(due: str, done_at: str | None = None) -> Todo:
    return Todo(due_date=date.fromisoformat(due), done_at=utc(done_at) if done_at else None)


def milestone(due: str, done: bool) -> Milestone:
    return Milestone(due_date=date.fromisoformat(due), done=done)


def issue(id: str, priority: int | None, created_at: str, solved_at: str | None = None) -> Issue:
    return Issue(
        id=id,
        priority=priority,
        created_at=utc(created_at),
        solved_at=utc(solved_at) if solved_at else None,
    )


@pytest.mark.parametrize(
    ("measurable", "score", "expected"),
    [
        (AT_LEAST_10, "10", ON),
        (AT_LEAST_10, "9", OFF),
        (AT_LEAST_10, "9.99", OFF),
        (AT_MOST_3, "3.0", ON),
        (AT_MOST_3, "3.1", OFF),
        (EXACTLY_1, "1", ON),
        (EXACTLY_1, "0", OFF),
        (EXACTLY_1, "2", OFF),
        (BETWEEN_2_AND_4, "2", ON),
        (BETWEEN_2_AND_4, "4", ON),
        (BETWEEN_2_AND_4, "1.8", OFF),
        (BETWEEN_2_AND_4, "4.5", OFF),
    ],
)
def test_measurable_status_goal_boundaries_are_on_track(measurable, score, expected):
    assert measurable_status(measurable, Decimal(score), week_is_closed=True) == expected


def test_closed_week_without_a_score_is_off_track():
    assert measurable_status(AT_LEAST_10, None, week_is_closed=True) == OFF


def test_current_week_without_a_score_is_pending():
    assert measurable_status(AT_LEAST_10, None, week_is_closed=False) == PENDING


def test_current_week_with_a_score_is_judged_against_the_goal():
    assert measurable_status(AT_LEAST_10, Decimal("12"), week_is_closed=False) == ON
    assert measurable_status(AT_LEAST_10, Decimal("8"), week_is_closed=False) == OFF


@pytest.mark.parametrize(
    ("part", "whole", "expected"),
    [(1, 8, 13), (1, 3, 33), (2, 3, 67), (0, 5, 0), (5, 5, 100), (1, 200, 1), (1, 201, 0)],
)
def test_percent_rounds_half_up(part, whole, expected):
    assert percent(part, whole) == expected


def test_todo_completion_at_exactly_90_percent_meets_target():
    todos = [todo("2026-11-03", "2026-11-03T17:00:00Z")] * 9 + [todo("2026-11-04")]
    result = todo_completion(todos, WEEK, CHICAGO)
    assert (result.due, result.done, result.rate_percent, result.meets_target) == (10, 9, 90, True)


def test_todo_target_uses_the_exact_ratio_not_the_rounded_percent():
    todos = [todo("2026-11-03", "2026-11-03T17:00:00Z")] * 43 + [todo("2026-11-04")] * 5
    result = todo_completion(todos, WEEK, CHICAGO)
    assert result.rate_percent == 90
    assert result.meets_target is False


def test_todo_done_sunday_2359_chicago_counts_for_its_week():
    result = todo_completion([todo("2026-11-06", "2026-11-09T05:59:00Z")], WEEK, CHICAGO)
    assert result.done == 1


def test_todo_done_monday_0001_chicago_is_after_its_due_week():
    result = todo_completion([todo("2026-11-08", "2026-11-09T06:01:00Z")], WEEK, CHICAGO)
    assert (result.due, result.done, result.rate_percent) == (1, 0, 0)


def test_todo_done_in_the_extra_hour_of_the_dst_week_counts():
    result = todo_completion(
        [todo("2026-10-30", "2026-11-02T05:30:00Z")], date(2026, 10, 26), CHICAGO
    )
    assert result.done == 1


def test_todo_done_before_its_due_week_counts():
    result = todo_completion([todo("2026-11-03", "2026-10-30T17:00:00Z")], WEEK, CHICAGO)
    assert result.done == 1


def test_todo_completion_only_counts_todos_due_that_week():
    todos = [todo("2026-11-01"), todo("2026-11-02"), todo("2026-11-08"), todo("2026-11-09")]
    assert todo_completion(todos, WEEK, CHICAGO).due == 2


def test_week_with_nothing_due_has_no_rate():
    assert todo_completion([todo("2026-10-27")], WEEK, CHICAGO) is None


def test_todo_due_today_is_not_overdue():
    assert is_overdue(todo("2026-11-11"), TODAY) is False


def test_todo_due_yesterday_is_overdue():
    assert is_overdue(todo("2026-11-10"), TODAY) is True


def test_done_todo_is_never_overdue():
    assert is_overdue(todo("2026-11-01", "2026-11-09T15:00:00Z"), TODAY) is False


def test_rock_seeded_complete_stays_complete_even_with_a_past_due_milestone():
    rock = Rock(status=RockStatus.COMPLETE)
    assert rock_status(rock, [milestone("2026-11-01", False)], TODAY) == RockStatus.COMPLETE


def test_rock_seeded_off_track_stays_off_track():
    assert rock_status(Rock(status=RockStatus.OFF_TRACK), [], TODAY) == RockStatus.OFF_TRACK


def test_rock_with_unfinished_milestone_past_due_is_off_track():
    rock = Rock(status=RockStatus.ON_TRACK)
    assert rock_status(rock, [milestone("2026-11-10", False)], TODAY) == RockStatus.OFF_TRACK


def test_milestone_due_today_is_not_past_due():
    rock = Rock(status=RockStatus.ON_TRACK)
    assert rock_status(rock, [milestone("2026-11-11", False)], TODAY) == RockStatus.ON_TRACK


def test_finished_milestone_in_the_past_keeps_the_rock_on_track():
    rock = Rock(status=RockStatus.ON_TRACK)
    assert rock_status(rock, [milestone("2026-10-15", True)], TODAY) == RockStatus.ON_TRACK


def test_rock_without_milestones_uses_its_seeded_status():
    assert rock_status(Rock(status=RockStatus.ON_TRACK), [], TODAY) == RockStatus.ON_TRACK


def test_rock_progress_is_done_milestones_over_total_rounded_half_up():
    rock = Rock(status=RockStatus.ON_TRACK)
    one_of_eight = [milestone("2026-10-10", True)] + [milestone("2026-12-01", False)] * 7
    assert rock_progress(rock, one_of_eight) == 13


def test_rock_progress_without_milestones_is_0_or_100_once_complete():
    assert rock_progress(Rock(status=RockStatus.ON_TRACK), []) == 0
    assert rock_progress(Rock(status=RockStatus.OFF_TRACK), []) == 0
    assert rock_progress(Rock(status=RockStatus.COMPLETE), []) == 100


def test_issue_order_is_priority_high_to_low_then_oldest_first_with_no_priority_last():
    issues = [
        issue("none", None, "2026-09-01T15:00:00Z"),
        issue("p3", 3, "2026-10-05T15:00:00Z"),
        issue("p5-newer", 5, "2026-10-20T14:00:00Z"),
        issue("p1", 1, "2026-08-01T15:00:00Z"),
        issue("p5-older", 5, "2026-10-14T16:00:00Z"),
        issue("solved", 5, "2026-10-01T15:00:00Z", solved_at="2026-10-02T15:00:00Z"),
    ]
    assert [item.id for item in issue_order(issues)] == ["p5-older", "p5-newer", "p3", "p1", "none"]


@pytest.mark.parametrize(
    ("ratings", "expected"),
    [
        ([8, 9, 8, 8], "8.3"),
        ([8, 9, 7], "8.0"),
        ([10], "10.0"),
        ([7, 8], "7.5"),
        ([1, 1, 2], "1.3"),
    ],
)
def test_meeting_rating_is_the_average_to_one_decimal_rounded_half_up(ratings, expected):
    assert str(average_rating(ratings)) == expected


def test_meeting_with_no_ratings_has_no_score():
    assert average_rating([]) is None
