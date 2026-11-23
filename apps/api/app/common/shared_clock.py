from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.clock import Clock, clock
from app.db.models import AppClock
from app.realtime.hub import hub

CLOCK_CHANGED = {"type": "clock"}


async def load_clock(session: AsyncSession, target: Clock = clock) -> None:
    if not target.ticking:
        return
    row = await session.get(AppClock, 1)
    if row is None or row.app_now != target.start:
        await store_clock(session, target)
        return
    target.set(row.app_now, row.anchor)


async def store_clock(session: AsyncSession, target: Clock = clock) -> None:
    if not target.ticking:
        return
    values = {"id": 1, "app_now": target.start, "anchor": target.anchor}
    await session.execute(
        insert(AppClock).values(values).on_conflict_do_update(index_elements=["id"], set_=values)
    )
    await session.commit()


async def share_clock(session: AsyncSession) -> None:
    await store_clock(session)
    await hub.publish_control(CLOCK_CHANGED)
