from typing import Literal

from fastapi import APIRouter, status

from app.activity import service as activity
from app.auth.deps import TeamAccess, Writer
from app.common.errors import errors
from app.db.session import SessionDep
from app.issues import service
from app.issues.schemas import (
    IssueCreateIn,
    IssueOut,
    IssuePriorityIn,
    IssueSolveIn,
    IssueTodoIn,
    issue_out,
)
from app.realtime.hub import hub
from app.teams.deps import TeamTime
from app.todos.schemas import TodoOut, todo_out

router = APIRouter(
    prefix="/teams/{team_id}/issues", tags=["issues"], responses=errors(401, 403, 404, 409)
)


@router.get(
    "",
    response_model=list[IssueOut],
    summary="Unsolved Issues in Issue order, or solved Issues newest first",
)
async def list_issues(
    team: TeamAccess,
    session: SessionDep,
    status: Literal["unsolved", "solved"] = "unsolved",
):
    views = (
        await service.list_unsolved(session, team.id)
        if status == "unsolved"
        else await service.list_solved(session, team.id)
    )
    return [issue_out(view) for view in views]


@router.post(
    "",
    response_model=IssueOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create an Issue owned by the current user",
)
async def create_issue(
    body: IssueCreateIn, team: TeamAccess, user: Writer, time: TeamTime, session: SessionDep
):
    view = await service.create_issue(
        session, team.id, user.id, body.title, body.details, body.priority, time.now
    )
    await activity.record(
        session, team.id, user, "issue.added", f"Added the Issue {body.title}", time.now
    )
    await hub.invalidate(team.id, "issues")
    return issue_out(view)


@router.patch(
    "/{issue_id}",
    response_model=IssueOut,
    summary="Set or clear an Issue's priority, refused with 409 if it changed since you loaded it",
)
async def set_priority(
    issue_id: str,
    body: IssuePriorityIn,
    team: TeamAccess,
    user: Writer,
    time: TeamTime,
    session: SessionDep,
):
    view = await service.set_priority(session, team.id, issue_id, body.priority, body.expected)
    await activity.record(
        session,
        team.id,
        user,
        "issue.priority",
        f"Set the priority of {view.issue.title} to {body.priority or 'none'}",
        time.now,
    )
    await hub.invalidate(team.id, "issues")
    return issue_out(view)


@router.post("/{issue_id}/solve", response_model=IssueOut, summary="Solve an Issue with a note")
async def solve_issue(
    issue_id: str,
    body: IssueSolveIn,
    team: TeamAccess,
    user: Writer,
    time: TeamTime,
    session: SessionDep,
):
    view = await service.solve(session, team.id, issue_id, body.note, time.now, user.id)
    await activity.record(
        session, team.id, user, "issue.solved", f"Solved {view.issue.title}", time.now
    )
    await hub.invalidate(team.id, "issues")
    return issue_out(view)


@router.post(
    "/{issue_id}/todos",
    response_model=TodoOut,
    status_code=status.HTTP_201_CREATED,
    summary="Add a To-Do linked to an Issue, due in 7 days",
)
async def add_todo(
    issue_id: str,
    body: IssueTodoIn,
    team: TeamAccess,
    user: Writer,
    time: TeamTime,
    session: SessionDep,
):
    view = await service.add_todo(
        session, team.id, issue_id, body.title, body.owner_id, time.today, time.now
    )
    await activity.record(
        session,
        team.id,
        user,
        "todo.added",
        f"Added the To-Do {body.title} for {view.owner.name}",
        time.now,
    )
    await hub.invalidate(team.id, "todos")
    return todo_out(view, time.today)
