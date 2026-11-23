from typing import Annotated
from zoneinfo import ZoneInfo

from fastapi import Depends

from app.auth.deps import TeamAccess
from app.common.clock import Clock, get_clock
from app.common.weeks import CompanyTime
from app.db.session import SessionDep
from app.teams.service import team_timezone


async def team_time(
    team: TeamAccess, session: SessionDep, clock: Annotated[Clock, Depends(get_clock)]
) -> CompanyTime:
    return CompanyTime(now=clock.now(), tz=ZoneInfo(await team_timezone(session, team)))


TeamTime = Annotated[CompanyTime, Depends(team_time)]
