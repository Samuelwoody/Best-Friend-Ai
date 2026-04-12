from fastapi.testclient import TestClient

from app.main import app
from app.models.schemas import ConversationCreate, MessageCreate
from app.services.container import container


client = TestClient(app)


def test_interaction_analysis_tracks_metrics_and_insights():
    conversation = container.conversation_service.create_conversation(
        ConversationCreate(
            user_id="11111111-1111-1111-1111-111111111111",
            agent_id="22222222-2222-2222-2222-222222222222",
        )
    )

    container.conversation_service.add_message(
        MessageCreate(
            conversation_id=conversation.id,
            role="user",
            content="I feel excited today and I want to plan better. Could you help me?",
        )
    )
    container.conversation_service.add_message(
        MessageCreate(
            conversation_id=conversation.id,
            role="user",
            content="I am frustrated because I missed a deadline. What should I do next?",
        )
    )
    container.conversation_service.add_message(
        MessageCreate(
            conversation_id=conversation.id,
            role="assistant",
            content="Let's break this down step by step.",
        )
    )

    response = client.get(f"/interaction-analysis/conversations/{conversation.id}")

    assert response.status_code == 200
    payload = response.json()["data"]
    assert payload["conversation_id"] == str(conversation.id)
    assert payload["analyzed_messages"] == 2
    assert len(payload["metrics"]) == 2
    assert {item["category"] for item in payload["insights"]} == {
        "emotional_shift",
        "openness",
        "engagement",
    }


def test_interaction_analysis_handles_empty_user_message_stream():
    conversation = container.conversation_service.create_conversation(
        ConversationCreate(
            user_id="33333333-3333-3333-3333-333333333333",
            agent_id="44444444-4444-4444-4444-444444444444",
        )
    )

    response = client.get(f"/interaction-analysis/conversations/{conversation.id}")

    assert response.status_code == 200
    payload = response.json()["data"]
    assert payload["analyzed_messages"] == 0
    assert payload["metrics"] == []
    assert payload["insights"][0]["category"] == "engagement"
