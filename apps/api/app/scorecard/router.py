from datetime import date
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from app.activity import service as activity
from app.activity.labels import number, week_label
from app.auth.deps import TeamAccess, Writer
from app.common.enums import MeasurableStatus
from app.common.errors import errors
from app.common.weeks import CompanyTime, recent_weeks, week_start
from app.company_settings.deps import require_test_forms
from app.db.models import Measurable, User
from app.db.session import SessionDep
from app.issues.schemas import IssueOut, issue_out
from app.issues.service import make_issue_from_score
from app.realtime.hub import hub
from app.scorecard import service
from app.scorecard.schemas import (
    GoalOut,
    MeasurableCreateIn,
    MeasurableOut,
    ScorecardOut,
    ScoreCellOut,
    ScoreIn,
)
from app.teams.deps import TeamTime

router = APIRouter(
    prefix="/teams/{team_id}", tags=["scorecard"], responses=errors(401, 403, 404, 409)
)


def measurable_out(row: service.MeasurableRow) -> MeasurableOut:
    return MeasurableOut(
        id=row.measurable.id,
        name=row.measurable.name,
        owner=row.owner,
        unit=row.measurable.unit,
        goal=GoalOut(
            type=row.measurable.goal_type,
            value=row.measurable.goal_value,
            min=row.measurable.goal_min,
            max=row.measurable.goal_max,
        ),
        cells=[ScoreCellOut.model_validate(cell) for cell in row.cells],
    )


@router.get(
    "/scorecard",
    response_model=ScorecardOut,
    summary="Measurables by week for the last 13 weeks, with a status per score",
)
async def get_scorecard(team: TeamAccess, time: TeamTime, session: SessionDep):
    weeks = recent_weeks(time.now, time.tz)
    rows = await service.list_scorecard(session, team.id, weeks, time.current_week)
    return ScorecardOut(
        weeks=weeks,
        current_week=time.current_week,
        last_closed_week=time.last_closed_week,
        measurables=[measurable_out(row) for row in rows],
    )


@router.post(
    "/measurables",
    response_model=MeasurableOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_test_forms)],
    summary="Add a Measurable to the team's Scorecard (only while the test forms are on)",
)
async def create_measurable(
    body: MeasurableCreateIn, team: TeamAccess, user: Writer, time: TeamTime, session: SessionDep
):
    row = await service.create_measurable(
        session, team.id, body, recent_weeks(time.now, time.tz), time.current_week
    )
    await activity.record(
        session, team.id, user, "measurable.added", f"Added the Measurable {body.name}", time.now
    )
    await hub.invalidate(team.id, "scorecard")
    return measurable_out(row)


def editable_week(week: date, time: CompanyTime) -> date:
    if week != week_start(week):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "A week starts on a Monday")
    if week > time.current_week:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "That week has not started yet")
    return week


async def save_score(
    session: SessionDep,
    team_id: str,
    measurable_id: str,
    week: date,
    value: Decimal | None,
    expected: Decimal | None,
    time: CompanyTime,
    user: User,
) -> service.ScoreCell:
    cell = await service.set_score(
        session,
        team_id,
        measurable_id,
        editable_week(week, time),
        value,
        expected,
        time.current_week,
    )
    if cell is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Measurable not found")
    measurable = await session.get(Measurable, measurable_id)
    where = f"{measurable.name}, {week_label(week)}"
    summary = f"Cleared {where}" if value is None else f"Set {where} to {number(value)}"
    action = "score.cleared" if value is None else "score.set"
    await activity.record(session, team_id, user, action, summary, time.now)
    await hub.invalidate(team_id, "scorecard")
    return cell


@router.put(
    "/measurables/{measurable_id}/scores/{week}",
    response_model=ScoreCellOut,
    summary="Set a week's score, refused with 409 if it changed since you loaded it",
)
async def set_score(
    measurable_id: str,
    week: date,
    body: ScoreIn,
    team: TeamAccess,
    user: Writer,
    time: TeamTime,
    session: SessionDep,
):
    return await save_score(
        session, team.id, measurable_id, week, body.value, body.expected, time, user
    )


@router.delete(
    "/measurables/{measurable_id}/scores/{week}",
    response_model=ScoreCellOut,
    summary="Clear a week's score, refused with 409 if it changed since you loaded it",
)
async def clear_score(
    measurable_id: str,
    week: date,
    team: TeamAccess,
    user: Writer,
    time: TeamTime,
    session: SessionDep,
    expected: Annotated[
        Decimal | None, Query(description="The score you last saw; leave out if it was empty")
    ] = None,
):
    return await save_score(session, team.id, measurable_id, week, None, expected, time, user)


@router.post(
    "/measurables/{measurable_id}/scores/{week}/issue",
    response_model=IssueOut,
    status_code=status.HTTP_201_CREATED,
    responses={200: {"model": IssueOut, "description": "An unsolved Issue already exists"}},
    summary="Make it an Issue: create one for an off-track score, or return the open one",
)
async def make_it_an_issue(
    measurable_id: str,
    week: date,
    response: Response,
    team: TeamAccess,
    user: Writer,
    time: TeamTime,
    session: SessionDep,
):
    found = await service.get_cell(
        session, team.id, measurable_id, editable_week(week, time), time.current_week
    )
    if found is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Measurable not found")
    measurable, cell = found
    if cell.status != MeasurableStatus.OFF_TRACK:
        raise HTTPException(status.HTTP_409_CONFLICT, "Only an off-track score can become an Issue")

    view, created = await make_issue_from_score(
        session, team.id, measurable, week, user.id, time.now
    )
    if created:
        await activity.record(
            session, team.id, user, "issue.made", f"Made an Issue: {view.issue.title}", time.now
        )
        await hub.invalidate(team.id, "issues")
        await hub.invalidate(team.id, "scorecard")
    else:
        response.status_code = status.HTTP_200_OK
    return issue_out(view)
