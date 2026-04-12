from __future__ import annotations

from datetime import datetime
from typing import List, Literal
from uuid import UUID

from pydantic import BaseModel, Field


class ImageProfile(BaseModel):
    style: str
    palette: List[str]
    seed: int
    prompt: str
    negative_prompt: str
    aspect_ratio: Literal["1:1", "3:4", "16:9"] = "1:1"


class VoiceProfile(BaseModel):
    voice_name: str
    timbre: Literal["warm", "bright", "deep", "neutral"]
    pace: Literal["slow", "balanced", "fast"]
    pitch: Literal["low", "mid", "high"]
    expressiveness: float = Field(ge=0.0, le=1.0)
    stability: float = Field(ge=0.0, le=1.0)
    speaking_style_prompt: str


class AgentIdentity(BaseModel):
    contract_version: str = "v1"
    agent_id: UUID
    image_profile: ImageProfile
    voice_profile: VoiceProfile
    generated_at: datetime = Field(default_factory=datetime.utcnow)


class IdentityGenerationRequest(BaseModel):
    enable_media_identity_generation: bool = False
    image_style_hint: str | None = None
    voice_style_hint: str | None = None


class MediaGenerationTask(BaseModel):
    task_type: Literal["image", "voice"]
    provider: str
    model: str
    payload: dict


class MediaGenerationPlan(BaseModel):
    contract_version: str = "v1"
    agent_id: UUID
    prepared_at: datetime = Field(default_factory=datetime.utcnow)
    tasks: List[MediaGenerationTask]
