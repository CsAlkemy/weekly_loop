from fastapi import HTTPException, status

from app.auth.deps import CurrentUser
from app.config.env import settings
from app.db.models import Company
from app.db.session import SessionDep


async def test_forms_on(session: SessionDep, company_id: str) -> bool:
    if not settings.enable_test_tools:
        return False
    company = await session.get(Company, company_id)
    return bool(company and company.test_forms_enabled)


async def require_test_forms(user: CurrentUser, session: SessionDep) -> None:
    if not await test_forms_on(session, user.company_id):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Test forms are switched off. An Admin can turn them on in Settings.",
        )
