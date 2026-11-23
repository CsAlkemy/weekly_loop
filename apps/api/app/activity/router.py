from datetime import datetime

from fastapi import APIRouter

from app.activity import service
from app.auth.deps import TeamAccess
from app.auth.schemas import UserOut
from app.common.errors import errors
from app.common.schemas import ApiModel
from app.db.session import SessionDep

router = APIRouter(
    prefix="/teams/{team_id}/activity", tags=["activity"], responses=errors(401, 403, 404)
)


class ActivityOut(ApiModel):
    id: int
    actor: UserOut
    action: str
    summary: str
    at: datetime


@router.get("", response_model=list[ActivityOut], summary="The team's latest changes, newest first")
async def list_activity(team: TeamAccess, session: SessionDep):
    return [
        ActivityOut(
            id=activity.id,
            actor=actor,
            action=activity.action,
            summary=activity.summary,
            at=activity.at,
        )
        for activity, actor in await service.recent(session, team.id)
    ]
