from __future__ import annotations

from typing import Dict, List
from uuid import UUID

from fastapi import HTTPException

from app.models.schemas import AgentCreate, AgentRead


class AgentService:
    def __init__(self) -> None:
        self._agents: Dict[UUID, AgentRead] = {}

    def create_agent(self, payload: AgentCreate) -> AgentRead:
        agent = AgentRead(**payload.model_dump())
        self._agents[agent.id] = agent
        return agent

    def get_agent(self, agent_id: UUID) -> AgentRead:
        agent = self._agents.get(agent_id)
        if agent is None:
            raise HTTPException(status_code=404, detail="Agent not found")
        return agent

    def list_agents(self) -> List[AgentRead]:
        return list(self._agents.values())
