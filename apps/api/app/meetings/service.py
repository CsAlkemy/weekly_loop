from dataclasses import dataclass
from datetime import date, datetime, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.enums import MeetingSection
from app.common.ids import new_id
from app.common.weeks import last_closed_week
from app.db.models import Issue, Meeting, MeetingAttendee, MeetingRating, Todo, User
from app.meetings.agenda import next_section
from app.rules.rules import average_rating
from app.scorecard.service import MeasurableRow, list_scorecard


@dataclass(frozen=True)
class MeetingState:
    meeting: Meeting
    facilitator: User
    attendees: list[User]
    ratings: dict[str, int]

    @property
    def average_rating(self) -> Decimal | None:
        return average_rating(list(self.ratings.values()))


@dataclass(frozen=True)
class MeetingSummary:
    meeting: Meeting
    facilitator: User
    scorecard_week: date
    measurables: list[MeasurableRow]
    issues_solved: list[Issue]
    todos_created: list[tuple[Todo, User]]
    attendees: list[User]
    ratings: dict[str, int]

    @property
    def rating(self) -> Decimal | None:
        return average_rating(list(self.ratings.values()))


async def _attendees(session: AsyncSession, meeting_id: str) -> list[User]:
    users = await session.scalars(
        select(User)
        .join(MeetingAttendee, MeetingAttendee.user_id == User.id)
        .where(MeetingAttendee.meeting_id == meeting_id)
        .order_by(User.name)
    )
    return list(users)


async def _ratings(session: AsyncSession, meeting_id: str) -> dict[str, int]:
    rows = await session.execute(
        select(MeetingRating.user_id, MeetingRating.rating).where(
            MeetingRating.meeting_id == meeting_id
        )
    )
    return dict(rows.all())


async def _state(session: AsyncSession, meeting: Meeting) -> MeetingState:
    return MeetingState(
        meeting=meeting,
        facilitator=await session.get_one(User, meeting.facilitator_id),
        attendees=await _attendees(session, meeting.id),
        ratings=await _ratings(session, meeting.id),
    )


def _active(team_id: str):
    return select(Meeting).where(Meeting.team_id == team_id, Meeting.ended_at.is_(None))


async def get_active(session: AsyncSession, team_id: str) -> MeetingState | None:
    meeting = await session.scalar(_active(team_id))
    return await _state(session, meeting) if meeting else None


async def last_ended_meeting_id(session: AsyncSession, team_id: str) -> str | None:
    return await session.scalar(
        select(Meeting.id)
        .where(Meeting.team_id == team_id, Meeting.ended_at.is_not(None))
        .order_by(Meeting.ended_at.desc())
        .limit(1)
    )


async def _locked_active(session: AsyncSession, team_id: str) -> Meeting:
    meeting = await session.scalar(_active(team_id).with_for_update())
    if meeting is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No meeting is in progress")
    return meeting


def _require_facilitator(meeting: Meeting, user: User) -> None:
    if meeting.facilitator_id != user.id:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Only the facilitator can advance or end the meeting"
        )


async def _add_attendee(session: AsyncSession, meeting_id: str, user: User, now: datetime) -> None:
    await session.execute(
        insert(MeetingAttendee)
        .values(meeting_id=meeting_id, user_id=user.id, joined_at=now)
        .on_conflict_do_nothing()
    )


async def start(session: AsyncSession, team_id: str, user: User, now: datetime) -> MeetingState:
    meeting = Meeting(
        id=new_id("mt"),
        team_id=team_id,
        facilitator_id=user.id,
        started_at=now,
        section=MeetingSection.SCORECARD,
        section_started_at=now,
    )
    session.add(meeting)
    try:
        await session.flush()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT, "This team already has a meeting in progress"
        ) from None
    await _add_attendee(session, meeting.id, user, now)
    await session.commit()
    return await _state(session, meeting)


async def join(session: AsyncSession, team_id: str, user: User, now: datetime) -> MeetingState:
    meeting = await _locked_active(session, team_id)
    await _add_attendee(session, meeting.id, user, now)
    await session.commit()
    return await _state(session, meeting)


async def advance(session: AsyncSession, team_id: str, user: User, now: datetime) -> MeetingState:
    meeting = await _locked_active(session, team_id)
    _require_facilitator(meeting, user)
    upcoming = next_section(MeetingSection(meeting.section))
    if upcoming is None:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Conclude is the last section; end the meeting instead"
        )
    meeting.section = upcoming
    meeting.section_started_at = now
    await session.commit()
    return await _state(session, meeting)


async def rate(session: AsyncSession, team_id: str, user: User, rating: int) -> MeetingState:
    meeting = await _locked_active(session, team_id)
    if meeting.section != MeetingSection.CONCLUDE:
        raise HTTPException(status.HTTP_409_CONFLICT, "Ratings open in the Conclude section")
    if await session.get(MeetingAttendee, (meeting.id, user.id)) is None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Join the meeting before rating it")
    await session.execute(
        insert(MeetingRating)
        .values(meeting_id=meeting.id, user_id=user.id, rating=rating)
        .on_conflict_do_update(
            index_elements=[MeetingRating.meeting_id, MeetingRating.user_id],
            set_={"rating": rating},
        )
    )
    await session.commit()
    return await _state(session, meeting)


async def end(session: AsyncSession, team_id: str, user: User, now: datetime) -> Meeting:
    meeting = await _locked_active(session, team_id)
    _require_facilitator(meeting, user)
    meeting.ended_at = max(now, meeting.started_at)
    meeting.section = None
    meeting.section_started_at = None
    await session.commit()
    return meeting


async def summarize(session: AsyncSession, meeting: Meeting, tz: ZoneInfo) -> MeetingSummary:
    scorecard_week = last_closed_week(meeting.started_at, tz)
    during = (meeting.started_at, meeting.ended_at)

    issues_solved = await session.scalars(
        select(Issue)
        .where(Issue.team_id == meeting.team_id, Issue.solved_at.between(*during))
        .order_by(Issue.solved_at, Issue.id)
    )
    todos_created = await session.execute(
        select(Todo, User)
        .join(User, User.id == Todo.owner_id)
        .where(Todo.team_id == meeting.team_id, Todo.created_at.between(*during))
        .order_by(Todo.created_at, Todo.id)
    )

    return MeetingSummary(
        meeting=meeting,
        facilitator=await session.get_one(User, meeting.facilitator_id),
        scorecard_week=scorecard_week,
        measurables=await list_scorecard(
            session, meeting.team_id, [scorecard_week], scorecard_week + timedelta(days=7)
        ),
        issues_solved=list(issues_solved),
        todos_created=[(todo, owner) for todo, owner in todos_created],
        attendees=await _attendees(session, meeting.id),
        ratings=await _ratings(session, meeting.id),
    )


async def get_summary(
    session: AsyncSession, team_id: str, meeting_id: str, tz: ZoneInfo
) -> MeetingSummary:
    meeting = await session.scalar(
        select(Meeting).where(
            Meeting.id == meeting_id, Meeting.team_id == team_id, Meeting.ended_at.is_not(None)
        )
    )
    if meeting is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No ended meeting with that id")
    return await summarize(session, meeting, tz)
