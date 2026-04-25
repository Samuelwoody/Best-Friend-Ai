from __future__ import annotations

from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app
from app.models.biography import (
    BiographyGenerationInput,
    BiographyLinkPayload,
    BiographyRevision,
)
from app.services.biography_service import (
    BiographyEngineService,
    InMemoryBiographyRepository,
)


client = TestClient(app)


def _sample_input(agent_id=None) -> BiographyGenerationInput:
    return BiographyGenerationInput(
        agent_id=agent_id or uuid4(),
        role="mentor",
        personality="Analytical but compassionate, uses precise language and collaborative framing.",
        relational_style="supportive",
        emotional_profile="reflective",
        communication_style="balanced",
    )


def test_generates_and_stores_structured_biography_for_an_agent():
    service = BiographyEngineService(InMemoryBiographyRepository())
    payload = _sample_input()

    biography = service.generate_initial_biography(payload)

    assert biography.agent_id == payload.agent_id
    assert len(biography.items) == 7
    for item in biography.items:
        assert len(item.event_summary) >= 12
        assert len(item.emotional_imprint) >= 12
        assert len(item.current_behavioral_effect) >= 12
        assert 0.0 <= item.salience <= 1.0
        assert 0.0 <= item.narrative_accessibility <= 1.0


def test_generate_is_idempotent_per_agent():
    service = BiographyEngineService(InMemoryBiographyRepository())
    payload = _sample_input()

    first = service.generate_initial_biography(payload)
    second = service.generate_initial_biography(payload)

    assert first.biography_id == second.biography_id
    assert first.version == second.version == 1


def test_supports_revision_and_attachment_for_future_memory_or_media_linkage():
    service = BiographyEngineService(InMemoryBiographyRepository())
    payload = _sample_input()
    biography = service.generate_initial_biography(payload)
    first_item = biography.items[0]

    revised = service.revise_biography_item(
        payload.agent_id,
        first_item.id,
        revision=BiographyRevision(
            salience=0.95,
            current_behavioral_effect=(
                f"{first_item.current_behavioral_effect} Uses ritualized check-ins during user stress spikes."
            ),
        ),
    )
    assert revised.version == 2
    assert revised.items[0].metadata.get("lastRevisionReason") == "manual-revision"
    assert revised.items[0].salience == 0.95

    attached = service.attach_biography_item(
        payload.agent_id,
        first_item.id,
        payload=BiographyLinkPayload(
            target_type="memory",
            target_id="memory-episode-001",
            relation="reinforces-pattern",
        ),
    )
    assert attached.version == 3
    assert len(attached.attachments) == 1
    assert attached.attachments[0].target_type == "memory"


def test_exposes_orchestration_query_surface():
    service = BiographyEngineService(InMemoryBiographyRepository())
    payload = _sample_input()
    service.generate_initial_biography(payload)

    context = service.get_biography_for_orchestration(payload.agent_id)

    assert context is not None
    assert context.agent_id == payload.agent_id
    assert len(context.salient_summaries) > 0
    assert all(0.0 <= summary.salience <= 1.0 for summary in context.salient_summaries)


def test_biography_routes_round_trip_through_fastapi():
    agent_id = uuid4()
    body = {
        "agentId": str(agent_id),
        "role": "mentor",
        "personality": "Analytical and compassionate.",
        "relationalStyle": "supportive",
        "emotionalProfile": "reflective",
        "communicationStyle": "balanced",
    }

    create_response = client.post(
        f"/api/agents/{agent_id}/biography/generate", json=body
    )
    assert create_response.status_code == 200
    payload = create_response.json()
    assert payload["agentId"] == str(agent_id)
    assert len(payload["items"]) == 7

    get_response = client.get(f"/api/agents/{agent_id}/biography")
    assert get_response.status_code == 200

    context_response = client.get(
        f"/api/orchestration/agents/{agent_id}/biography-context"
    )
    assert context_response.status_code == 200
    assert context_response.json()["biographyVersion"] == 1


def test_biography_routes_return_404_when_missing():
    missing = uuid4()
    assert client.get(f"/api/agents/{missing}/biography").status_code == 404
    assert (
        client.get(f"/api/orchestration/agents/{missing}/biography-context").status_code
        == 404
    )
