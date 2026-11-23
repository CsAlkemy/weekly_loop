from fastapi import APIRouter, status

from app.auth.deps import CurrentUser, TeamAccess, Writer
from app.common.weeks import last_closed_week
from app.db.session import SessionDep
from app.meetings import service
from app.meetings.schemas import (
    ActiveMeetingOut,
    MeetingStateOut,
    MeetingSummaryOut,
    RatingIn,
    state_out,
    summary_out,
)
from app.realtime.hub import hub
from app.teams.deps import TeamTime

router = APIRouter(prefix="/teams/{team_id}", tags=["meeting"])


def _out(state: service.MeetingState, time: TeamTime) -> MeetingStateOut:
    return state_out(state, time.now, last_closed_week(state.meeting.started_at, time.tz))


@router.get(
    "/meeting",
    response_model=ActiveMeetingOut,
    summary="The team's meeting in progress, if any, with the server's clock",
)
async def get_meeting(team: TeamAccess, time: TeamTime, session: SessionDep):
    state = await service.get_active(session, team.id)
    return ActiveMeetingOut(
        meeting=_out(state, time) if state else None,
        last_ended_meeting_id=await service.last_ended_meeting_id(session, team.id),
    )


@router.post(
    "/meeting",
    response_model=MeetingStateOut,
    status_code=status.HTTP_201_CREATED,
    summary="Start the Level 10 Meeting and become its facilitator",
)
async def start_meeting(team: TeamAccess, user: Writer, time: TeamTime, session: SessionDep):
    state = await service.start(session, team.id, user, time.now)
    await hub.invalidate(team.id, "meeting")
    return _out(state, time)


@router.post("/meeting/join", response_model=MeetingStateOut, summary="Join the meeting")
async def join_meeting(team: TeamAccess, user: CurrentUser, time: TeamTime, session: SessionDep):
    state = await service.join(session, team.id, user, time.now)
    await hub.invalidate(team.id, "meeting")
    return _out(state, time)


@router.post(
    "/meeting/advance",
    response_model=MeetingStateOut,
    summary="Move to the next agenda section (facilitator only)",
)
async def advance_meeting(team: TeamAccess, user: Writer, time: TeamTime, session: SessionDep):
    state = await service.advance(session, team.id, user, time.now)
    await hub.invalidate(team.id, "meeting")
    return _out(state, time)


@router.put(
    "/meeting/rating",
    response_model=MeetingStateOut,
    summary="Rate the meeting 1 to 10 during Conclude; can be changed until it ends",
)
async def rate_meeting(
    body: RatingIn, team: TeamAccess, user: Writer, time: TeamTime, session: SessionDep
):
    state = await service.rate(session, team.id, user, body.rating)
    await hub.invalidate(team.id, "meeting")
    return _out(state, time)


@router.post(
    "/meeting/end",
    response_model=MeetingSummaryOut,
    summary="End the meeting (facilitator only) and return its summary",
)
async def end_meeting(team: TeamAccess, user: Writer, time: TeamTime, session: SessionDep):
    meeting = await service.end(session, team.id, user, time.now)
    await hub.invalidate(team.id, "meeting")
    return summary_out(await service.summarize(session, meeting, time.tz))


@router.get(
    "/meetings/{meeting_id}/summary",
    response_model=MeetingSummaryOut,
    summary="Summary of an ended meeting",
)
async def get_summary(meeting_id: str, team: TeamAccess, time: TeamTime, session: SessionDep):
    return summary_out(await service.get_summary(session, team.id, meeting_id, time.tz))
