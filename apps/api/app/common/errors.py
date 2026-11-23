from app.common.schemas import ApiModel


class ErrorOut(ApiModel):
    detail: str


DESCRIPTIONS = {
    401: "Not signed in, or the email or password is wrong",
    403: "Signed in, but the role or team does not allow this",
    404: "Not found, or not in this team",
    409: "Clashes with the current state, for example an Issue that is already solved",
}


def errors(*codes: int) -> dict[int | str, dict]:
    return {code: {"model": ErrorOut, "description": DESCRIPTIONS[code]} for code in codes}
