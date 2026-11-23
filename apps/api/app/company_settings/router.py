from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select, update

from app.auth.deps import Admin, CurrentUser
from app.common.clock import clock
from app.common.errors import errors
from app.common.schemas import ApiModel
from app.common.shared_clock import share_clock
from app.company_settings.deps import test_forms_on
from app.config.env import settings
from app.db.models import Company, Team
from app.db.session import SessionDep
from app.realtime.hub import hub
from app.seed import reset_to_seed

router = APIRouter(prefix="/settings", tags=["settings"], responses=errors(401, 403, 409))

TEAM_RESOURCES = ("scorecard", "issues", "todos", "rocks", "meeting")


class SettingsOut(ApiModel):
    test_tools_available: bool
    test_forms: bool


class SettingsIn(ApiModel):
    test_forms: bool


def require_test_tools() -> None:
    if not settings.enable_test_tools:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Testing tools are turned off on this server."
        )


async def set_test_forms(session: SessionDep, company_id: str, enabled: bool) -> None:
    await session.execute(
        update(Company).where(Company.id == company_id).values(test_forms_enabled=enabled)
    )


async def settings_out(session: SessionDep, company_id: str) -> SettingsOut:
    return SettingsOut(
        test_tools_available=settings.enable_test_tools,
        test_forms=await test_forms_on(session, company_id),
    )


@router.get("", response_model=SettingsOut, summary="Company settings")
async def read_settings(user: CurrentUser, session: SessionDep):
    return await settings_out(session, user.company_id)


@router.patch("", response_model=SettingsOut, summary="Turn the test forms on or off (Admin)")
async def update_settings(body: SettingsIn, admin: Admin, session: SessionDep):
    require_test_tools()
    await set_test_forms(session, admin.company_id, body.test_forms)
    await session.commit()
    return await settings_out(session, admin.company_id)


@router.post(
    "/reset-to-seed",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Replace all data with the seed and restart the clock (Admin)",
)
async def reset_data(admin: Admin, session: SessionDep):
    require_test_tools()
    switches = dict((await session.execute(select(Company.id, Company.test_forms_enabled))).all())
    await reset_to_seed(session)
    for company_id, enabled in switches.items():
        await set_test_forms(session, company_id, enabled)
    await session.commit()
    clock.restart()
    await share_clock(session)
    for team_id in await session.scalars(select(Team.id)):
        for resource in TEAM_RESOURCES:
            await hub.invalidate(team_id, resource)
