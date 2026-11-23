from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import Field
from sqlalchemy import select

from app.auth.deps import TeamAccess, Writer
from app.common.enums import RockStatus
from app.common.errors import errors
from app.common.ids import new_id
from app.common.schemas import ApiModel
from app.company_settings.deps import require_test_forms
from app.db.models import Milestone, Rock, Todo
from app.db.session import SessionDep
from app.issues.schemas import Title
from app.issues.service import require_eligible_owner
from app.realtime.hub import hub
from app.rocks.schemas import RockOut, rock_out
from app.rocks.service import list_rocks
from app.teams.deps import TeamTime
from app.todos.schemas import TodoOut, todo_out
from app.todos.service import get_todo

router = APIRouter(
    prefix="/teams/{team_id}",
    tags=["test forms"],
    dependencies=[Depends(require_test_forms)],
    responses=errors(401, 403, 404),
)


class TodoCreateIn(ApiModel):
    title: Title
    owner_id: str = Field(min_length=1, max_length=64)
    due_date: date | None = None


class MilestoneIn(ApiModel):
    title: Title
    due_date: date


class RockCreateIn(ApiModel):
    title: Title
    owner_id: str = Field(min_length=1, max_length=64)
    status: RockStatus = RockStatus.ON_TRACK
    milestones: list[MilestoneIn] = Field(default_factory=list, max_length=12)


@router.post(
    "/todos",
    response_model=TodoOut,
    status_code=status.HTTP_201_CREATED,
    summary="Add a To-Do that is not linked to an Issue",
)
async def create_todo(
    body: TodoCreateIn, team: TeamAccess, _: Writer, time: TeamTime, session: SessionDep
):
    await require_eligible_owner(session, team.id, body.owner_id)
    todo = Todo(
        id=new_id("t"),
        team_id=team.id,
        title=body.title,
        owner_id=body.owner_id,
        due_date=body.due_date or time.today + timedelta(days=7),
        created_at=time.now,
    )
    session.add(todo)
    await session.commit()
    await hub.invalidate(team.id, "todos")
    return todo_out(await get_todo(session, team.id, todo.id), time.today)


async def rock_view(session: SessionDep, team_id: str, rock_id: str, time: TeamTime) -> RockOut:
    views = await list_rocks(session, team_id, time.today, rock_id=rock_id)
    if not views:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Rock not found")
    return rock_out(views[0], time.today)


@router.post(
    "/rocks",
    response_model=RockOut,
    status_code=status.HTTP_201_CREATED,
    summary="Add a Rock for the current quarter, with Milestones",
)
async def create_rock(
    body: RockCreateIn, team: TeamAccess, _: Writer, time: TeamTime, session: SessionDep
):
    await require_eligible_owner(session, team.id, body.owner_id)
    rock = Rock(
        id=new_id("r"),
        team_id=team.id,
        title=body.title,
        owner_id=body.owner_id,
        quarter=time.quarter,
        status=body.status,
    )
    session.add(rock)
    await session.flush()
    session.add_all(
        Milestone(
            id=new_id("ms"),
            rock_id=rock.id,
            title=milestone.title,
            due_date=milestone.due_date,
            done=False,
        )
        for milestone in body.milestones
    )
    await session.commit()
    await hub.invalidate(team.id, "rocks")
    return await rock_view(session, team.id, rock.id, time)


async def set_milestone_done(
    session: SessionDep, team_id: str, rock_id: str, milestone_id: str, done: bool, time: TeamTime
) -> RockOut:
    milestone = await session.scalar(
        select(Milestone)
        .join(Rock, Rock.id == Milestone.rock_id)
        .where(Milestone.id == milestone_id, Rock.id == rock_id, Rock.team_id == team_id)
        .with_for_update()
    )
    if milestone is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Milestone not found")
    milestone.done = done
    await session.commit()
    await hub.invalidate(team_id, "rocks")
    return await rock_view(session, team_id, rock_id, time)


@router.put(
    "/rocks/{rock_id}/milestones/{milestone_id}/done",
    response_model=RockOut,
    summary="Mark a Milestone done",
)
async def mark_milestone_done(
    rock_id: str,
    milestone_id: str,
    team: TeamAccess,
    _: Writer,
    time: TeamTime,
    session: SessionDep,
):
    return await set_milestone_done(session, team.id, rock_id, milestone_id, True, time)


@router.delete(
    "/rocks/{rock_id}/milestones/{milestone_id}/done",
    response_model=RockOut,
    summary="Mark a Milestone not done",
)
async def undo_milestone_done(
    rock_id: str,
    milestone_id: str,
    team: TeamAccess,
    _: Writer,
    time: TeamTime,
    session: SessionDep,
):
    return await set_milestone_done(session, team.id, rock_id, milestone_id, False, time)
