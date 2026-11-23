from datetime import timedelta

from fastapi import APIRouter, HTTPException, Response, status

from app.activity import service as activity
from app.auth.deps import TeamAccess, Writer
from app.common.errors import errors
from app.db.session import SessionDep
from app.issues.schemas import IssueOut, issue_out
from app.issues.service import make_issue_from_todo
from app.realtime.hub import hub
from app.rules.rules import is_overdue, todo_completion
from app.teams.deps import TeamTime
from app.todos import service
from app.todos.schemas import TodoCompletionOut, TodoListOut, TodoOut, TodoWeekOut, todo_out

HISTORY_WEEKS = 8

router = APIRouter(
    prefix="/teams/{team_id}/todos", tags=["todos"], responses=errors(401, 403, 404, 409)
)


def found(view: service.TodoView | None) -> service.TodoView:
    if view is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "To-Do not found")
    return view


@router.get(
    "",
    response_model=TodoListOut,
    summary="To-Dos, overdue flags, and completion for the last closed week, this week and history",
)
async def list_todos(team: TeamAccess, time: TeamTime, session: SessionDep):
    views = await service.list_todos(session, team.id)
    todos = [view.todo for view in views]
    week = time.last_closed_week
    this_week = week + timedelta(weeks=1)

    def rate(week_start):
        completion = todo_completion(todos, week_start, time.tz)
        return TodoCompletionOut.model_validate(completion) if completion else None

    return TodoListOut(
        todos=[todo_out(view, time.today) for view in views],
        last_closed_week=week,
        completion=rate(week),
        this_week=TodoWeekOut(week_start=this_week, completion=rate(this_week)),
        history=[
            TodoWeekOut(week_start=start, completion=rate(start))
            for start in (week - timedelta(weeks=n) for n in range(HISTORY_WEEKS - 1, -1, -1))
        ],
    )


@router.post("/{todo_id}/done", response_model=TodoOut, summary="Mark a To-Do done")
async def mark_done(
    todo_id: str, team: TeamAccess, user: Writer, time: TeamTime, session: SessionDep
):
    view = found(await service.mark_done(session, team.id, todo_id, time.now, user.id))
    await activity.record(
        session, team.id, user, "todo.done", f"Marked {view.todo.title} done", time.now
    )
    await hub.invalidate(team.id, "todos")
    return todo_out(view, time.today)


@router.delete("/{todo_id}/done", response_model=TodoOut, summary="Undo a done To-Do")
async def undo_done(
    todo_id: str, team: TeamAccess, user: Writer, time: TeamTime, session: SessionDep
):
    view = found(await service.undo_done(session, team.id, todo_id))
    await activity.record(
        session, team.id, user, "todo.reopened", f"Reopened {view.todo.title}", time.now
    )
    await hub.invalidate(team.id, "todos")
    return todo_out(view, time.today)


@router.post(
    "/{todo_id}/issue",
    response_model=IssueOut,
    status_code=status.HTTP_201_CREATED,
    responses={200: {"model": IssueOut, "description": "An unsolved Issue already exists"}},
    summary="Make it an Issue: create one for an overdue To-Do, or return the open one",
)
async def make_it_an_issue(
    todo_id: str,
    response: Response,
    team: TeamAccess,
    user: Writer,
    time: TeamTime,
    session: SessionDep,
):
    view = found(await service.get_todo(session, team.id, todo_id))
    if not is_overdue(view.todo, time.today):
        raise HTTPException(status.HTTP_409_CONFLICT, "Only an overdue To-Do can become an Issue")
    issue, created = await make_issue_from_todo(session, team.id, view.todo, user.id, time.now)
    if created:
        await activity.record(
            session, team.id, user, "issue.made", f"Made an Issue: {issue.issue.title}", time.now
        )
        await hub.invalidate(team.id, "issues")
        await hub.invalidate(team.id, "todos")
    else:
        response.status_code = status.HTTP_200_OK
    return issue_out(issue)
