from decimal import Decimal

from fastapi import HTTPException, status

from app.common.schemas import ApiModel


class ErrorOut(ApiModel):
    detail: str


DESCRIPTIONS = {
    401: "Not signed in, or the email or password is wrong",
    403: "Signed in, but the role or team does not allow this",
    404: "Not found, or not in this team",
    409: "Clashes with the current state, for example an Issue that is already solved",
    429: "Too many failed sign-ins for this email; wait and try again",
}


def errors(*codes: int) -> dict[int | str, dict]:
    return {code: {"model": ErrorOut, "description": DESCRIPTIONS[code]} for code in codes}


def changed_by_someone_else(what: str, now: Decimal | int | None) -> HTTPException:
    shown = "empty" if now is None else format(Decimal(now).normalize(), "f")
    return HTTPException(
        status.HTTP_409_CONFLICT,
        f"Someone else changed {what} to {shown} since you loaded it. "
        "Check the new value and save again if yours should replace it.",
    )
