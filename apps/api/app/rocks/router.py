from fastapi import APIRouter

from app.auth.deps import TeamAccess
from app.db.session import SessionDep
from app.rocks import service
from app.rocks.schemas import RockOut, rock_out
from app.teams.deps import TeamTime

router = APIRouter(prefix="/teams/{team_id}/rocks", tags=["rocks"])


@router.get("", response_model=list[RockOut], summary="Current quarter's Rocks with Milestones")
async def list_rocks(team: TeamAccess, time: TeamTime, session: SessionDep):
    views = await service.list_rocks(session, team.id, time.today, quarter=time.quarter)
    return [rock_out(view, time.today) for view in views]
