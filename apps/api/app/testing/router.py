from fastapi import APIRouter, status
from pydantic import Field

from app.common.clock import clock
from app.common.schemas import ApiModel
from app.common.shared_clock import share_clock
from app.db.session import SessionDep
from app.seed import reset_to_seed

router = APIRouter(prefix="/testing", tags=["testing"])


@router.post(
    "/reset",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Restore the seed and restart the clock (needs ENABLE_TEST_ROUTES)",
)
async def reset(session: SessionDep) -> None:
    await reset_to_seed(session)
    await session.commit()
    clock.restart()
    await share_clock(session)


class ClockAdvanceIn(ApiModel):
    seconds: int = Field(ge=1, le=7 * 24 * 60 * 60)


@router.post(
    "/clock/advance",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Move the app clock forward (needs ENABLE_TEST_ROUTES)",
)
async def advance_clock(body: ClockAdvanceIn, session: SessionDep) -> None:
    clock.advance(body.seconds)
    await share_clock(session)
