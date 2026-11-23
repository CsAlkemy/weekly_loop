from sqlalchemy import func, select

from app.db import models
from app.seed import seed

EXPECTED = {
    models.Team: 3,
    models.User: 9,
    models.Membership: 11,
    models.Measurable: 7,
    models.Score: 83,
    models.Rock: 7,
    models.Milestone: 12,
    models.Issue: 9,
    models.Todo: 20,
    models.Meeting: 2,
    models.MeetingAttendee: 10,
    models.MeetingRating: 7,
}


async def counts(db) -> dict:
    return {model: await db.scalar(select(func.count()).select_from(model)) for model in EXPECTED}


async def test_seed_loads_every_record(db):
    assert await counts(db) == EXPECTED


async def test_seed_is_safe_to_rerun(db):
    await seed(db)
    await db.commit()
    assert await counts(db) == EXPECTED
