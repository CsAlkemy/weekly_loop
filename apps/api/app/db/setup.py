from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import URL, Engine, create_engine, make_url, text

ALEMBIC_INI = Path(__file__).resolve().parents[2] / "alembic.ini"


def _admin_engine(url: URL) -> Engine:
    return create_engine(url.set(database="postgres"), isolation_level="AUTOCOMMIT")


def ensure_database(url: str | URL) -> None:
    target = make_url(url)
    admin = _admin_engine(target)
    with admin.connect() as connection:
        exists = connection.scalar(
            text("SELECT 1 FROM pg_database WHERE datname = :name"), {"name": target.database}
        )
        if not exists:
            connection.execute(text(f'CREATE DATABASE "{target.database}"'))
    admin.dispose()


def drop_database(url: str | URL) -> None:
    target = make_url(url)
    admin = _admin_engine(target)
    with admin.connect() as connection:
        connection.execute(text(f'DROP DATABASE IF EXISTS "{target.database}" WITH (FORCE)'))
    admin.dispose()


def migrate(url: str | URL) -> None:
    config = Config(ALEMBIC_INI)
    rendered = make_url(url).render_as_string(hide_password=False)
    config.set_main_option("sqlalchemy.url", rendered.replace("%", "%%"))
    command.upgrade(config, "head")
