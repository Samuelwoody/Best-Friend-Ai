from __future__ import annotations

from datetime import datetime
from typing import Dict, List, Literal
from uuid import UUID, uuid4

from pydantic import BaseModel, Field

from app.models.orchestration_schemas import InternalPartDefinition

class BaseEntity(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str


class UserRead(BaseEntity):
    email: str
    full_name: str


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AgentCreate(BaseModel):
    name: str
    description: str
    owner_id: UUID
    internal_parts: List[InternalPartDefinition] = Field(default_factory=list)


class AgentRead(BaseEntity):
    name: str
    description: str
    owner_id: UUID
    internal_parts: List[InternalPartDefinition] = Field(default_factory=list)


class ConversationCreate(BaseModel):
    user_id: UUID
    agent_id: UUID


class MessageCreate(BaseModel):
    conversation_id: UUID
    content: str
    role: str = "user"


class MessageRead(BaseEntity):
    conversation_id: UUID
    content: str
    role: str


class ConversationRead(BaseEntity):
    user_id: UUID
    agent_id: UUID
    messages: List[MessageRead] = Field(default_factory=list)


class MemoryCreate(BaseModel):
    user_id: UUID
    key: str
    value: str


class MemoryRead(BaseEntity):
    user_id: UUID
    key: str
    value: str


class OrchestrationRequest(BaseModel):
    conversation_id: UUID
    user_message: str


class OrchestrationContext(BaseModel):
    conversation_id: UUID
    user_id: UUID
    agent_id: UUID
    agent_name: str
    recent_messages: List[MessageRead] = Field(default_factory=list)


class RetrievedMemory(BaseModel):
    key: str
    value: str
    relevance_score: float


class EmotionalState(BaseModel):
    primary_emotion: Literal["positive", "neutral", "negative"]
    intensity: float = Field(ge=0.0, le=1.0)
    rationale: str


class ResponseStrategy(BaseModel):
    tone: Literal["empathetic", "encouraging", "informational", "balanced"]
    goals: List[str] = Field(default_factory=list)
    safety_notes: List[str] = Field(default_factory=list)


class OrchestrationTrace(BaseModel):
    context: OrchestrationContext
    retrieved_memories: List[RetrievedMemory] = Field(default_factory=list)
    emotional_state: EmotionalState
    response_strategy: ResponseStrategy


class OrchestrationResult(BaseModel):
    assistant_message: MessageRead
    trace: OrchestrationTrace
    metadata: Dict[str, str] = Field(default_factory=dict)


class InteractionAnalysisMetric(BaseModel):
    message_id: UUID
    sequence_index: int
    emotional_shift: float
    openness: float
    engagement: float


class InteractionAnalysisInsight(BaseModel):
    category: str
    summary: str
    confidence: float


class InteractionAnalysisReport(BaseModel):
    conversation_id: UUID
    analyzed_messages: int
    metrics: List[InteractionAnalysisMetric] = Field(default_factory=list)
    insights: List[InteractionAnalysisInsight] = Field(default_factory=list)
