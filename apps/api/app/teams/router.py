from fastapi import APIRouter

from app.auth.deps import CurrentUser, TeamAccess
from app.db.session import SessionDep
from app.teams import service
from app.teams.schemas import TeamDetailOut, TeamOut

router = APIRouter(prefix="/teams", tags=["teams"])


@router.get("", response_model=list[TeamOut], summary="Teams the current user can open")
async def list_teams(user: CurrentUser, session: SessionDep):
    return await service.list_accessible_teams(session, user)


@router.get("/{team_id}", response_model=TeamDetailOut)
async def get_team(team: TeamAccess, session: SessionDep):
    return TeamDetailOut(
        id=team.id,
        name=team.name,
        timezone=await service.team_timezone(session, team),
        members=await service.list_members(session, team.id),
    )
