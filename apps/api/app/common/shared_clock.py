import time
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.clock import Clock, clock
from app.db.models import Activity, AppClock, Issue, Meeting, Todo
from app.realtime.hub import hub

CLOCK_CHANGED = {"type": "clock"}

RECORDED_INSTANTS = (
    Meeting.started_at,
    Meeting.section_started_at,
    Meeting.ended_at,
    Issue.created_at,
    Issue.solved_at,
    Todo.created_at,
    Todo.done_at,
    Activity.at,
)


async def latest_recorded_instant(session: AsyncSession) -> datetime | None:
    instants = [await session.scalar(select(func.max(column))) for column in RECORDED_INSTANTS]
    return max((instant for instant in instants if instant is not None), default=None)


async def start_clock(session: AsyncSession, target: Clock = clock) -> None:
    if not target.ticking:
        return
    latest = await latest_recorded_instant(session)
    start = max(target.initial, latest) if latest else target.initial
    target.set(start, datetime.fromtimestamp(time.time(), UTC))
    await store_clock(session, target)


async def load_clock(session: AsyncSession, target: Clock = clock) -> None:
    if not target.ticking:
        return
    row = await session.get(AppClock, 1)
    if row is not None:
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
