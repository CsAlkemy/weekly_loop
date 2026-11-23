from fastapi import HTTPException, status

from app.auth.deps import CurrentUser
from app.common.enums import Role
from app.config.env import settings
from app.db.models import User


def test_forms_on(user: User) -> bool:
    return settings.enable_test_tools and user.role == Role.ADMIN and user.test_forms_enabled


async def require_test_forms(user: CurrentUser) -> None:
    if not test_forms_on(user):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Test forms are off. An Admin can turn them on for themselves in Settings.",
        )
