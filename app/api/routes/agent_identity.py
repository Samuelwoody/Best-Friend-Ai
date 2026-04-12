from uuid import UUID

from fastapi import APIRouter

from app.core.responses import APIResponse
from app.models.identity_schemas import AgentIdentity, IdentityGenerationRequest, MediaGenerationPlan
from app.services.container import container

router = APIRouter(prefix="/agents", tags=["agent-identity"])


@router.post("/{agent_id}/identity/generate", response_model=APIResponse[AgentIdentity])
def generate_agent_identity(
    agent_id: UUID,
    payload: IdentityGenerationRequest,
) -> APIResponse[AgentIdentity]:
    agent = container.agent_service.get_agent(agent_id)
    identity = container.agent_identity_service.generate_identity(agent, payload)
    return APIResponse(message="Agent audiovisual identity generated", data=identity)


@router.get("/{agent_id}/identity", response_model=APIResponse[AgentIdentity])
def get_agent_identity(agent_id: UUID) -> APIResponse[AgentIdentity]:
    identity = container.agent_identity_service.get_identity(agent_id)
    return APIResponse(message="Agent audiovisual identity fetched", data=identity)


@router.post("/{agent_id}/identity/media-plan", response_model=APIResponse[MediaGenerationPlan])
def prepare_media_generation(agent_id: UUID) -> APIResponse[MediaGenerationPlan]:
    media_plan = container.agent_identity_service.prepare_media_generation(agent_id)
    return APIResponse(message="Media generation plan prepared", data=media_plan)
