from __future__ import annotations

from typing import Dict, List
from uuid import UUID

from fastapi import HTTPException

from app.models.schemas import ConversationCreate, ConversationRead, MessageCreate, MessageRead


class ConversationService:
    def __init__(self) -> None:
        self._conversations: Dict[UUID, ConversationRead] = {}

    def create_conversation(self, payload: ConversationCreate) -> ConversationRead:
        conversation = ConversationRead(**payload.model_dump())
        self._conversations[conversation.id] = conversation
        return conversation

    def add_message(self, payload: MessageCreate) -> MessageRead:
        conversation = self._conversations.get(payload.conversation_id)
        if conversation is None:
            raise HTTPException(status_code=404, detail="Conversation not found")

        message = MessageRead(**payload.model_dump())
        conversation.messages.append(message)
        return message

    def get_conversation(self, conversation_id: UUID) -> ConversationRead:
        conversation = self._conversations.get(conversation_id)
        if conversation is None:
            raise HTTPException(status_code=404, detail="Conversation not found")
        return conversation

    def list_conversations(self) -> List[ConversationRead]:
        return list(self._conversations.values())
