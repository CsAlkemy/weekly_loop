from fastapi import APIRouter, status

from app.auth.deps import Admin
from app.db.session import SessionDep
from app.users import service
from app.users.schemas import UserCreateIn, UserDetailOut, UserUpdateIn

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserDetailOut], summary="Every user in the company (Admin)")
async def list_users(admin: Admin, session: SessionDep):
    return await service.list_users(session, admin.company_id)


@router.post(
    "",
    response_model=UserDetailOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a user with a role, teams and a password (Admin)",
)
async def create_user(body: UserCreateIn, admin: Admin, session: SessionDep):
    return await service.create_user(session, admin.company_id, body)


@router.patch(
    "/{user_id}",
    response_model=UserDetailOut,
    summary="Change a user's name, email, role, teams or password (Admin)",
)
async def update_user(user_id: str, body: UserUpdateIn, admin: Admin, session: SessionDep):
    return await service.update_user(session, admin, user_id, body)
