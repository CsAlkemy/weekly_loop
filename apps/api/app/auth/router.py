import json

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import func, select

from app.auth.deps import CurrentUser, start_session
from app.auth.passwords import verify_password
from app.auth.schemas import DemoAccountsOut, LoginIn, UserOut
from app.common.errors import errors
from app.config.env import settings
from app.db.models import User
from app.db.session import SessionDep

router = APIRouter(prefix="/auth", tags=["auth"], responses=errors(401, 404))


@router.get(
    "/demo-accounts",
    response_model=DemoAccountsOut,
    summary="Seeded users and their shared password, for one-click demo sign-in",
)
async def demo_accounts(session: SessionDep):
    if not settings.demo_accounts:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Demo accounts are turned off")
    seeded = [user["id"] for user in json.loads(settings.seed_path.read_text())["users"]]
    users = await session.scalars(select(User).where(User.id.in_(seeded)).order_by(User.name))
    return {"users": users.all(), "password": settings.seed_password}


@router.post("/login", response_model=UserOut, summary="Sign in with email and password")
async def login(body: LoginIn, request: Request, session: SessionDep):
    email = body.email.strip().lower()
    user = await session.scalar(select(User).where(func.lower(User.email) == email))
    stored = user.password_hash if user else None
    if not await run_in_threadpool(verify_password, body.password, stored) or user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")
    start_session(request.session, user)
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(request: Request) -> None:
    request.session.clear()


@router.get("/me", response_model=UserOut)
async def me(user: CurrentUser):
    return user
