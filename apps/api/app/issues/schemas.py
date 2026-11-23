from datetime import date, datetime
from typing import Annotated

from pydantic import Field, StringConstraints

from app.auth.schemas import UserOut
from app.common.schemas import ApiModel
from app.issues.service import IssueView

Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
Note = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)]
Priority = Annotated[int, Field(ge=1, le=5)]
Details = Annotated[str, StringConstraints(strip_whitespace=True, max_length=2000)]


class IssueSourceOut(ApiModel):
    measurable_id: str
    measurable_name: str
    week_start: date


class IssueLinkOut(ApiModel):
    id: str
    title: str


class IssueOut(ApiModel):
    id: str
    title: str
    details: str | None
    owner: UserOut
    priority: int | None
    created_at: datetime
    solved_at: datetime | None
    solved_by: UserOut | None
    resolution_note: str | None
    source: IssueSourceOut | None
    source_todo: IssueLinkOut | None
    source_rock: IssueLinkOut | None


class IssueCreateIn(ApiModel):
    title: Title
    details: Details | None = None
    priority: Priority | None = None


class IssuePriorityIn(ApiModel):
    priority: Priority | None
    expected: Priority | None = Field(
        description="The priority you last saw, or null for none. "
        "A change is refused with 409 when it has changed since."
    )


class IssueSolveIn(ApiModel):
    note: Note


class IssueTodoIn(ApiModel):
    title: Title
    owner_id: str = Field(min_length=1, max_length=64)


def issue_out(view: IssueView) -> IssueOut:
    issue, measurable = view.issue, view.source_measurable
    return IssueOut(
        id=issue.id,
        title=issue.title,
        details=issue.details,
        owner=view.owner,
        priority=issue.priority,
        created_at=issue.created_at,
        solved_at=issue.solved_at,
        solved_by=view.solved_by,
        resolution_note=issue.resolution_note,
        source=(
            IssueSourceOut(
                measurable_id=measurable.id,
                measurable_name=measurable.name,
                week_start=issue.source_week_start,
            )
            if measurable
            else None
        ),
        source_todo=view.source_todo,
        source_rock=view.source_rock,
    )
