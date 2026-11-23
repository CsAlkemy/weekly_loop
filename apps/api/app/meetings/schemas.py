from datetime import date, datetime

from pydantic import Field

from app.auth.schemas import UserOut
from app.common.enums import MeasurableStatus, MeetingSection
from app.common.schemas import ApiModel
from app.meetings.agenda import AGENDA
from app.meetings.service import MeetingState, MeetingSummary, PastMeeting


class AgendaItemOut(ApiModel):
    section: MeetingSection
    label: str
    minutes: int


class RatingOut(ApiModel):
    user_id: str
    rating: int


class MeetingStateOut(ApiModel):
    id: str
    facilitator: UserOut
    started_at: datetime
    section: MeetingSection
    section_started_at: datetime
    server_now: datetime
    scorecard_week: date
    agenda: list[AgendaItemOut]
    attendees: list[UserOut]
    ratings: list[RatingOut]
    average_rating: float | None


class ActiveMeetingOut(ApiModel):
    meeting: MeetingStateOut | None
    last_ended_meeting_id: str | None


class RatingIn(ApiModel):
    rating: int = Field(ge=1, le=10)


class SummaryMeasurableOut(ApiModel):
    id: str
    name: str
    unit: str
    value: float | None
    status: MeasurableStatus


class SummaryIssueOut(ApiModel):
    id: str
    title: str
    resolution_note: str | None


class SummaryTodoOut(ApiModel):
    id: str
    title: str
    owner: UserOut
    due_date: date


class MeetingSummaryOut(ApiModel):
    id: str
    facilitator: UserOut
    started_at: datetime
    ended_at: datetime
    scorecard_week: date
    measurables: list[SummaryMeasurableOut]
    issues_solved: list[SummaryIssueOut]
    todos_created: list[SummaryTodoOut]
    attendees: list[UserOut]
    rating: float | None
    ratings_count: int


def state_out(state: MeetingState, now: datetime, scorecard_week: date) -> MeetingStateOut:
    meeting = state.meeting
    return MeetingStateOut(
        id=meeting.id,
        facilitator=state.facilitator,
        started_at=meeting.started_at,
        section=meeting.section,
        section_started_at=meeting.section_started_at,
        server_now=now,
        scorecard_week=scorecard_week,
        agenda=[
            AgendaItemOut(section=section, label=label, minutes=minutes)
            for section, label, minutes in AGENDA
        ],
        attendees=state.attendees,
        ratings=[
            RatingOut(user_id=user_id, rating=rating)
            for user_id, rating in sorted(state.ratings.items())
        ],
        average_rating=state.average_rating,
    )


def summary_out(summary: MeetingSummary) -> MeetingSummaryOut:
    meeting = summary.meeting
    return MeetingSummaryOut(
        id=meeting.id,
        facilitator=summary.facilitator,
        started_at=meeting.started_at,
        ended_at=meeting.ended_at,
        scorecard_week=summary.scorecard_week,
        measurables=[
            SummaryMeasurableOut(
                id=row.measurable.id,
                name=row.measurable.name,
                unit=row.measurable.unit,
                value=row.cells[0].value,
                status=row.cells[0].status,
            )
            for row in summary.measurables
        ],
        issues_solved=[
            SummaryIssueOut(id=issue.id, title=issue.title, resolution_note=issue.resolution_note)
            for issue in summary.issues_solved
        ],
        todos_created=[
            SummaryTodoOut(id=todo.id, title=todo.title, owner=owner, due_date=todo.due_date)
            for todo, owner in summary.todos_created
        ],
        attendees=summary.attendees,
        rating=summary.rating,
        ratings_count=len(summary.ratings),
    )


class PastMeetingOut(ApiModel):
    id: str
    started_at: datetime
    ended_at: datetime
    facilitator: UserOut
    attendees_count: int
    rating: float | None
    ratings_count: int


def past_meeting_out(past: PastMeeting) -> PastMeetingOut:
    return PastMeetingOut(
        id=past.meeting.id,
        started_at=past.meeting.started_at,
        ended_at=past.meeting.ended_at,
        facilitator=past.facilitator,
        attendees_count=past.attendees_count,
        rating=past.rating,
        ratings_count=len(past.ratings),
    )
