from __future__ import annotations

from typing import Dict, List
from uuid import UUID

from app.models.schemas import MemoryCreate, MemoryRead


class MemoryService:
    def __init__(self) -> None:
        self._memories_by_user: Dict[UUID, List[MemoryRead]] = {}

    def upsert_memory(self, payload: MemoryCreate) -> MemoryRead:
        existing = self._memories_by_user.setdefault(payload.user_id, [])

        for idx, memory in enumerate(existing):
            if memory.key == payload.key:
                updated = MemoryRead(id=memory.id, created_at=memory.created_at, **payload.model_dump())
                existing[idx] = updated
                return updated

        memory = MemoryRead(**payload.model_dump())
        existing.append(memory)
        return memory

    def list_memories(self, user_id: UUID) -> List[MemoryRead]:
        return self._memories_by_user.get(user_id, [])
