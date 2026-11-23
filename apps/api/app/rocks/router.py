from fastapi import APIRouter, HTTPException, Response, status

from app.activity import service as activity
from app.auth.deps import TeamAccess, Writer
from app.common.enums import RockStatus
from app.common.errors import errors
from app.db.session import SessionDep
from app.issues.schemas import IssueOut, issue_out
from app.issues.service import make_issue_from_rock
from app.realtime.hub import hub
from app.rocks import service
from app.rocks.schemas import RockOut, rock_out
from app.teams.deps import TeamTime

router = APIRouter(
    prefix="/teams/{team_id}/rocks", tags=["rocks"], responses=errors(401, 403, 404, 409)
)


@router.get("", response_model=list[RockOut], summary="Current quarter's Rocks with Milestones")
async def list_rocks(team: TeamAccess, time: TeamTime, session: SessionDep):
    views = await service.list_rocks(session, team.id, time.today, quarter=time.quarter)
    return [rock_out(view, time.today) for view in views]


@router.post(
    "/{rock_id}/issue",
    response_model=IssueOut,
    status_code=status.HTTP_201_CREATED,
    responses={200: {"model": IssueOut, "description": "An unsolved Issue already exists"}},
    summary="Make it an Issue: create one for an off-track Rock, or return the open one",
)
async def make_it_an_issue(
    rock_id: str,
    response: Response,
    team: TeamAccess,
    user: Writer,
    time: TeamTime,
    session: SessionDep,
):
    views = await service.list_rocks(session, team.id, time.today, rock_id=rock_id)
    if not views:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Rock not found")
    if views[0].status != RockStatus.OFF_TRACK:
        raise HTTPException(status.HTTP_409_CONFLICT, "Only an off-track Rock can become an Issue")
    view, created = await make_issue_from_rock(session, team.id, views[0].rock, user.id, time.now)
    if created:
        await activity.record(
            session, team.id, user, "issue.made", f"Made an Issue: {view.issue.title}", time.now
        )
        await hub.invalidate(team.id, "issues")
        await hub.invalidate(team.id, "rocks")
    else:
        response.status_code = status.HTTP_200_OK
    return issue_out(view)
