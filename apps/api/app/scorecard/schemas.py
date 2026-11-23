from datetime import date
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import Field, field_validator, model_validator

from app.auth.schemas import UserOut
from app.common.enums import GoalType, MeasurableStatus
from app.common.schemas import ApiModel


class GoalOut(ApiModel):
    type: GoalType
    value: float | None
    min: float | None
    max: float | None


class ScoreCellOut(ApiModel):
    week_start: date
    value: float | None
    status: MeasurableStatus
    issue_id: str | None


class MeasurableOut(ApiModel):
    id: str
    name: str
    owner: UserOut
    unit: str
    goal: GoalOut
    cells: list[ScoreCellOut]


class ScorecardOut(ApiModel):
    weeks: list[date]
    current_week: date
    last_closed_week: date
    measurables: list[MeasurableOut]


Expected = Annotated[
    Decimal | None,
    Field(
        max_digits=12,
        decimal_places=4,
        description="The score you last saw, or null if the week was empty. "
        "A save is refused with 409 when it has changed since.",
    ),
]


class ScoreIn(ApiModel):
    value: Decimal = Field(max_digits=12, decimal_places=4)
    expected: Expected


Amount = Decimal | None


class GoalIn(ApiModel):
    type: GoalType
    value: Amount = Field(default=None, max_digits=12, decimal_places=4)
    min: Amount = Field(default=None, max_digits=12, decimal_places=4)
    max: Amount = Field(default=None, max_digits=12, decimal_places=4)

    @model_validator(mode="after")
    def check_shape(self) -> "GoalIn":
        if self.type == GoalType.BETWEEN:
            if self.min is None or self.max is None or self.value is not None:
                raise ValueError("A between goal needs a lower and an upper number")
            if self.min > self.max:
                raise ValueError("The lower number must not be above the upper number")
        elif self.value is None or self.min is not None or self.max is not None:
            raise ValueError("This goal needs exactly one number")
        return self


class MeasurableCreateIn(ApiModel):
    name: str = Field(min_length=1, max_length=120)
    owner_id: str = Field(min_length=1, max_length=64)
    unit: Literal["count", "%", "$", "$k", "hours"]
    goal: GoalIn

    @field_validator("name", mode="before")
    @classmethod
    def strip(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value
