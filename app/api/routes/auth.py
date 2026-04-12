from fastapi import APIRouter

from app.core.responses import APIResponse
from app.models.schemas import LoginRequest, TokenResponse, UserCreate, UserRead
from app.services.container import container

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=APIResponse[UserRead])
def register(payload: UserCreate) -> APIResponse[UserRead]:
    user = container.auth_service.register(payload)
    return APIResponse(message="User registered", data=user)


@router.post("/login", response_model=APIResponse[TokenResponse])
def login(payload: LoginRequest) -> APIResponse[TokenResponse]:
    token = container.auth_service.login(payload)
    return APIResponse(message="Login successful", data=token)
