from app.models.schemas import AgentCreate, ConversationCreate, MemoryCreate, OrchestrationRequest, UserCreate
from app.services.container import ServiceContainer


def test_orchestrator_pipeline_connects_modules():
    container = ServiceContainer()

    user = container.user_service.create_user(
        UserCreate(
            email="jane@example.com",
            password="secret123",
            full_name="Jane User",
        )
    )
    agent = container.agent_service.create_agent(
        AgentCreate(
            name="Companion",
            description="Supportive assistant",
            owner_id=user.id,
        )
    )
    conversation = container.conversation_service.create_conversation(
        ConversationCreate(user_id=user.id, agent_id=agent.id)
    )
    container.memory_service.upsert_memory(
        MemoryCreate(
            user_id=user.id,
            key="travel_preference",
            value="You enjoy mountain trips during weekends",
        )
    )

    result = container.orchestrator_service.orchestrate(
        OrchestrationRequest(
            conversation_id=conversation.id,
            user_message="I am stressed but want to plan a mountain weekend.",
        )
    )

    refreshed = container.conversation_service.get_conversation(conversation.id)

    assert refreshed.messages[-2].role == "user"
    assert refreshed.messages[-1].role == "assistant"
    assert result.trace.context.agent_name == "Companion"
    assert result.trace.emotional_state.primary_emotion == "negative"
    assert result.trace.retrieved_memories
    assert result.trace.response_strategy.tone == "empathetic"
    assert result.assistant_message.id == refreshed.messages[-1].id
