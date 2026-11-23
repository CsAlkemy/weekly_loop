from dataclasses import dataclass
from datetime import date
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.enums import GoalType, MeasurableStatus
from app.common.errors import changed_by_someone_else
from app.common.ids import new_id
from app.db.models import Issue, Measurable, Score, User
from app.issues.service import require_eligible_owner
from app.rules.rules import measurable_status
from app.scorecard.schemas import MeasurableCreateIn


@dataclass(frozen=True)
class ScoreCell:
    week_start: date
    value: Decimal | None
    status: MeasurableStatus
    issue_id: str | None = None


@dataclass(frozen=True)
class MeasurableRow:
    measurable: Measurable
    owner: User
    cells: list[ScoreCell]


def _cell(
    measurable: Measurable,
    week: date,
    value: Decimal | None,
    current_week: date,
    issue_id: str | None = None,
) -> ScoreCell:
    not_tracked = measurable.tracked_from is not None and week < measurable.tracked_from
    closed = week < current_week and not not_tracked
    status = measurable_status(measurable, value, week_is_closed=closed)
    return ScoreCell(week_start=week, value=value, status=status, issue_id=issue_id)


async def _open_issue_ids(
    session: AsyncSession, measurable_ids: list[str], weeks: list[date]
) -> dict[tuple[str, date], str]:
    rows = await session.execute(
        select(Issue.source_measurable_id, Issue.source_week_start, Issue.id).where(
            Issue.source_measurable_id.in_(measurable_ids),
            Issue.source_week_start.in_(weeks),
            Issue.solved_at.is_(None),
        )
    )
    return {(measurable_id, week): issue_id for measurable_id, week, issue_id in rows}


async def list_scorecard(
    session: AsyncSession, team_id: str, weeks: list[date], current_week: date
) -> list[MeasurableRow]:
    rows = (
        await session.execute(
            select(Measurable, User)
            .join(User, User.id == Measurable.owner_id)
            .where(Measurable.team_id == team_id)
            .order_by(Measurable.id)
        )
    ).all()
    scores = await session.scalars(
        select(Score).where(
            Score.measurable_id.in_([measurable.id for measurable, _ in rows]),
            Score.week_start.in_(weeks),
        )
    )
    values = {(score.measurable_id, score.week_start): score.value for score in scores}
    issue_ids = await _open_issue_ids(session, [measurable.id for measurable, _ in rows], weeks)

    return [
        MeasurableRow(
            measurable=measurable,
            owner=owner,
            cells=[
                _cell(
                    measurable,
                    week,
                    values.get((measurable.id, week)),
                    current_week,
                    issue_ids.get((measurable.id, week)),
                )
                for week in weeks
            ],
        )
        for measurable, owner in rows
    ]


async def set_score(
    session: AsyncSession,
    team_id: str,
    measurable_id: str,
    week_start: date,
    value: Decimal | None,
    expected: Decimal | None,
    current_week: date,
) -> ScoreCell | None:
    measurable = await session.scalar(
        select(Measurable)
        .where(Measurable.id == measurable_id, Measurable.team_id == team_id)
        .with_for_update()
    )
    if measurable is None:
        return None
    current = await session.scalar(
        select(Score.value).where(
            Score.measurable_id == measurable_id, Score.week_start == week_start
        )
    )
    if current != expected:
        await session.rollback()
        raise changed_by_someone_else("this score", current)

    if value is None:
        await session.execute(
            delete(Score).where(
                Score.measurable_id == measurable_id, Score.week_start == week_start
            )
        )
    else:
        await session.execute(
            insert(Score)
            .values(measurable_id=measurable_id, week_start=week_start, value=value)
            .on_conflict_do_update(
                index_elements=[Score.measurable_id, Score.week_start], set_={"value": value}
            )
        )
    await session.commit()
    issue_ids = await _open_issue_ids(session, [measurable_id], [week_start])
    return _cell(
        measurable, week_start, value, current_week, issue_ids.get((measurable_id, week_start))
    )


async def get_cell(
    session: AsyncSession, team_id: str, measurable_id: str, week_start: date, current_week: date
) -> tuple[Measurable, ScoreCell] | None:
    measurable = await session.scalar(
        select(Measurable).where(Measurable.id == measurable_id, Measurable.team_id == team_id)
    )
    if measurable is None:
        return None
    value = await session.scalar(
        select(Score.value).where(
            Score.measurable_id == measurable_id, Score.week_start == week_start
        )
    )
    return measurable, _cell(measurable, week_start, value, current_week)


async def create_measurable(
    session: AsyncSession,
    team_id: str,
    body: MeasurableCreateIn,
    weeks: list[date],
    current_week: date,
) -> MeasurableRow:
    await require_eligible_owner(session, team_id, body.owner_id)
    taken = await session.scalar(
        select(Measurable.id).where(
            Measurable.team_id == team_id, func.lower(Measurable.name) == body.name.lower()
        )
    )
    if taken:
        raise HTTPException(
            status.HTTP_409_CONFLICT, f"This team already has a Measurable called {body.name}"
        )

    between = body.goal.type == GoalType.BETWEEN
    measurable = Measurable(
        id=new_id("msr"),
        team_id=team_id,
        name=body.name,
        owner_id=body.owner_id,
        unit=body.unit,
        goal_type=body.goal.type,
        goal_value=None if between else body.goal.value,
        goal_min=body.goal.min if between else None,
        goal_max=body.goal.max if between else None,
        tracked_from=current_week,
    )
    session.add(measurable)
    await session.commit()
    owner = await session.get_one(User, body.owner_id)
    return MeasurableRow(
        measurable=measurable,
        owner=owner,
        cells=[_cell(measurable, week, None, current_week) for week in weeks],
    )
