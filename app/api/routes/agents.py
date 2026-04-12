from typing import List
from uuid import UUID

from fastapi import APIRouter

from app.core.responses import APIResponse
from app.models.schemas import AgentCreate, AgentRead
from app.services.container import container

router = APIRouter(prefix="/agents", tags=["agents"])


@router.post("", response_model=APIResponse[AgentRead])
def create_agent(payload: AgentCreate) -> APIResponse[AgentRead]:
    agent = container.agent_service.create_agent(payload)
    return APIResponse(message="Agent created", data=agent)


@router.get("", response_model=APIResponse[List[AgentRead]])
def list_agents() -> APIResponse[List[AgentRead]]:
    agents = container.agent_service.list_agents()
    return APIResponse(message="Agents fetched", data=agents)


@router.get("/{agent_id}", response_model=APIResponse[AgentRead])
def get_agent(agent_id: UUID) -> APIResponse[AgentRead]:
    agent = container.agent_service.get_agent(agent_id)
    return APIResponse(message="Agent fetched", data=agent)
