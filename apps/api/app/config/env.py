import secrets
from datetime import UTC, datetime
from pathlib import Path
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

SEED_NOW = datetime(2026, 11, 11, 15, 0, tzinfo=UTC)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    session_secret: str = Field(default_factory=lambda: secrets.token_urlsafe(32), min_length=16)
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

    @field_validator("session_secret", mode="before")
    @classmethod
    def random_when_blank(cls, value: object) -> object:
        return secrets.token_urlsafe(32) if value in (None, "") else value

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
