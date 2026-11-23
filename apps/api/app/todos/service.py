from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.db.models import Issue, Todo, User


@dataclass(frozen=True)
class TodoView:
    todo: Todo
    owner: User
    source_issue: Issue | None
    done_by: User | None


def _open_first_then_recently_done(view: TodoView) -> tuple:
    todo = view.todo
    if todo.done_at is None:
        return (0, todo.due_date.toordinal(), todo.id)
    return (1, -todo.done_at.timestamp(), todo.id)


async def _views(session: AsyncSession, team_id: str, todo_id: str | None = None) -> list[TodoView]:
    done_by = aliased(User)
    query = (
        select(Todo, User, Issue, done_by)
        .join(User, User.id == Todo.owner_id)
        .outerjoin(Issue, Issue.id == Todo.source_issue_id)
        .outerjoin(done_by, done_by.id == Todo.done_by_id)
        .where(Todo.team_id == team_id)
    )
    if todo_id is not None:
        query = query.where(Todo.id == todo_id)
    rows = (await session.execute(query)).all()
    return [
        TodoView(todo=todo, owner=owner, source_issue=issue, done_by=by)
        for todo, owner, issue, by in rows
    ]


async def get_todo(session: AsyncSession, team_id: str, todo_id: str) -> TodoView:
    return (await _views(session, team_id, todo_id))[0]


async def list_todos(session: AsyncSession, team_id: str) -> list[TodoView]:
    return sorted(await _views(session, team_id), key=_open_first_then_recently_done)


async def _set_done_at(
    session: AsyncSession,
    team_id: str,
    todo_id: str,
    done_at: datetime | None,
    done_by_id: str | None,
) -> TodoView | None:
    todo = await session.scalar(
        select(Todo).where(Todo.id == todo_id, Todo.team_id == team_id).with_for_update()
    )
    if todo is None:
        return None
    if done_at is None or todo.done_at is None:
        todo.done_at = done_at
        todo.done_by_id = done_by_id
    await session.commit()
    return (await _views(session, team_id, todo_id))[0]


async def mark_done(
    session: AsyncSession, team_id: str, todo_id: str, now: datetime, user_id: str
) -> TodoView | None:
    return await _set_done_at(session, team_id, todo_id, now, user_id)


async def undo_done(session: AsyncSession, team_id: str, todo_id: str) -> TodoView | None:
    return await _set_done_at(session, team_id, todo_id, None, None)
