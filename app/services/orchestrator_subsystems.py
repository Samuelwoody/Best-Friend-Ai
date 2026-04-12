from __future__ import annotations

from app.models.orchestration_schemas import (
    OrchestrationContext,
    OrchestrationInputPayload,
    SubsystemName,
    SubsystemOutput,
)


class MemorySubsystem:
    def run(self, payload: OrchestrationInputPayload, context: OrchestrationContext) -> SubsystemOutput:
        return SubsystemOutput(
            subsystem=SubsystemName.MEMORY_ENGINE,
            enabled=True,
            invoked=True,
            payload={
                "memory_entries": str(len(context.memory.entries)),
                "retrieval_mode": "deterministic-key-match",
            },
        )


class BiographySubsystem:
    def run(self, payload: OrchestrationInputPayload, context: OrchestrationContext) -> SubsystemOutput:
        return SubsystemOutput(
            subsystem=SubsystemName.BIOGRAPHY_ENGINE,
            enabled=True,
            invoked=True,
            payload={
                "agent_name": context.agent_profile.name,
                "persona_blend": "profile-description",
            },
        )


class AffectiveSubsystem:
    def run(self, payload: OrchestrationInputPayload, context: OrchestrationContext) -> SubsystemOutput:
        lowered = payload.user_message.lower()
        tone = "neutral"
        if any(token in lowered for token in ["sad", "anxious", "angry", "stressed"]):
            tone = "distressed"
        elif any(token in lowered for token in ["great", "happy", "excited", "love"]):
            tone = "positive"

        return SubsystemOutput(
            subsystem=SubsystemName.AFFECTIVE_ENGINE,
            enabled=True,
            invoked=True,
            payload={"detected_tone": tone, "method": "keyword-v1"},
        )


class IntentionalCoreSubsystem:
    def run(self, payload: OrchestrationInputPayload, context: OrchestrationContext) -> SubsystemOutput:
        intent = "exploratory_dialogue"
        if "?" in payload.user_message:
            intent = "question_answering"

        return SubsystemOutput(
            subsystem=SubsystemName.INTENTIONAL_CORE,
            enabled=True,
            invoked=True,
            payload={"primary_intent": intent, "policy": "intentional-core-v1"},
        )


class CounterbalanceSubsystem:
    def run(self, payload: OrchestrationInputPayload, context: OrchestrationContext) -> SubsystemOutput:
        return SubsystemOutput(
            subsystem=SubsystemName.COUNTERBALANCE_ENGINE,
            enabled=False,
            invoked=False,
            note="Counterbalance engine is gated by feature flag and awaiting production policy tuning.",
        )


class DestinySubsystem:
    def run(self, payload: OrchestrationInputPayload, context: OrchestrationContext) -> SubsystemOutput:
        return SubsystemOutput(
            subsystem=SubsystemName.DESTINY_ENGINE,
            enabled=False,
            invoked=False,
            note="Destiny engine is reserved for future long-horizon planning rollout.",
        )


class CommunicationIntelligenceSubsystem:
    def run(self, payload: OrchestrationInputPayload, context: OrchestrationContext) -> SubsystemOutput:
        verbosity = "concise" if len(payload.user_message.split()) < 15 else "detailed"
        return SubsystemOutput(
            subsystem=SubsystemName.COMMUNICATION_INTELLIGENCE,
            enabled=True,
            invoked=True,
            payload={"suggested_verbosity": verbosity, "channel": "chat"},
        )
