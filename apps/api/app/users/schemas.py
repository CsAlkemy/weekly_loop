from pydantic import Field, field_validator

from app.auth.schemas import UserOut
from app.common.enums import Role
from app.common.schemas import ApiModel

EMAIL = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"


class UserDetailOut(UserOut):
    team_ids: list[str]


class UserIn(ApiModel):
    @field_validator("name", "email", mode="before", check_fields=False)
    @classmethod
    def strip(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value

    @field_validator("email", check_fields=False)
    @classmethod
    def lower(cls, value: str | None) -> str | None:
        return value.lower() if value else value


class UserCreateIn(UserIn):
    name: str = Field(min_length=1, max_length=120)
    email: str = Field(max_length=254, pattern=EMAIL)
    role: Role
    password: str = Field(min_length=8, max_length=200)
    team_ids: list[str] = Field(default_factory=list, max_length=50)


class UserUpdateIn(UserIn):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    email: str | None = Field(default=None, max_length=254, pattern=EMAIL)
    role: Role | None = None
    password: str | None = Field(default=None, min_length=8, max_length=200)
    team_ids: list[str] | None = Field(default=None, max_length=50)
