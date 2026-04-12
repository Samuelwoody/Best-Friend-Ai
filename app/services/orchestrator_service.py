from __future__ import annotations

from typing import Dict, List

from app.models.orchestration_schemas import (
    AgentProfileContext,
    ConversationContext,
    DynamicInternalState,
    FeatureFlags,
    FinalAssembledResponseContext,
    MemoryContext,
    OrchestrationContext,
    OrchestrationDecisionResult,
    OrchestrationInputPayload,
    OrchestrationResult,
    OrchestrationStage,
    SubsystemName,
    SubsystemOutput,
    UserContext,
)
from app.services.agent_service import AgentService
from app.services.conversation_service import ConversationService
from app.services.memory_service import MemoryService
from app.services.orchestration_interfaces import (
    AffectiveEngine,
    BiographyEngine,
    CommunicationIntelligenceHook,
    CounterbalanceEngine,
    DestinyEngine,
    IntentionalCore,
    MemoryEngine,
)


class OrchestratorService:
    """Central orchestration layer for routing subsystem context used by response generation."""

    def __init__(
        self,
        conversation_service: ConversationService,
        memory_service: MemoryService,
        agent_service: AgentService,
        memory_engine: MemoryEngine,
        biography_engine: BiographyEngine,
        affective_engine: AffectiveEngine,
        intentional_core: IntentionalCore,
        counterbalance_engine: CounterbalanceEngine,
        destiny_engine: DestinyEngine,
        communication_hook: CommunicationIntelligenceHook,
        feature_flags: FeatureFlags | None = None,
    ) -> None:
        self._conversation_service = conversation_service
        self._memory_service = memory_service
        self._agent_service = agent_service
        self._engines: Dict[SubsystemName, object] = {
            SubsystemName.MEMORY_ENGINE: memory_engine,
            SubsystemName.BIOGRAPHY_ENGINE: biography_engine,
            SubsystemName.AFFECTIVE_ENGINE: affective_engine,
            SubsystemName.INTENTIONAL_CORE: intentional_core,
            SubsystemName.COUNTERBALANCE_ENGINE: counterbalance_engine,
            SubsystemName.DESTINY_ENGINE: destiny_engine,
            SubsystemName.COMMUNICATION_INTELLIGENCE: communication_hook,
        }
        self._feature_flags = feature_flags or FeatureFlags()

    def orchestrate(self, payload: OrchestrationInputPayload) -> OrchestrationResult:
        stages: List[OrchestrationStage] = []

        context = self._build_context(payload)
        stages.extend(
            [
                OrchestrationStage.USER_CONTEXT,
                OrchestrationStage.AGENT_PROFILE_CONTEXT,
                OrchestrationStage.CONVERSATION_CONTEXT,
                OrchestrationStage.MEMORY_CONTEXT,
                OrchestrationStage.DYNAMIC_INTERNAL_STATE,
            ]
        )

        decision = self._make_decision(payload)
        stages.append(OrchestrationStage.SUBSYSTEM_ROUTING)

        subsystem_outputs = self._invoke_subsystems(payload, context, decision.selected_subsystems)
        response_context = self._assemble_response_context(payload, context, subsystem_outputs)
        stages.append(OrchestrationStage.RESPONSE_CONTEXT_ASSEMBLY)

        return OrchestrationResult(
            stages_completed=stages,
            context=context,
            decision=decision,
            subsystem_outputs=subsystem_outputs,
            response_context=response_context,
        )

    def _build_context(self, payload: OrchestrationInputPayload) -> OrchestrationContext:
        conversation = self._conversation_service.get_conversation(payload.conversation_id)
        agent = self._agent_service.get_agent(payload.agent_id)
        memories = self._memory_service.list_memories(payload.user_id)

        recent_messages = [f"{m.role}:{m.content}" for m in conversation.messages[-5:]]
        memory_entries = {memory.key: memory.value for memory in memories}

        return OrchestrationContext(
            user=UserContext(user_id=payload.user_id),
            agent_profile=AgentProfileContext(
                agent_id=agent.id,
                name=agent.name,
                description=agent.description,
            ),
            conversation=ConversationContext(
                conversation_id=conversation.id,
                total_messages=len(conversation.messages),
                recent_messages=recent_messages,
            ),
            memory=MemoryContext(entries=memory_entries),
            dynamic_state=DynamicInternalState(
                conversation_message_count=len(conversation.messages),
                latest_role=conversation.messages[-1].role if conversation.messages else "system",
            ),
        )

    def _make_decision(self, payload: OrchestrationInputPayload) -> OrchestrationDecisionResult:
        candidate_subsystems = payload.requested_capabilities or [
            SubsystemName.MEMORY_ENGINE,
            SubsystemName.BIOGRAPHY_ENGINE,
            SubsystemName.AFFECTIVE_ENGINE,
            SubsystemName.INTENTIONAL_CORE,
            SubsystemName.COUNTERBALANCE_ENGINE,
            SubsystemName.DESTINY_ENGINE,
            SubsystemName.COMMUNICATION_INTELLIGENCE,
        ]

        selected: List[SubsystemName] = []
        skipped: List[SubsystemName] = []

        for subsystem in candidate_subsystems:
            if self._is_enabled(subsystem):
                selected.append(subsystem)
            else:
                skipped.append(subsystem)

        return OrchestrationDecisionResult(
            selected_subsystems=selected,
            skipped_subsystems=skipped,
            rationale=(
                "Subsystems are selected using capability request and feature-flag gating; "
                "disabled engines are intentionally skipped to preserve deterministic routing."
            ),
        )

    def _invoke_subsystems(
        self,
        payload: OrchestrationInputPayload,
        context: OrchestrationContext,
        selected_subsystems: List[SubsystemName],
    ) -> List[SubsystemOutput]:
        outputs: List[SubsystemOutput] = []
        for subsystem in selected_subsystems:
            runner = self._engines[subsystem]
            output = runner.run(payload, context)
            outputs.append(output)

        for subsystem in [SubsystemName.COUNTERBALANCE_ENGINE, SubsystemName.DESTINY_ENGINE]:
            if subsystem not in selected_subsystems:
                runner = self._engines[subsystem]
                outputs.append(runner.run(payload, context))

        return outputs

    def _assemble_response_context(
        self,
        payload: OrchestrationInputPayload,
        context: OrchestrationContext,
        subsystem_outputs: List[SubsystemOutput],
    ) -> FinalAssembledResponseContext:
        affective_summary = self._extract_affective_summary(subsystem_outputs)
        summary = (
            f"Agent '{context.agent_profile.name}' handling conversation {context.conversation.conversation_id}; "
            f"{context.conversation.total_messages} total messages, "
            f"{len(context.memory.entries)} memory entries available. "
            f"Affective summary: {affective_summary}"
        )
        return FinalAssembledResponseContext(
            user_message=payload.user_message,
            context_summary=summary,
            subsystem_outputs=subsystem_outputs,
        )


    def _extract_affective_summary(self, subsystem_outputs: List[SubsystemOutput]) -> str:
        for output in subsystem_outputs:
            if output.subsystem != SubsystemName.AFFECTIVE_ENGINE:
                continue

            summary = output.payload.get("summary")
            if isinstance(summary, dict):
                dominant = summary.get("dominant", [])
                regulation = summary.get("regulation_style", "unknown")
                if isinstance(dominant, list) and dominant:
                    return f"dominant={','.join(dominant)}; regulation={regulation}"
                return f"regulation={regulation}"

        return "not-available"

    def _is_enabled(self, subsystem: SubsystemName) -> bool:
        if not self._feature_flags.enable_orchestrator_core:
            return False

        return {
            SubsystemName.MEMORY_ENGINE: self._feature_flags.enable_memory_engine,
            SubsystemName.BIOGRAPHY_ENGINE: self._feature_flags.enable_biography_engine,
            SubsystemName.AFFECTIVE_ENGINE: self._feature_flags.enable_affective_engine,
            SubsystemName.INTENTIONAL_CORE: self._feature_flags.enable_intentional_core,
            SubsystemName.COUNTERBALANCE_ENGINE: self._feature_flags.enable_counterbalance_engine,
            SubsystemName.DESTINY_ENGINE: self._feature_flags.enable_destiny_engine,
            SubsystemName.COMMUNICATION_INTELLIGENCE: self._feature_flags.enable_communication_intelligence_hooks,
        }[subsystem]
