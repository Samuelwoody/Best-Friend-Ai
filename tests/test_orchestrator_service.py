from fastapi.testclient import TestClient

from app.main import app
from app.models.schemas import AgentCreate, ConversationCreate, MemoryCreate
from app.services.container import container

client = TestClient(app)


def test_orchestrator_route_builds_decision_and_context():
    agent = container.agent_service.create_agent(
        AgentCreate(
            name="Orchestrator Test Agent",
            description="Agent used for orchestration integration tests",
            owner_id="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        )
    )

    conversation = container.conversation_service.create_conversation(
        ConversationCreate(
            user_id="bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
            agent_id=agent.id,
        )
    )

    container.memory_service.upsert_memory(
        MemoryCreate(
            user_id=conversation.user_id,
            key="preferred_style",
            value="encouraging",
        )
    )

    response = client.post(
        "/chat/messages/orchestrate",
        json={
            "conversation_id": str(conversation.id),
            "role": "user",
            "content": "I feel anxious about tomorrow. Can you help me prepare?",
        },
    )

    assert response.status_code == 200
    payload = response.json()["data"]["orchestration"]

    assert payload["contract_version"] == "v1"
    assert "user_context" in payload["stages_completed"]
    assert "subsystem_routing" in payload["stages_completed"]

    selected = set(payload["decision"]["selected_subsystems"])
    assert "memory_engine" in selected
    assert "intentional_core" in selected

    outputs = payload["subsystem_outputs"]
    output_names = {item["subsystem"] for item in outputs}
    assert "communication_intelligence" in output_names
    assert "counterbalance_engine" in output_names


def test_existing_chat_add_message_route_still_works():
    conversation = container.conversation_service.create_conversation(
        ConversationCreate(
            user_id="cccccccc-cccc-cccc-cccc-cccccccccccc",
            agent_id="dddddddd-dddd-dddd-dddd-dddddddddddd",
        )
    )

    response = client.post(
        "/chat/messages",
        json={
            "conversation_id": str(conversation.id),
            "role": "user",
            "content": "Hello there",
        },
    )

    assert response.status_code == 200
    assert response.json()["data"]["content"] == "Hello there"
