import asyncio
import json
from datetime import date, datetime
from decimal import Decimal
from functools import cache
from pathlib import Path

from sqlalchemy import text, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.passwords import hash_password
from app.config.env import settings
from app.db import models
from app.db.session import SessionLocal, engine


def instant(value: str | None) -> datetime | None:
    return datetime.fromisoformat(value) if value else None


def number(value: float | int | None) -> Decimal | None:
    return None if value is None else Decimal(str(value))


def build_rows(data: dict) -> list[tuple[type[models.Base], list[dict]]]:
    company_id = data["company"]["id"]

    measurables = [
        {
            "id": m["id"],
            "team_id": m["team_id"],
            "name": m["name"],
            "owner_id": m["owner_id"],
            "unit": m["unit"],
            "goal_type": m["goal"]["type"],
            "goal_value": number(m["goal"].get("value")),
            "goal_min": number(m["goal"].get("min")),
            "goal_max": number(m["goal"].get("max")),
        }
        for m in data["measurables"]
    ]
    scores = [
        {
            "measurable_id": s["measurable_id"],
            "week_start": date.fromisoformat(s["week_start"]),
            "value": number(s["value"]),
        }
        for s in data["scores"]
    ]
    milestones = [{**m, "due_date": date.fromisoformat(m["due_date"])} for m in data["milestones"]]
    issues = [
        {
            "id": i["id"],
            "team_id": i["team_id"],
            "title": i["title"],
            "owner_id": i["owner_id"],
            "priority": i["priority"],
            "created_at": instant(i["created_at"]),
            "solved_at": instant(i["solved_at"]),
            "resolution_note": i["resolution_note"],
            "source_measurable_id": i["source"]["measurable_id"] if i["source"] else None,
            "source_week_start": (
                date.fromisoformat(i["source"]["week_start"]) if i["source"] else None
            ),
        }
        for i in data["issues"]
    ]
    todos = [
        {
            **t,
            "due_date": date.fromisoformat(t["due_date"]),
            "done_at": instant(t["done_at"]),
            "created_at": instant(t["created_at"]),
        }
        for t in data["todos"]
    ]
    meetings = [
        {
            "id": m["id"],
            "team_id": m["team_id"],
            "facilitator_id": m["facilitator_id"],
            "started_at": instant(m["started_at"]),
            "ended_at": instant(m["ended_at"]),
        }
        for m in data["meetings"]
    ]
    attendees = [
        {"meeting_id": m["id"], "user_id": user_id, "joined_at": instant(m["started_at"])}
        for m in data["meetings"]
        for user_id in m["attendee_ids"]
    ]
    ratings = [
        {"meeting_id": m["id"], "user_id": r["user_id"], "rating": r["rating"]}
        for m in data["meetings"]
        for r in m["ratings"]
    ]

    return [
        (models.Company, [data["company"]]),
        (models.Team, [{**t, "company_id": company_id} for t in data["teams"]]),
        (models.User, [{**u, "company_id": company_id} for u in data["users"]]),
        (models.Membership, data["memberships"]),
        (models.Measurable, measurables),
        (models.Score, scores),
        (models.Rock, data["rocks"]),
        (models.Milestone, milestones),
        (models.Issue, issues),
        (models.Todo, todos),
        (models.Meeting, meetings),
        (models.MeetingAttendee, attendees),
        (models.MeetingRating, ratings),
    ]


@cache
def seed_password_hash() -> str:
    return hash_password(settings.seed_password)


async def seed(session: AsyncSession, path: Path = settings.seed_path) -> None:
    data = json.loads(path.read_text())
    for model, rows in build_rows(data):
        if rows:
            await session.execute(insert(model).values(rows).on_conflict_do_nothing())
    await session.execute(
        update(models.User)
        .where(models.User.password_hash.is_(None))
        .values(password_hash=seed_password_hash())
    )


async def reset_to_seed(session: AsyncSession) -> None:
    tables = ", ".join(table.name for table in models.Base.metadata.sorted_tables)
    await session.execute(text(f"TRUNCATE {tables} CASCADE"))
    await seed(session)


async def main() -> None:
    async with SessionLocal() as session:
        await seed(session)
        await session.commit()
    await engine.dispose()
    print(f"Seed loaded from {settings.seed_path}")


if __name__ == "__main__":
    asyncio.run(main())
