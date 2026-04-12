from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, Optional


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass(frozen=True)
class MemoryRecord:
    """Structured memory record stored in the persistence layer."""

    id: str
    content: str
    emotional_weight: float
    relevance_score: float
    context: Dict[str, Any]
    conversation_id: Optional[str]
    agent_id: Optional[str]
    created_at: str
    updated_at: str


@dataclass(frozen=True)
class Conversation:
    id: str
    title: Optional[str]
    created_at: str


@dataclass(frozen=True)
class Agent:
    id: str
    name: Optional[str]
    created_at: str
