import secrets
from datetime import UTC, datetime
from pathlib import Path
from typing import Literal

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

SEED_NOW = datetime(2026, 11, 11, 15, 0, tzinfo=UTC)


def stored_secret(path: Path) -> str:
    if path.exists():
        return path.read_text().strip()
    secret = secrets.token_urlsafe(32)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(secret)
    path.chmod(0o600)
    return secret


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    session_secret: str = ""
    session_secret_file: Path | None = None
    web_origin: str = "http://localhost:3000"
    app_now: datetime = SEED_NOW
    app_clock: Literal["ticking", "frozen"] = "ticking"
    enable_test_routes: bool = False
    seed_password: str = Field(default="weekly-loop-demo", min_length=8)
    demo_accounts: bool = True
    enable_test_tools: bool = False
    seed_path: Path = Path(__file__).resolve().parents[2] / "seed" / "seed.json"

    @property
    def web_origins(self) -> set[str]:
        return {origin.strip() for origin in self.web_origin.split(",") if origin.strip()}

    @model_validator(mode="after")
    def fill_session_secret(self) -> "Settings":
        if not self.session_secret:
            self.session_secret = (
                stored_secret(self.session_secret_file)
                if self.session_secret_file
                else secrets.token_urlsafe(32)
            )
        if len(self.session_secret) < 16:
            raise ValueError("SESSION_SECRET must be at least 16 characters")
        return self

    @field_validator("app_now", mode="before")
    @classmethod
    def default_when_blank(cls, value: object) -> object:
        return SEED_NOW if value in (None, "") else value

    @field_validator("app_now")
    @classmethod
    def require_utc(cls, value: datetime) -> datetime:
        if value.tzinfo is None:
            raise ValueError("APP_NOW must include a UTC offset, e.g. 2026-11-11T15:00:00Z")
        return value.astimezone(UTC)


settings = Settings()
