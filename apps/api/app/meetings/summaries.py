from datetime import UTC, datetime
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Company, Meeting, MeetingSummaryRecord, Team
from app.meetings.schemas import MeetingSummaryOut, summary_out
from app.meetings.service import summarize


async def freeze(session: AsyncSession, meeting: Meeting, tz: ZoneInfo) -> MeetingSummaryOut:
    out = summary_out(await summarize(session, meeting, tz))
    await session.execute(
        insert(MeetingSummaryRecord)
        .values(
            meeting_id=meeting.id,
            data=out.model_dump(mode="json", by_alias=True),
            frozen_at=datetime.now(UTC),
        )
        .on_conflict_do_nothing()
    )
    return out


async def read(session: AsyncSession, meeting: Meeting, tz: ZoneInfo) -> MeetingSummaryOut:
    record = await session.get(MeetingSummaryRecord, meeting.id)
    if record is not None:
        return MeetingSummaryOut.model_validate(record.data)
    out = await freeze(session, meeting, tz)
    await session.commit()
    return out


async def freeze_ended_meetings(session: AsyncSession) -> None:
    rows = await session.execute(
        select(Meeting, Company.timezone)
        .join(Team, Team.id == Meeting.team_id)
        .join(Company, Company.id == Team.company_id)
        .outerjoin(MeetingSummaryRecord, MeetingSummaryRecord.meeting_id == Meeting.id)
        .where(Meeting.ended_at.is_not(None), MeetingSummaryRecord.meeting_id.is_(None))
    )
    for meeting, timezone in rows.all():
        await freeze(session, meeting, ZoneInfo(timezone))
