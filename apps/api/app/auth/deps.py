from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.enums import Role
from app.db.models import Team, User
from app.db.session import SessionDep
from app.teams.service import has_team_access

SESSION_USER_KEY = "user_id"
SESSION_STAMP_KEY = "stamp"


def password_stamp(user: User) -> str:
    return (user.password_hash or "")[-16:]


def start_session(store: dict, user: User) -> None:
    store.clear()
    store[SESSION_USER_KEY] = user.id
    store[SESSION_STAMP_KEY] = password_stamp(user)


async def session_user(store: dict, session: AsyncSession) -> User | None:
    user_id = store.get(SESSION_USER_KEY)
    user = await session.get(User, user_id) if user_id else None
    if user is None or store.get(SESSION_STAMP_KEY) != password_stamp(user):
        return None
    return user


async def current_user(request: Request, session: SessionDep) -> User:
    user = await session_user(request.session, session)
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not signed in")
    return user


CurrentUser = Annotated[User, Depends(current_user)]


async def team_access(team_id: str, user: CurrentUser, session: SessionDep) -> Team:
    if not await has_team_access(session, user, team_id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You do not have access to this team")
    team = await session.get(Team, team_id)
    if team is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Team not found")
    return team


TeamAccess = Annotated[Team, Depends(team_access)]


async def require_writer(user: CurrentUser) -> User:
    if user.role == Role.OBSERVER:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Observers have read-only access")
    return user


Writer = Annotated[User, Depends(require_writer)]


async def require_admin(user: CurrentUser) -> User:
    if user.role != Role.ADMIN:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only Admins can do this")
    return user


Admin = Annotated[User, Depends(require_admin)]
