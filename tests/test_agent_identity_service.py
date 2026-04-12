import pytest
from fastapi import HTTPException
from uuid import uuid4

from app.models.identity_schemas import IdentityGenerationRequest
from app.models.schemas import AgentRead
from app.services.agent_identity_service import AgentIdentityService


def _build_agent() -> AgentRead:
    return AgentRead(
        id=uuid4(),
        name="Astra",
        description="A supportive planning companion",
        owner_id=uuid4(),
    )


def test_generate_identity_is_deterministic_for_same_agent():
    service = AgentIdentityService()
    agent = _build_agent()
    request = IdentityGenerationRequest(enable_media_identity_generation=True)

    identity_first = service.generate_identity(agent, request)
    identity_second = service.generate_identity(agent, request)

    assert identity_first.image_profile.seed == identity_second.image_profile.seed
    assert identity_first.voice_profile.voice_name == identity_second.voice_profile.voice_name
    assert identity_first.voice_profile.timbre == identity_second.voice_profile.timbre


def test_prepare_media_plan_contains_image_and_voice_tasks():
    service = AgentIdentityService()
    agent = _build_agent()
    service.generate_identity(
        agent,
        IdentityGenerationRequest(enable_media_identity_generation=True),
    )

    plan = service.prepare_media_generation(agent.id)

    assert plan.contract_version == "v1"
    assert len(plan.tasks) == 2
    assert {task.task_type for task in plan.tasks} == {"image", "voice"}


def test_generate_identity_requires_feature_flag_enabled():
    service = AgentIdentityService()
    agent = _build_agent()

    with pytest.raises(HTTPException) as exc:
        service.generate_identity(
            agent,
            IdentityGenerationRequest(enable_media_identity_generation=False),
        )

    assert "feature flag" in str(exc.value.detail)
