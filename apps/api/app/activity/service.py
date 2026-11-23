from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Activity, User

RECENT = 30


async def record(
    session: AsyncSession, team_id: str, actor: User, action: str, summary: str, at: datetime
) -> None:
    session.add(Activity(team_id=team_id, actor_id=actor.id, action=action, summary=summary, at=at))
    await session.commit()


async def recent(session: AsyncSession, team_id: str) -> list[tuple[Activity, User]]:
    rows = await session.execute(
        select(Activity, User)
        .join(User, User.id == Activity.actor_id)
        .where(Activity.team_id == team_id)
        .order_by(Activity.at.desc(), Activity.id.desc())
        .limit(RECENT)
    )
    return [(activity, user) for activity, user in rows.all()]
