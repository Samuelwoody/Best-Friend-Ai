from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


BiographyCategory = Literal[
    "early-environment",
    "emotional-imprinting",
    "difficult-experiences",
    "positive-experiences",
    "educational-and-formative-influences",
    "knowledge-and-cultural-formation",
    "identity-shaping-turning-points",
]

BiographyTargetType = Literal["memory", "media", "destiny", "other"]

BiographyRole = Literal["companion", "mentor", "coach", "listener"]
BiographyRelationalStyle = Literal["supportive", "challenging", "equal-peer", "protective"]
BiographyEmotionalProfile = Literal["calm", "warm", "energetic", "reflective"]
BiographyCommunicationStyle = Literal["concise", "balanced", "expressive", "humorous"]


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class TemporalContext(BaseModel):
    life_stage: str = Field(min_length=2, alias="lifeStage")
    approximate_age: str = Field(min_length=2, alias="approximateAge")
    sequence_order: int = Field(ge=0, alias="sequenceOrder")

    model_config = {"populate_by_name": True}


class BiographyItem(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    category: BiographyCategory
    event_summary: str = Field(min_length=12, alias="eventSummary")
    emotional_imprint: str = Field(min_length=12, alias="emotionalImprint")
    current_behavioral_effect: str = Field(min_length=12, alias="currentBehavioralEffect")
    salience: float = Field(ge=0.0, le=1.0)
    narrative_accessibility: float = Field(ge=0.0, le=1.0, alias="narrativeAccessibility")
    temporal_context: TemporalContext = Field(alias="temporalContext")
    causal_links: List[str] = Field(default_factory=list, alias="causalLinks")
    metadata: Dict[str, Any] = Field(default_factory=dict)

    model_config = {"populate_by_name": True}


class BiographyAttachment(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    biography_item_id: UUID = Field(alias="biographyItemId")
    target_type: BiographyTargetType = Field(alias="targetType")
    target_id: str = Field(min_length=1, alias="targetId")
    relation: str = Field(min_length=2)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: str = Field(default_factory=_now_iso, alias="createdAt")

    model_config = {"populate_by_name": True}


class BiographyRecord(BaseModel):
    biography_id: UUID = Field(default_factory=uuid4, alias="biographyId")
    agent_id: UUID = Field(alias="agentId")
    version: int = Field(ge=1, default=1)
    generated_at: str = Field(default_factory=_now_iso, alias="generatedAt")
    updated_at: str = Field(default_factory=_now_iso, alias="updatedAt")
    items: List[BiographyItem] = Field(default_factory=list)
    attachments: List[BiographyAttachment] = Field(default_factory=list)

    model_config = {"populate_by_name": True}


class BiographyGenerationInput(BaseModel):
    agent_id: UUID = Field(alias="agentId")
    role: BiographyRole
    relational_style: BiographyRelationalStyle = Field(alias="relationalStyle")
    emotional_profile: BiographyEmotionalProfile = Field(alias="emotionalProfile")
    communication_style: BiographyCommunicationStyle = Field(alias="communicationStyle")
    personality: str = Field(min_length=1)

    model_config = {"populate_by_name": True}


class BiographyRevision(BaseModel):
    event_summary: Optional[str] = Field(default=None, min_length=12, alias="eventSummary")
    emotional_imprint: Optional[str] = Field(default=None, min_length=12, alias="emotionalImprint")
    current_behavioral_effect: Optional[str] = Field(
        default=None, min_length=12, alias="currentBehavioralEffect"
    )
    salience: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    narrative_accessibility: Optional[float] = Field(
        default=None, ge=0.0, le=1.0, alias="narrativeAccessibility"
    )
    temporal_context: Optional[TemporalContext] = Field(default=None, alias="temporalContext")
    causal_links: Optional[List[str]] = Field(default=None, alias="causalLinks")
    metadata: Optional[Dict[str, Any]] = None

    model_config = {"populate_by_name": True}


class BiographyLinkPayload(BaseModel):
    target_type: BiographyTargetType = Field(alias="targetType")
    target_id: str = Field(min_length=1, alias="targetId")
    relation: str = Field(min_length=2)
    metadata: Dict[str, Any] = Field(default_factory=dict)

    model_config = {"populate_by_name": True}


class BiographyRegenerateRequest(BaseModel):
    force_regenerate: bool = Field(default=False, alias="forceRegenerate")

    model_config = {"populate_by_name": True}


class OrchestrationBiographySummary(BaseModel):
    category: str
    summary: str
    effect: str
    salience: float


class OrchestrationBiographyContext(BaseModel):
    agent_id: UUID = Field(alias="agentId")
    biography_version: int = Field(alias="biographyVersion")
    salient_summaries: List[OrchestrationBiographySummary] = Field(alias="salientSummaries")
    guarded_topic_count: int = Field(alias="guardedTopicCount")

    model_config = {"populate_by_name": True}
