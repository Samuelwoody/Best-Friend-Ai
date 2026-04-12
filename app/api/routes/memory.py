from typing import List
from uuid import UUID

from fastapi import APIRouter

from app.core.responses import APIResponse
from app.models.schemas import MemoryCreate, MemoryRead
from app.services.container import container

router = APIRouter(prefix="/memory", tags=["memory"])


@router.put("", response_model=APIResponse[MemoryRead])
def upsert_memory(payload: MemoryCreate) -> APIResponse[MemoryRead]:
    memory = container.memory_service.upsert_memory(payload)
    return APIResponse(message="Memory stored", data=memory)


@router.get("/{user_id}", response_model=APIResponse[List[MemoryRead]])
def list_memory(user_id: UUID) -> APIResponse[List[MemoryRead]]:
    memories = container.memory_service.list_memories(user_id)
    return APIResponse(message="Memories fetched", data=memories)
