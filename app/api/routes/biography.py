from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, HTTPException

from app.models.biography import (
    BiographyGenerationInput,
    BiographyLinkPayload,
    BiographyRecord,
    BiographyRevision,
    OrchestrationBiographyContext,
)
from app.services.container import container


router = APIRouter(tags=["biography"])


@router.post("/agents/{agent_id}/biography/generate", response_model=BiographyRecord)
def generate_biography(agent_id: UUID, payload: BiographyGenerationInput) -> BiographyRecord:
    if payload.agent_id != agent_id:
        raise HTTPException(
            status_code=400,
            detail="Path agent_id does not match payload.agent_id.",
        )
    return container.biography_engine.generate_initial_biography(payload)


@router.get("/agents/{agent_id}/biography", response_model=BiographyRecord)
def get_biography(agent_id: UUID) -> BiographyRecord:
    biography = container.biography_engine.get_biography(agent_id)
    if biography is None:
        raise HTTPException(status_code=404, detail="Biography not found")
    return biography


@router.patch(
    "/agents/{agent_id}/biography/items/{item_id}",
    response_model=BiographyRecord,
)
def revise_biography_item(
    agent_id: UUID, item_id: UUID, revision: BiographyRevision
) -> BiographyRecord:
    try:
        return container.biography_engine.revise_biography_item(agent_id, item_id, revision)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post(
    "/agents/{agent_id}/biography/items/{item_id}/attachments",
    response_model=BiographyRecord,
    status_code=201,
)
def attach_biography_item(
    agent_id: UUID, item_id: UUID, payload: BiographyLinkPayload
) -> BiographyRecord:
    try:
        return container.biography_engine.attach_biography_item(agent_id, item_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get(
    "/orchestration/agents/{agent_id}/biography-context",
    response_model=OrchestrationBiographyContext,
)
def get_biography_context(agent_id: UUID) -> OrchestrationBiographyContext:
    context = container.biography_engine.get_biography_for_orchestration(agent_id)
    if context is None:
        raise HTTPException(status_code=404, detail="Biography context not found")
    return context
