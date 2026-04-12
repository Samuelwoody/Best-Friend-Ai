from __future__ import annotations

from hashlib import sha256
from typing import Dict
from uuid import UUID

from fastapi import HTTPException

from app.models.identity_schemas import (
    AgentIdentity,
    IdentityGenerationRequest,
    ImageProfile,
    MediaGenerationPlan,
    MediaGenerationTask,
    VoiceProfile,
)
from app.models.schemas import AgentRead


class AgentIdentityService:
    """Generates and stores deterministic audiovisual identity artifacts per agent."""

    def __init__(self) -> None:
        self._identities: Dict[UUID, AgentIdentity] = {}

    def generate_identity(self, agent: AgentRead, request: IdentityGenerationRequest) -> AgentIdentity:
        if not request.enable_media_identity_generation:
            raise HTTPException(
                status_code=403,
                detail=(
                    "Identity generation is gated by enable_media_identity_generation feature flag"
                ),
            )

        image_profile = self._build_image_profile(agent, request.image_style_hint)
        voice_profile = self._build_voice_profile(agent, request.voice_style_hint)
        identity = AgentIdentity(
            agent_id=agent.id,
            image_profile=image_profile,
            voice_profile=voice_profile,
        )
        self._identities[agent.id] = identity
        return identity

    def get_identity(self, agent_id: UUID) -> AgentIdentity:
        identity = self._identities.get(agent_id)
        if identity is None:
            raise HTTPException(status_code=404, detail="Agent identity not found")
        return identity

    def prepare_media_generation(self, agent_id: UUID) -> MediaGenerationPlan:
        identity = self.get_identity(agent_id)
        image_task = MediaGenerationTask(
            task_type="image",
            provider="internal.media.image",
            model="portrait-diffusion-v1",
            payload={
                "prompt": identity.image_profile.prompt,
                "negative_prompt": identity.image_profile.negative_prompt,
                "seed": identity.image_profile.seed,
                "aspect_ratio": identity.image_profile.aspect_ratio,
                "palette": identity.image_profile.palette,
            },
        )
        voice_task = MediaGenerationTask(
            task_type="voice",
            provider="internal.media.voice",
            model="voice-synthesis-v1",
            payload={
                "voice_name": identity.voice_profile.voice_name,
                "timbre": identity.voice_profile.timbre,
                "pace": identity.voice_profile.pace,
                "pitch": identity.voice_profile.pitch,
                "expressiveness": identity.voice_profile.expressiveness,
                "stability": identity.voice_profile.stability,
                "style_prompt": identity.voice_profile.speaking_style_prompt,
            },
        )
        return MediaGenerationPlan(agent_id=agent_id, tasks=[image_task, voice_task])

    def _build_image_profile(self, agent: AgentRead, image_style_hint: str | None) -> ImageProfile:
        style = image_style_hint or "cinematic-friendly-portrait"
        digest = sha256(f"{agent.id}:{agent.name}:image".encode("utf-8")).hexdigest()
        seed = int(digest[:8], 16)
        palette = [f"#{digest[idx:idx + 6]}" for idx in (8, 14, 20)]
        prompt = (
            f"Professional portrait of {agent.name}, {agent.description}. "
            f"Visual style: {style}. Use colors {', '.join(palette)}."
        )
        return ImageProfile(
            style=style,
            seed=seed,
            palette=palette,
            prompt=prompt,
            negative_prompt="blurry, distorted face, low quality, text artifacts",
        )

    def _build_voice_profile(self, agent: AgentRead, voice_style_hint: str | None) -> VoiceProfile:
        voice_hint = voice_style_hint or "supportive-and-clear"
        digest = sha256(f"{agent.id}:{agent.name}:voice".encode("utf-8")).hexdigest()

        timbre_options = ["warm", "bright", "deep", "neutral"]
        pace_options = ["slow", "balanced", "fast"]
        pitch_options = ["low", "mid", "high"]
        timbre = timbre_options[int(digest[0:2], 16) % len(timbre_options)]
        pace = pace_options[int(digest[2:4], 16) % len(pace_options)]
        pitch = pitch_options[int(digest[4:6], 16) % len(pitch_options)]

        expressiveness = round((int(digest[6:8], 16) / 255), 2)
        stability = round((int(digest[8:10], 16) / 255), 2)

        return VoiceProfile(
            voice_name=f"{agent.name.lower().replace(' ', '-')}-voice-v1",
            timbre=timbre,
            pace=pace,
            pitch=pitch,
            expressiveness=expressiveness,
            stability=stability,
            speaking_style_prompt=(
                f"Speak as {agent.name} in a {voice_hint} manner while staying concise and empathetic."
            ),
        )
