import asyncio
import json
from dataclasses import asdict
from datetime import UTC, date, datetime
from zoneinfo import ZoneInfo

from sqlalchemy import make_url, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.common.enums import MeasurableStatus
from app.common.weeks import local_date, recent_weeks, week_of
from app.config.env import settings
from app.db.models import (
    Company,
    Issue,
    Meeting,
    Team,
    Todo,
)
from app.db.setup import drop_database, ensure_database, migrate
from app.meetings.service import summarize
from app.rocks.service import list_rocks
from app.rules.rules import (
    is_overdue,
    issue_order,
    todo_completion,
)
from app.scorecard.service import list_scorecard
from app.seed import seed


async def measurable_statuses(
    session: AsyncSession, team_id: str, weeks: list[date], current_week: date
) -> dict[str, dict[date, MeasurableStatus]]:
    rows = await list_scorecard(session, team_id, weeks, current_week)
    return {row.measurable.id: {cell.week_start: cell.status for cell in row.cells} for row in rows}


async def rocks_report(session: AsyncSession, team_id: str, today: date) -> dict[str, dict]:
    return {
        view.rock.id: {"status": view.status, "progress_percent": view.progress_percent}
        for view in await list_rocks(session, team_id, today)
    }


async def meeting_summary(session: AsyncSession, meeting: Meeting, tz: ZoneInfo) -> dict:
    summary = await summarize(session, meeting, tz)
    return {
        "scorecard_week": summary.scorecard_week.isoformat(),
        "measurable_status": {
            row.measurable.id: row.cells[0].status for row in summary.measurables
        },
        "issues_solved": sorted(issue.id for issue in summary.issues_solved),
        "todos_created": sorted(todo.id for todo, _ in summary.todos_created),
        "attendee_ids": sorted(user.id for user in summary.attendees),
        "rating": None if summary.rating is None else float(summary.rating),
    }


async def team_report(session: AsyncSession, team: Team, now: datetime, tz: ZoneInfo) -> dict:
    today = local_date(now, tz)
    weeks = recent_weeks(now, tz)

    statuses = await measurable_statuses(session, team.id, weeks, week_of(now, tz))
    todos = (await session.scalars(select(Todo).where(Todo.team_id == team.id))).all()
    issues = (await session.scalars(select(Issue).where(Issue.team_id == team.id))).all()
    meetings = (
        await session.scalars(
            select(Meeting)
            .where(Meeting.team_id == team.id, Meeting.ended_at.is_not(None))
            .order_by(Meeting.id)
        )
    ).all()

    completion = {week: todo_completion(todos, week, tz) for week in weeks}

    return {
        "measurable_status": {
            measurable_id: {week.isoformat(): status for week, status in by_week.items()}
            for measurable_id, by_week in statuses.items()
        },
        "todo_completion": {
            week.isoformat(): asdict(result) if result else None
            for week, result in completion.items()
        },
        "overdue_todos": sorted(todo.id for todo in todos if is_overdue(todo, today)),
        "rocks": await rocks_report(session, team.id, today),
        "issue_order": [issue.id for issue in issue_order(issues)],
        "meetings": {
            meeting.id: await meeting_summary(session, meeting, tz) for meeting in meetings
        },
    }


async def build_report(session: AsyncSession, now: datetime) -> dict:
    rows = await session.execute(
        select(Team, Company.timezone)
        .join(Company, Company.id == Team.company_id)
        .order_by(Team.id)
    )
    return {
        "now": now.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "teams": {
            team.id: await team_report(session, team, now, ZoneInfo(timezone))
            for team, timezone in rows.all()
        },
    }


async def report_on_fresh_seed(url: str, now: datetime) -> dict:
    engine = create_async_engine(url)
    try:
        async with async_sessionmaker(engine)() as session:
            await seed(session)
            await session.commit()
            return await build_report(session, now)
    finally:
        await engine.dispose()


def main() -> None:
    live = make_url(settings.database_url)
    scratch = live.set(database=f"{live.database}_rules_report")
    url = scratch.render_as_string(hide_password=False)

    drop_database(url)
    ensure_database(url)
    try:
        migrate(url)
        report = asyncio.run(report_on_fresh_seed(url, settings.app_now))
    finally:
        drop_database(url)

    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
