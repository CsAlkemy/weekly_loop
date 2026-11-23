from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.enums import Role
from app.db.models import Company, Membership, Team, User


async def has_team_access(session: AsyncSession, user: User, team_id: str) -> bool:
    if user.role == Role.ADMIN:
        team = await session.get(Team, team_id)
        return team is None or team.company_id == user.company_id
    return await session.get(Membership, (user.id, team_id)) is not None


async def list_accessible_teams(session: AsyncSession, user: User) -> Sequence[Team]:
    query = select(Team).where(Team.company_id == user.company_id).order_by(Team.name)
    if user.role != Role.ADMIN:
        query = query.join(Membership, Membership.team_id == Team.id).where(
            Membership.user_id == user.id
        )
    return (await session.scalars(query)).all()


async def list_members(session: AsyncSession, team_id: str) -> Sequence[User]:
    query = (
        select(User)
        .join(Membership, Membership.user_id == User.id)
        .where(Membership.team_id == team_id)
        .order_by(User.name)
    )
    return (await session.scalars(query)).all()


async def team_timezone(session: AsyncSession, team: Team) -> str:
    company = await session.get_one(Company, team.company_id)
    return company.timezone


async def company_team_ids(session: AsyncSession, company_id: str) -> list[str]:
    return list(await session.scalars(select(Team.id).where(Team.company_id == company_id)))
