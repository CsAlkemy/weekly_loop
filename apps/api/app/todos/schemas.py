from datetime import date, datetime

from app.auth.schemas import UserOut
from app.common.schemas import ApiModel
from app.rules.rules import is_overdue
from app.todos.service import TodoView


class SourceIssueOut(ApiModel):
    id: str
    title: str


class TodoOut(ApiModel):
    id: str
    title: str
    owner: UserOut
    due_date: date
    done_at: datetime | None
    done_by: UserOut | None
    created_at: datetime
    overdue: bool
    source_issue: SourceIssueOut | None
    open_issue_id: str | None


class TodoCompletionOut(ApiModel):
    due: int
    done: int
    rate_percent: int
    meets_target: bool


class TodoWeekOut(ApiModel):
    week_start: date
    completion: TodoCompletionOut | None


class TodoListOut(ApiModel):
    todos: list[TodoOut]
    last_closed_week: date
    completion: TodoCompletionOut | None
    this_week: TodoWeekOut
    history: list[TodoWeekOut]


def todo_out(view: TodoView, today: date) -> TodoOut:
    todo, issue = view.todo, view.source_issue
    return TodoOut(
        id=todo.id,
        title=todo.title,
        owner=view.owner,
        due_date=todo.due_date,
        done_at=todo.done_at,
        done_by=view.done_by,
        created_at=todo.created_at,
        overdue=is_overdue(todo, today),
        source_issue=SourceIssueOut(id=issue.id, title=issue.title) if issue else None,
        open_issue_id=view.open_issue_id,
    )
