from __future__ import annotations

from app.models.orchestration_schemas import (
    AffectiveComputationResult,
    OrchestrationContext,
    OrchestrationInputPayload,
    SubsystemName,
    SubsystemOutput,
)
from app.services.affective_phenomenology_engine import AffectivePhenomenologyEngine


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
    def __init__(self, engine: AffectivePhenomenologyEngine | None = None) -> None:
        self._engine = engine or AffectivePhenomenologyEngine()

    def run(self, payload: OrchestrationInputPayload, context: OrchestrationContext) -> SubsystemOutput:
        result: AffectiveComputationResult = self._engine.compute_current_emotional_state(payload, context)
        summary = self._engine.build_orchestrator_summary(result)
        trace_attachment = self._engine.attach_affective_trace(payload, result)

        return SubsystemOutput(
            subsystem=SubsystemName.AFFECTIVE_ENGINE,
            enabled=True,
            invoked=True,
            payload={
                "baseline_profile": result.baseline_profile.model_dump(),
                "current_state": result.current_state.model_dump(),
                "summary": summary,
                "trace": result.trace.model_dump(),
                "trace_attachment": trace_attachment,
            },
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
