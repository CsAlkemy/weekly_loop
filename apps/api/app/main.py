from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from sqlalchemy import func, select
from starlette.middleware.sessions import SessionMiddleware

from app.auth.router import router as auth_router
from app.common.clock import clock
from app.company_settings.router import router as company_settings_router
from app.config.env import settings
from app.db.models import Issue, Meeting, Todo
from app.db.session import SessionLocal
from app.issues.router import router as issues_router
from app.meetings.router import router as meetings_router
from app.realtime.router import router as realtime_router
from app.rocks.router import router as rocks_router
from app.scorecard.router import router as scorecard_router
from app.teams.router import router as teams_router
from app.todos.router import router as todos_router
from app.users.router import router as users_router

RECORDED_INSTANTS = (
    Meeting.started_at,
    Meeting.section_started_at,
    Meeting.ended_at,
    Issue.created_at,
    Issue.solved_at,
    Todo.created_at,
    Todo.done_at,
)


@asynccontextmanager
async def lifespan(_: FastAPI):
    async with SessionLocal() as session:
        instants = [await session.scalar(select(func.max(c))) for c in RECORDED_INSTANTS]
    clock.resume_from(max((instant for instant in instants if instant), default=None))
    yield


app = FastAPI(
    lifespan=lifespan,
    title="Weekly Loop API",
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url=None,
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    SessionMiddleware,
    secret_key=settings.session_secret,
    session_cookie="session",
    same_site="lax",
    max_age=60 * 60 * 24 * 7,
)

api = APIRouter(prefix="/api")


@api.get("/health", tags=["health"])
async def health() -> dict[str, str]:
    return {"status": "ok"}


api.include_router(auth_router)
api.include_router(teams_router)
api.include_router(users_router)
api.include_router(company_settings_router)
api.include_router(rocks_router)
api.include_router(scorecard_router)
api.include_router(todos_router)
api.include_router(issues_router)
api.include_router(meetings_router)
api.include_router(realtime_router)

if settings.enable_test_tools:
    from app.test_forms.router import router as test_forms_router

    api.include_router(test_forms_router)

if settings.enable_test_routes:
    from app.testing.router import router as testing_router

    api.include_router(testing_router)

app.include_router(api)
