import asyncio
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from starlette.middleware.sessions import SessionMiddleware

from app.activity.router import router as activity_router
from app.auth.router import router as auth_router
from app.common.shared_clock import CLOCK_CHANGED, load_clock
from app.company_settings.router import router as company_settings_router
from app.config.env import settings
from app.db.session import SessionLocal
from app.issues.router import router as issues_router
from app.meetings.router import router as meetings_router
from app.realtime.hub import hub
from app.realtime.router import router as realtime_router
from app.rocks.router import router as rocks_router
from app.scorecard.router import router as scorecard_router
from app.teams.router import router as teams_router
from app.todos.router import router as todos_router
from app.users.router import router as users_router


async def reload_clock(event: dict) -> None:
    if event == CLOCK_CHANGED:
        async with SessionLocal() as session:
            await load_clock(session)


@asynccontextmanager
async def lifespan(_: FastAPI):
    async with SessionLocal() as session:
        await load_clock(session)
    listener = asyncio.create_task(hub.listen(reload_clock))
    yield
    listener.cancel()


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
    https_only=settings.session_cookie_secure,
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
api.include_router(activity_router)

if settings.enable_test_tools:
    from app.test_forms.router import router as test_forms_router

    api.include_router(test_forms_router)

if settings.enable_test_routes:
    from app.testing.router import router as testing_router

    api.include_router(testing_router)

app.include_router(api)
