from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from .models import MemoryRecord
from .storage import MemoryStorage


@dataclass
class RetrievalHookInput:
    """Input envelope passed by runtime systems that need memory lookup."""

    prompt: str
    conversation_id: Optional[str] = None
    agent_id: Optional[str] = None
    min_relevance: float = 0.2
    limit: int = 10


class MemoryRetrievalHooks:
    """Runtime hooks for retrieving and formatting memories for downstream agents."""

    def __init__(self, storage: MemoryStorage) -> None:
        self.storage = storage

    def fetch(self, request: RetrievalHookInput) -> List[MemoryRecord]:
        # Basic hook: query by links + relevance, sorted for strongest contextual memories.
        return self.storage.retrieve_memories(
            conversation_id=request.conversation_id,
            agent_id=request.agent_id,
            min_relevance=request.min_relevance,
            limit=request.limit,
        )

    def render_for_prompt(self, request: RetrievalHookInput) -> str:
        memories = self.fetch(request)
        if not memories:
            return ""

        lines: List[str] = ["Relevant memory context:"]
        for m in memories:
            lines.append(
                f"- [{m.relevance_score:.2f}|w={m.emotional_weight:.2f}] {m.content}"
            )
        return "\n".join(lines)

    def ingest_event(
        self,
        *,
        content: str,
        emotional_weight: float,
        relevance_score: float,
        context: Dict[str, Any],
        conversation_id: Optional[str] = None,
        agent_id: Optional[str] = None,
    ) -> MemoryRecord:
        return self.storage.add_memory(
            content=content,
            emotional_weight=emotional_weight,
            relevance_score=relevance_score,
            context=context,
            conversation_id=conversation_id,
            agent_id=agent_id,
        )
