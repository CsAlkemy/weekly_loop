import os

import pytest

TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL")
if not TEST_DATABASE_URL:
    raise pytest.UsageError("Set TEST_DATABASE_URL: the test suite truncates every table.")

os.environ["DATABASE_URL"] = TEST_DATABASE_URL
os.environ["APP_NOW"] = "2026-11-11T15:00:00Z"
os.environ["APP_CLOCK"] = "frozen"
os.environ["ENABLE_TEST_ROUTES"] = "false"
os.environ["ENABLE_TEST_TOOLS"] = "true"
os.environ.setdefault("SESSION_SECRET", "test-secret-test-secret")

import json  # noqa: E402
from datetime import datetime  # noqa: E402

from httpx import ASGITransport, AsyncClient  # noqa: E402
from sqlalchemy import update  # noqa: E402

from app.common.clock import Clock, get_clock  # noqa: E402
from app.config.env import settings  # noqa: E402
from app.db.models import Company  # noqa: E402
from app.db.session import SessionLocal  # noqa: E402
from app.db.setup import ensure_database, migrate  # noqa: E402
from app.main import app  # noqa: E402
from app.seed import reset_to_seed  # noqa: E402


@pytest.fixture(scope="session")
def migrated_db() -> None:
    ensure_database(TEST_DATABASE_URL)
    migrate(TEST_DATABASE_URL)


@pytest.fixture
async def db(migrated_db):
    async with SessionLocal() as session:
        await reset_to_seed(session)
        await session.commit()
    async with SessionLocal() as session:
        yield session


@pytest.fixture
async def test_forms_on(db):
    await db.execute(update(Company).values(test_forms_enabled=True))
    await db.commit()


@pytest.fixture
async def client(db):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client


@pytest.fixture
def set_now():
    def apply(value: str) -> None:
        frozen = Clock(datetime.fromisoformat(value), ticking=False)
        app.dependency_overrides[get_clock] = lambda: frozen

    yield apply
    app.dependency_overrides.pop(get_clock, None)


SEED_EMAILS = {
    user["id"]: user["email"] for user in json.loads(settings.seed_path.read_text())["users"]
}


async def login(client: AsyncClient, user_id: str) -> None:
    credentials = {"email": SEED_EMAILS[user_id], "password": settings.seed_password}
    response = await client.post("/api/auth/login", json=credentials)
    assert response.status_code == 200
