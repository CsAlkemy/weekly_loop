from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select, update

from app.auth.deps import Admin, CurrentUser
from app.common.clock import clock
from app.common.errors import errors
from app.common.schemas import ApiModel
from app.common.shared_clock import share_clock
from app.company_settings.deps import test_forms_on
from app.config.env import settings
from app.db.models import Team, User
from app.db.session import SessionDep
from app.realtime.hub import hub
from app.seed import reset_to_seed

router = APIRouter(prefix="/settings", tags=["settings"], responses=errors(401, 403, 409))


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


def settings_out(user: User) -> SettingsOut:
    return SettingsOut(
        test_tools_available=settings.enable_test_tools, test_forms=test_forms_on(user)
    )


@router.get("", response_model=SettingsOut, summary="Settings for the signed-in user")
async def read_settings(user: CurrentUser):
    return settings_out(user)


@router.patch(
    "", response_model=SettingsOut, summary="Turn the test forms on or off for yourself (Admin)"
)
async def update_settings(body: SettingsIn, admin: Admin, session: SessionDep):
    require_test_tools()
    admin.test_forms_enabled = body.test_forms
    await session.commit()
    return settings_out(admin)


@router.post(
    "/reset-to-seed",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Replace all data with the seed and restart the clock (Admin)",
)
async def reset_data(admin: Admin, session: SessionDep):
    require_test_tools()
    switched_on = list(await session.scalars(select(User.id).where(User.test_forms_enabled)))
    await reset_to_seed(session)
    await session.execute(
        update(User).where(User.id.in_(switched_on)).values(test_forms_enabled=True)
    )
    await session.commit()
    clock.restart()
    await share_clock(session)
    await hub.refresh(list(await session.scalars(select(Team.id))))
