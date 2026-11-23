from dataclasses import dataclass
from datetime import date, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.common.enums import Role
from app.common.ids import new_id
from app.db.models import Issue, Measurable, Membership, Todo, User
from app.rules.rules import issue_order
from app.todos.service import TodoView, get_todo

TODO_DUE_IN_DAYS = 7
MAKE_ISSUE_ATTEMPTS = 3


@dataclass(frozen=True)
class IssueView:
    issue: Issue
    owner: User
    source_measurable: Measurable | None
    solved_by: User | None


async def _views(session: AsyncSession, team_id: str, *conditions) -> list[IssueView]:
    solved_by = aliased(User)
    rows = await session.execute(
        select(Issue, User, Measurable, solved_by)
        .join(User, User.id == Issue.owner_id)
        .outerjoin(Measurable, Measurable.id == Issue.source_measurable_id)
        .outerjoin(solved_by, solved_by.id == Issue.solved_by_id)
        .where(Issue.team_id == team_id, *conditions)
    )
    return [
        IssueView(issue=issue, owner=owner, source_measurable=m, solved_by=by)
        for issue, owner, m, by in rows
    ]


async def list_unsolved(session: AsyncSession, team_id: str) -> list[IssueView]:
    views = {view.issue.id: view for view in await _views(session, team_id)}
    return [views[issue.id] for issue in issue_order(view.issue for view in views.values())]


async def list_solved(session: AsyncSession, team_id: str) -> list[IssueView]:
    views = await _views(session, team_id, Issue.solved_at.is_not(None))
    return sorted(views, key=lambda view: (view.issue.solved_at, view.issue.id), reverse=True)


async def get_issue(session: AsyncSession, team_id: str, issue_id: str) -> IssueView:
    views = await _views(session, team_id, Issue.id == issue_id)
    if not views:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Issue not found")
    return views[0]


async def _locked(session: AsyncSession, team_id: str, issue_id: str) -> Issue:
    issue = await session.scalar(
        select(Issue).where(Issue.id == issue_id, Issue.team_id == team_id).with_for_update()
    )
    if issue is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Issue not found")
    return issue


def _require_unsolved(issue: Issue) -> None:
    if issue.solved_at is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "This Issue is already solved")


async def create_issue(
    session: AsyncSession,
    team_id: str,
    owner_id: str,
    title: str,
    details: str | None,
    priority: int | None,
    now: datetime,
) -> IssueView:
    issue = Issue(
        id=new_id("i"),
        team_id=team_id,
        title=title,
        details=details or None,
        owner_id=owner_id,
        priority=priority,
        created_at=now,
    )
    session.add(issue)
    await session.commit()
    return await get_issue(session, team_id, issue.id)


async def set_priority(
    session: AsyncSession, team_id: str, issue_id: str, priority: int | None
) -> IssueView:
    issue = await _locked(session, team_id, issue_id)
    _require_unsolved(issue)
    issue.priority = priority
    await session.commit()
    return await get_issue(session, team_id, issue_id)


async def solve(
    session: AsyncSession, team_id: str, issue_id: str, note: str, now: datetime, user_id: str
) -> IssueView:
    issue = await _locked(session, team_id, issue_id)
    _require_unsolved(issue)
    issue.solved_at = now
    issue.solved_by_id = user_id
    issue.resolution_note = note
    await session.commit()
    return await get_issue(session, team_id, issue_id)


async def require_eligible_owner(session: AsyncSession, team_id: str, owner_id: str) -> None:
    owner = await session.scalar(
        select(User)
        .join(Membership, Membership.user_id == User.id)
        .where(User.id == owner_id, Membership.team_id == team_id)
    )
    if owner is None or owner.role == Role.OBSERVER:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "The owner must be an Admin or Team Member of this team",
        )


async def add_todo(
    session: AsyncSession,
    team_id: str,
    issue_id: str,
    title: str,
    owner_id: str,
    today: date,
    now: datetime,
) -> TodoView:
    await get_issue(session, team_id, issue_id)
    await require_eligible_owner(session, team_id, owner_id)
    todo = Todo(
        id=new_id("t"),
        team_id=team_id,
        title=title,
        owner_id=owner_id,
        due_date=today + timedelta(days=TODO_DUE_IN_DAYS),
        source_issue_id=issue_id,
        created_at=now,
    )
    session.add(todo)
    await session.commit()
    return await get_todo(session, team_id, todo.id)


async def make_issue_from_score(
    session: AsyncSession,
    team_id: str,
    measurable: Measurable,
    week_start: date,
    owner_id: str,
    now: datetime,
) -> tuple[IssueView, bool]:
    title = f"{measurable.name}, week of {week_start:%b} {week_start.day}"
    is_open_for_source = (
        Issue.source_measurable_id == measurable.id,
        Issue.source_week_start == week_start,
        Issue.solved_at.is_(None),
    )

    for _ in range(MAKE_ISSUE_ATTEMPTS):
        created_id = await session.scalar(
            insert(Issue)
            .values(
                id=new_id("i"),
                team_id=team_id,
                title=title,
                owner_id=owner_id,
                created_at=now,
                source_measurable_id=measurable.id,
                source_week_start=week_start,
            )
            .on_conflict_do_nothing(
                index_elements=[Issue.source_measurable_id, Issue.source_week_start],
                index_where=Issue.solved_at.is_(None),
            )
            .returning(Issue.id)
        )
        await session.commit()
        if created_id is not None:
            return await get_issue(session, team_id, created_id), True

        existing_id = await session.scalar(select(Issue.id).where(*is_open_for_source))
        if existing_id is not None:
            return await get_issue(session, team_id, existing_id), False

    raise HTTPException(status.HTTP_409_CONFLICT, "The Issue changed while saving; try again")
