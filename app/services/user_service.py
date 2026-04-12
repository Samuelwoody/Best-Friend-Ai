from __future__ import annotations

from typing import Dict, List
from uuid import UUID

from fastapi import HTTPException

from app.models.schemas import UserCreate, UserRead


class UserService:
    def __init__(self) -> None:
        self._users: Dict[UUID, UserRead] = {}
        self._passwords_by_email: Dict[str, str] = {}
        self._user_id_by_email: Dict[str, UUID] = {}

    def create_user(self, payload: UserCreate) -> UserRead:
        if payload.email in self._user_id_by_email:
            raise HTTPException(status_code=409, detail="User already exists")

        user = UserRead(email=payload.email, full_name=payload.full_name)
        self._users[user.id] = user
        self._passwords_by_email[payload.email] = payload.password
        self._user_id_by_email[payload.email] = user.id
        return user

    def get_user(self, user_id: UUID) -> UserRead:
        user = self._users.get(user_id)
        if user is None:
            raise HTTPException(status_code=404, detail="User not found")
        return user

    def list_users(self) -> List[UserRead]:
        return list(self._users.values())

    def validate_credentials(self, email: str, password: str) -> UserRead:
        stored = self._passwords_by_email.get(email)
        if stored is None or stored != password:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        user_id = self._user_id_by_email[email]
        return self._users[user_id]
