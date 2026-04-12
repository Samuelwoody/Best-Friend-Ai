from typing import List
from uuid import UUID

from fastapi import APIRouter

from app.core.responses import APIResponse
from app.models.schemas import ConversationCreate, ConversationRead, MessageCreate, MessageRead
from app.services.container import container

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/conversations", response_model=APIResponse[ConversationRead])
def create_conversation(payload: ConversationCreate) -> APIResponse[ConversationRead]:
    conversation = container.conversation_service.create_conversation(payload)
    return APIResponse(message="Conversation created", data=conversation)


@router.post("/messages", response_model=APIResponse[MessageRead])
def add_message(payload: MessageCreate) -> APIResponse[MessageRead]:
    message = container.conversation_service.add_message(payload)
    return APIResponse(message="Message added", data=message)


@router.get("/conversations", response_model=APIResponse[List[ConversationRead]])
def list_conversations() -> APIResponse[List[ConversationRead]]:
    conversations = container.conversation_service.list_conversations()
    return APIResponse(message="Conversations fetched", data=conversations)


@router.get("/conversations/{conversation_id}", response_model=APIResponse[ConversationRead])
def get_conversation(conversation_id: UUID) -> APIResponse[ConversationRead]:
    conversation = container.conversation_service.get_conversation(conversation_id)
    return APIResponse(message="Conversation fetched", data=conversation)
