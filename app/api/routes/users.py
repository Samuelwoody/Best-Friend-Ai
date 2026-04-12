from typing import List
from uuid import UUID

from fastapi import APIRouter

from app.core.responses import APIResponse
from app.models.schemas import UserRead
from app.services.container import container

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=APIResponse[List[UserRead]])
def list_users() -> APIResponse[List[UserRead]]:
    users = container.user_service.list_users()
    return APIResponse(message="Users fetched", data=users)


@router.get("/{user_id}", response_model=APIResponse[UserRead])
def get_user(user_id: UUID) -> APIResponse[UserRead]:
    user = container.user_service.get_user(user_id)
    return APIResponse(message="User fetched", data=user)
