from uuid import UUID

from fastapi import APIRouter

from app.core.responses import APIResponse
from app.models.schemas import InteractionAnalysisReport
from app.services.container import container

router = APIRouter(prefix="/interaction-analysis", tags=["interaction-analysis"])


@router.get("/conversations/{conversation_id}", response_model=APIResponse[InteractionAnalysisReport])
def analyze_conversation(conversation_id: UUID) -> APIResponse[InteractionAnalysisReport]:
    report = container.interaction_analysis_service.analyze_conversation(conversation_id)
    return APIResponse(message="Conversation analysis generated", data=report)
