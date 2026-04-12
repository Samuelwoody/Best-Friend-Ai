from fastapi.testclient import TestClient

from app.main import app
from app.models.orchestration_schemas import InternalPartDefinition
from app.models.schemas import AgentCreate, ConversationCreate, MemoryCreate
from app.services.container import container

client = TestClient(app)


def test_orchestrator_route_builds_decision_and_context():
    agent = container.agent_service.create_agent(
        AgentCreate(
            name="Orchestrator Test Agent",
            description="Agent used for orchestration integration tests",
            owner_id="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            internal_parts=[
                InternalPartDefinition(
                    name="Protective Boundary Keeper",
                    type="protector",
                    role="Maintain relational boundaries under stress.",
                    triggers=["unsafe", "pressure", "pushed"],
                    influence_level=0.7,
                    emotional_state_interactions={"protective-anger:boundary-defense": 0.24},
                    biography_interactions=["boundary", "trust"],
                    intentional_core_interactions={"stability": 0.9, "novelty": 0.1},
                ),
                InternalPartDefinition(
                    name="Vulnerable Attachment Layer",
                    type="vulnerable",
                    role="Signals need for reassurance and closeness.",
                    triggers=["alone", "rejected", "uncertain"],
                    influence_level=0.62,
                    emotional_state_interactions={"longing:attachment-ache": 0.23},
                    biography_interactions=["loss", "distance"],
                    intentional_core_interactions={"connection": 0.88, "self_protection": 0.2},
                ),
                InternalPartDefinition(
                    name="Executive Reasoner",
                    type="logical",
                    role="Organizes uncertainty into actionable next steps.",
                    triggers=["plan", "steps", "prepare"],
                    influence_level=0.58,
                    emotional_state_interactions={"grounded-calm:regulated-presence": 0.2},
                    biography_interactions=["goal", "progress"],
                    intentional_core_interactions={"clarity": 0.9, "connection": 0.4},
                ),
            ],
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

    affective_output = next(item for item in outputs if item["subsystem"] == "affective_engine")
    assert affective_output["payload"]["baseline_profile"]["dominant_tendencies"]
    assert affective_output["payload"]["current_state"]["dominant_emotions"]
    assert affective_output["payload"]["summary"]["relational_needs"]
    assert affective_output["payload"]["trace_attachment"]["message_id"]
    assert affective_output["payload"]["trace"]["parts_influence"]

    dynamic_state = payload["context"]["dynamic_state"]
    assert dynamic_state["active_parts"]
    assert dynamic_state["internal_tension_level"] >= 0
    assert dynamic_state["active_parts_influence"]

    assert "Affective summary:" in payload["response_context"]["context_summary"]
    assert "Internal tension:" in payload["response_context"]["context_summary"]


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


def test_agent_retrieval_with_internal_parts_is_backward_compatible():
    created_agent = container.agent_service.create_agent(
        AgentCreate(
            name="Multiplicity Retrieval Agent",
            description="Validates additive internal parts retrieval.",
            owner_id="eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
            internal_parts=[
                InternalPartDefinition(
                    name="Values Vision",
                    type="idealistic",
                    role="Keeps long-horizon values salient.",
                    triggers=["future", "purpose"],
                    influence_level=0.5,
                    emotional_state_interactions={"hope:future-oriented-resolve": 0.21},
                    biography_interactions=["growth"],
                    intentional_core_interactions={"values_alignment": 0.95},
                )
            ],
        )
    )

    fetched = container.agent_service.get_agent(created_agent.id)
    assert fetched.id == created_agent.id
    assert fetched.internal_parts
    assert fetched.internal_parts[0].type == "idealistic"
