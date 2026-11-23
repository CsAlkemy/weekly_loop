from collections.abc import Iterable

from fastapi import HTTPException, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.passwords import hash_password
from app.common.enums import Role
from app.common.ids import new_id
from app.db.models import Issue, Measurable, Membership, Rock, Team, Todo, User
from app.users.schemas import UserCreateIn, UserDetailOut, UserUpdateIn


async def team_ids_by_user(session: AsyncSession) -> dict[str, list[str]]:
    rows = await session.execute(
        select(Membership.user_id, Membership.team_id).order_by(Membership.team_id)
    )
    teams: dict[str, list[str]] = {}
    for user_id, team_id in rows:
        teams.setdefault(user_id, []).append(team_id)
    return teams


def detail(user: User, team_ids: Iterable[str]) -> UserDetailOut:
    return UserDetailOut(
        id=user.id, name=user.name, email=user.email, role=user.role, team_ids=sorted(team_ids)
    )


async def list_users(session: AsyncSession, company_id: str) -> list[UserDetailOut]:
    users = await session.scalars(
        select(User).where(User.company_id == company_id).order_by(User.name)
    )
    teams = await team_ids_by_user(session)
    return [detail(user, teams.get(user.id, [])) for user in users]


async def check_teams(session: AsyncSession, company_id: str, team_ids: list[str]) -> set[str]:
    wanted = set(team_ids)
    found = set(
        await session.scalars(
            select(Team.id).where(Team.company_id == company_id, Team.id.in_(wanted))
        )
    )
    if missing := sorted(wanted - found):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, f"Unknown team: {missing[0]}")
    return wanted


async def check_email_free(session: AsyncSession, email: str, user_id: str | None = None) -> None:
    query = select(User.id).where(func.lower(User.email) == email)
    if user_id:
        query = query.where(User.id != user_id)
    if await session.scalar(query):
        raise HTTPException(status.HTTP_409_CONFLICT, "A user with this email already exists")


async def open_items(session: AsyncSession, user_id: str, team_ids: set[str] | None = None) -> int:
    queries = [
        select(func.count()).select_from(Measurable).where(Measurable.owner_id == user_id),
        select(func.count()).select_from(Rock).where(Rock.owner_id == user_id),
        select(func.count())
        .select_from(Issue)
        .where(Issue.owner_id == user_id, Issue.solved_at.is_(None)),
        select(func.count())
        .select_from(Todo)
        .where(Todo.owner_id == user_id, Todo.done_at.is_(None)),
    ]
    models = [Measurable, Rock, Issue, Todo]
    if team_ids is not None:
        queries = [
            query.where(model.team_id.in_(team_ids))
            for query, model in zip(queries, models, strict=True)
        ]
    return sum([await session.scalar(query) or 0 for query in queries])


async def save(session: AsyncSession) -> None:
    try:
        await session.commit()
    except IntegrityError as error:
        await session.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT, "A user with this email already exists"
        ) from error


async def create_user(session: AsyncSession, company_id: str, body: UserCreateIn) -> UserDetailOut:
    await check_email_free(session, body.email)
    team_ids = await check_teams(session, company_id, body.team_ids)

    user = User(
        id=new_id("user"),
        company_id=company_id,
        name=body.name,
        email=body.email,
        role=body.role,
        password_hash=await run_in_threadpool(hash_password, body.password),
    )
    session.add(user)
    await session.flush()
    session.add_all(Membership(user_id=user.id, team_id=team_id) for team_id in team_ids)
    await save(session)
    return detail(user, team_ids)


async def update_user(
    session: AsyncSession, admin: User, user_id: str, body: UserUpdateIn
) -> UserDetailOut:
    user = await session.get(User, user_id)
    if user is None or user.company_id != admin.company_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    current = set((await team_ids_by_user(session)).get(user.id, []))
    team_ids = (
        current
        if body.team_ids is None
        else await check_teams(session, admin.company_id, body.team_ids)
    )

    if body.role is not None and body.role != user.role:
        if user.id == admin.id:
            raise HTTPException(status.HTTP_409_CONFLICT, "You cannot change your own role")
        if body.role == Role.OBSERVER and (count := await open_items(session, user.id)):
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                f"{user.name} owns {count} open items. Reassign them before making "
                f"{user.name} an Observer.",
            )
        user.role = body.role

    if removed := current - team_ids:
        if count := await open_items(session, user.id, removed):
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                f"{user.name} owns {count} open items in a team you are removing. "
                "Reassign them first.",
            )
        await session.execute(
            delete(Membership).where(Membership.user_id == user.id, Membership.team_id.in_(removed))
        )
    session.add_all(Membership(user_id=user.id, team_id=team_id) for team_id in team_ids - current)

    if body.email is not None and body.email != user.email:
        await check_email_free(session, body.email, user.id)
        user.email = body.email
    if body.name is not None:
        user.name = body.name
    if body.password is not None:
        user.password_hash = await run_in_threadpool(hash_password, body.password)

    await save(session)
    return detail(user, team_ids)
