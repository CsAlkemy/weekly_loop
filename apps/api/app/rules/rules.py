from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

from app.common.enums import GoalType, MeasurableStatus, RockStatus
from app.common.weeks import week_bounds
from app.db.models import Issue, Measurable, Milestone, Rock, Todo

TODO_TARGET_PERCENT = 90


def ratio_half_up(numerator: int, denominator: int, scale: int) -> int:
    return (2 * numerator * scale + denominator) // (2 * denominator)


def percent(part: int, whole: int) -> int:
    return ratio_half_up(part, whole, 100)


def meets_goal(measurable: Measurable, score: Decimal) -> bool:
    match measurable.goal_type:
        case GoalType.AT_LEAST:
            return score >= measurable.goal_value
        case GoalType.AT_MOST:
            return score <= measurable.goal_value
        case GoalType.EXACTLY:
            return score == measurable.goal_value
        case GoalType.BETWEEN:
            return measurable.goal_min <= score <= measurable.goal_max
    raise ValueError(f"Unknown goal type: {measurable.goal_type}")


def measurable_status(
    measurable: Measurable, score: Decimal | None, week_is_closed: bool
) -> MeasurableStatus:
    if score is None:
        return MeasurableStatus.OFF_TRACK if week_is_closed else MeasurableStatus.PENDING
    return (
        MeasurableStatus.ON_TRACK if meets_goal(measurable, score) else MeasurableStatus.OFF_TRACK
    )


@dataclass(frozen=True)
class TodoCompletion:
    due: int
    done: int
    rate_percent: int
    meets_target: bool


def todo_completion(todos: Iterable[Todo], week: date, tz: ZoneInfo) -> TodoCompletion | None:
    _, week_end = week_bounds(week, tz)
    due = [todo for todo in todos if week <= todo.due_date < week + timedelta(days=7)]
    if not due:
        return None
    done = sum(1 for todo in due if todo.done_at is not None and todo.done_at < week_end)
    return TodoCompletion(
        due=len(due),
        done=done,
        rate_percent=percent(done, len(due)),
        meets_target=done * 100 >= len(due) * TODO_TARGET_PERCENT,
    )


def is_overdue(todo: Todo, today: date) -> bool:
    return todo.done_at is None and todo.due_date < today


def is_past_due(milestone: Milestone, today: date) -> bool:
    return not milestone.done and milestone.due_date < today


def rock_status(rock: Rock, milestones: Sequence[Milestone], today: date) -> RockStatus:
    if rock.status == RockStatus.COMPLETE:
        return RockStatus.COMPLETE
    past_due = any(is_past_due(milestone, today) for milestone in milestones)
    if rock.status == RockStatus.OFF_TRACK or past_due:
        return RockStatus.OFF_TRACK
    return RockStatus.ON_TRACK


def rock_progress(rock: Rock, milestones: Sequence[Milestone]) -> int:
    if not milestones:
        return 100 if rock.status == RockStatus.COMPLETE else 0
    return percent(sum(1 for milestone in milestones if milestone.done), len(milestones))


def issue_order(issues: Iterable[Issue]) -> list[Issue]:
    unsolved = [issue for issue in issues if issue.solved_at is None]
    return sorted(
        unsolved,
        key=lambda issue: (
            issue.priority is None,
            -(issue.priority or 0),
            issue.created_at,
            issue.id,
        ),
    )


def average_rating(ratings: Sequence[int]) -> Decimal | None:
    if not ratings:
        return None
    return Decimal(ratio_half_up(sum(ratings), len(ratings), 10)).scaleb(-1)
