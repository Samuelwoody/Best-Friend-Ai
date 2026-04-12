from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class OrchestrationStage(str, Enum):
    USER_CONTEXT = "user_context"
    AGENT_PROFILE_CONTEXT = "agent_profile_context"
    CONVERSATION_CONTEXT = "conversation_context"
    MEMORY_CONTEXT = "memory_context"
    DYNAMIC_INTERNAL_STATE = "dynamic_internal_state"
    SUBSYSTEM_ROUTING = "subsystem_routing"
    RESPONSE_CONTEXT_ASSEMBLY = "response_context_assembly"


class SubsystemName(str, Enum):
    MEMORY_ENGINE = "memory_engine"
    BIOGRAPHY_ENGINE = "biography_engine"
    AFFECTIVE_ENGINE = "affective_engine"
    INTENTIONAL_CORE = "intentional_core"
    COUNTERBALANCE_ENGINE = "counterbalance_engine"
    DESTINY_ENGINE = "destiny_engine"
    COMMUNICATION_INTELLIGENCE = "communication_intelligence"


class FeatureFlags(BaseModel):
    enable_orchestrator_core: bool = True
    enable_memory_engine: bool = True
    enable_biography_engine: bool = True
    enable_affective_engine: bool = True
    enable_intentional_core: bool = True
    enable_counterbalance_engine: bool = False
    enable_destiny_engine: bool = False
    enable_communication_intelligence_hooks: bool = True


class OrchestrationInputPayload(BaseModel):
    conversation_id: UUID
    user_id: UUID
    agent_id: UUID
    message_id: UUID
    user_message: str
    requested_capabilities: List[SubsystemName] = Field(default_factory=list)
    metadata: Dict[str, str] = Field(default_factory=dict)


class UserContext(BaseModel):
    user_id: UUID


class AgentProfileContext(BaseModel):
    agent_id: UUID
    name: str
    description: str


class ConversationContext(BaseModel):
    conversation_id: UUID
    total_messages: int
    recent_messages: List[str] = Field(default_factory=list)


class MemoryContext(BaseModel):
    entries: Dict[str, str] = Field(default_factory=dict)


class DynamicInternalState(BaseModel):
    timestamp_utc: datetime = Field(default_factory=datetime.utcnow)
    conversation_message_count: int
    latest_role: str


class SubsystemOutput(BaseModel):
    subsystem: SubsystemName
    enabled: bool
    invoked: bool
    contract_version: str = "v1"
    payload: Dict[str, str] = Field(default_factory=dict)
    note: Optional[str] = None


class OrchestrationContext(BaseModel):
    user: UserContext
    agent_profile: AgentProfileContext
    conversation: ConversationContext
    memory: MemoryContext
    dynamic_state: DynamicInternalState


class OrchestrationDecisionResult(BaseModel):
    selected_subsystems: List[SubsystemName] = Field(default_factory=list)
    skipped_subsystems: List[SubsystemName] = Field(default_factory=list)
    rationale: str


class FinalAssembledResponseContext(BaseModel):
    user_message: str
    context_summary: str
    subsystem_outputs: List[SubsystemOutput] = Field(default_factory=list)


class OrchestrationResult(BaseModel):
    contract_version: str = "v1"
    stages_completed: List[OrchestrationStage] = Field(default_factory=list)
    context: OrchestrationContext
    decision: OrchestrationDecisionResult
    subsystem_outputs: List[SubsystemOutput] = Field(default_factory=list)
    response_context: FinalAssembledResponseContext


class ChatOrchestrationEnvelope(BaseModel):
    message_id: UUID
    conversation_id: UUID
    orchestration: OrchestrationResult
