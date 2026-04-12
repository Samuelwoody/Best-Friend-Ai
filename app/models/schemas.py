from __future__ import annotations

from datetime import datetime
from typing import List
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


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


class AgentRead(BaseEntity):
    name: str
    description: str
    owner_id: UUID


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
