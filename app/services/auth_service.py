from __future__ import annotations

from app.models.schemas import LoginRequest, TokenResponse, UserCreate, UserRead
from app.services.user_service import UserService


class AuthService:
    def __init__(self, user_service: UserService) -> None:
        self._user_service = user_service

    def register(self, payload: UserCreate) -> UserRead:
        return self._user_service.create_user(payload)

    def login(self, payload: LoginRequest) -> TokenResponse:
        user = self._user_service.validate_credentials(payload.email, payload.password)
        return TokenResponse(access_token=f"token-{user.id}")
