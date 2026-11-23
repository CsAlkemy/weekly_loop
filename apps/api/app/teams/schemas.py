from app.auth.schemas import UserOut
from app.common.schemas import ApiModel


class TeamOut(ApiModel):
    id: str
    name: str


class TeamDetailOut(TeamOut):
    timezone: str
    members: list[UserOut]
