from collections import defaultdict
from dataclasses import dataclass
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.enums import RockStatus
from app.db.models import Issue, Milestone, Rock, User
from app.rules.rules import rock_progress, rock_status


@dataclass(frozen=True)
class RockView:
    rock: Rock
    owner: User
    milestones: list[Milestone]
    status: RockStatus
    progress_percent: int
    open_issue_id: str | None


async def list_rocks(
    session: AsyncSession,
    team_id: str,
    today: date,
    quarter: str | None = None,
    rock_id: str | None = None,
) -> list[RockView]:
    query = (
        select(Rock, User, Issue.id)
        .join(User, User.id == Rock.owner_id)
        .outerjoin(Issue, (Issue.source_rock_id == Rock.id) & Issue.solved_at.is_(None))
        .where(Rock.team_id == team_id)
        .order_by(Rock.id)
    )
    if quarter is not None:
        query = query.where(Rock.quarter == quarter)
    if rock_id is not None:
        query = query.where(Rock.id == rock_id)
    rows = (await session.execute(query)).all()

    milestones = await session.scalars(
        select(Milestone)
        .where(Milestone.rock_id.in_([rock.id for rock, _, _ in rows]))
        .order_by(Milestone.due_date, Milestone.id)
    )
    by_rock: dict[str, list[Milestone]] = defaultdict(list)
    for milestone in milestones:
        by_rock[milestone.rock_id].append(milestone)

    return [
        RockView(
            rock=rock,
            owner=owner,
            milestones=by_rock[rock.id],
            status=rock_status(rock, by_rock[rock.id], today),
            progress_percent=rock_progress(rock, by_rock[rock.id]),
            open_issue_id=open_issue_id,
        )
        for rock, owner, open_issue_id in rows
    ]
