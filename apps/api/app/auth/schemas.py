from pydantic import Field

from app.common.enums import Role
from app.common.schemas import ApiModel


class UserOut(ApiModel):
    id: str
    name: str
    email: str
    role: Role


class DemoAccountsOut(ApiModel):
    users: list[UserOut]
    password: str


class LoginIn(ApiModel):
    email: str = Field(min_length=1, max_length=254)
    password: str = Field(min_length=1, max_length=200)
