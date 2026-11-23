from datetime import date

from app.auth.schemas import UserOut
from app.common.enums import RockStatus
from app.common.schemas import ApiModel
from app.rules.rules import is_past_due


class MilestoneOut(ApiModel):
    id: str
    title: str
    due_date: date
    done: bool
    past_due: bool


class RockOut(ApiModel):
    id: str
    title: str
    owner: UserOut
    quarter: str
    status: RockStatus
    progress_percent: int
    milestones: list[MilestoneOut]
    open_issue_id: str | None


def rock_out(view, today: date) -> RockOut:
    return RockOut(
        id=view.rock.id,
        title=view.rock.title,
        owner=view.owner,
        quarter=view.rock.quarter,
        status=view.status,
        progress_percent=view.progress_percent,
        milestones=[
            MilestoneOut(
                id=milestone.id,
                title=milestone.title,
                due_date=milestone.due_date,
                done=milestone.done,
                past_due=is_past_due(milestone, today),
            )
            for milestone in view.milestones
        ],
        open_issue_id=view.open_issue_id,
    )
