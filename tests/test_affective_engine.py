from uuid import uuid4

from app.models.orchestration_schemas import (
    AgentProfileContext,
    ConversationContext,
    DynamicInternalState,
    MemoryContext,
    OrchestrationContext,
    OrchestrationInputPayload,
    UserContext,
)
from app.services.affective_phenomenology_engine import AffectivePhenomenologyEngine


def _build_context() -> OrchestrationContext:
    return OrchestrationContext(
        user=UserContext(user_id=uuid4()),
        agent_profile=AgentProfileContext(
            agent_id=uuid4(),
            name="Ari",
            description="Warm mentor focused on growth, safe reflection, and resilient recovery after loss.",
        ),
        conversation=ConversationContext(
            conversation_id=uuid4(),
            total_messages=14,
            recent_messages=["user:I feel anxious about tomorrow"],
        ),
        memory=MemoryContext(
            entries={
                "coping_strategy": "breathing and meditation",
                "life_event": "recent loss and bereavement",
                "goal": "consistent progress at work",
            }
        ),
        dynamic_state=DynamicInternalState(
            conversation_message_count=14,
            latest_role="user",
        ),
    )


def test_affective_engine_composes_mixed_state_and_trace_deterministically():
    engine = AffectivePhenomenologyEngine()
    context = _build_context()
    payload = OrchestrationInputPayload(
        conversation_id=context.conversation.conversation_id,
        user_id=context.user.user_id,
        agent_id=context.agent_profile.agent_id,
        message_id=uuid4(),
        user_message="I am anxious and I miss my old home, but I also want to keep going.",
        metadata={"internal_parts": "protector, planner"},
    )

    result_a = engine.compute_current_emotional_state(payload, context)
    result_b = engine.compute_current_emotional_state(payload, context)

    assert result_a.model_dump() == result_b.model_dump()
    assert result_a.current_state.dominant_emotions
    assert result_a.current_state.mixed_emotions
    assert result_a.current_state.relational_needs
    assert "shame" in result_a.baseline_profile.avoided_emotions

    summary = engine.build_orchestrator_summary(result_a)
    assert summary["atlas_version"] == "v1"
    assert summary["dominant"]

    attachment = engine.attach_affective_trace(payload, result_a)
    assert attachment["message_id"] == str(payload.message_id)
    assert attachment["dominant_labels"]
