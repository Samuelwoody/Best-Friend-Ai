from __future__ import annotations

from typing import List
from uuid import UUID

from app.models.schemas import (
    EmotionalState,
    MessageCreate,
    MessageRead,
    OrchestrationContext,
    OrchestrationRequest,
    OrchestrationResult,
    OrchestrationTrace,
    ResponseStrategy,
    RetrievedMemory,
)
from app.services.agent_service import AgentService
from app.services.conversation_service import ConversationService
from app.services.memory_service import MemoryService


class OrchestratorService:
    """Coordinates response generation pipeline across conversation, memory, and agent modules."""

    def __init__(
        self,
        conversation_service: ConversationService,
        memory_service: MemoryService,
        agent_service: AgentService,
    ) -> None:
        self._conversation_service = conversation_service
        self._memory_service = memory_service
        self._agent_service = agent_service

    def orchestrate(self, payload: OrchestrationRequest) -> OrchestrationResult:
        """Run deterministic orchestration pipeline and persist user/assistant messages."""
        conversation = self._conversation_service.get_conversation(payload.conversation_id)

        user_message = self._conversation_service.add_message(
            MessageCreate(
                conversation_id=payload.conversation_id,
                content=payload.user_message,
                role="user",
            )
        )
        context = self._gather_context(conversation.id, conversation.user_id, conversation.agent_id)
        memories = self._retrieve_memory(context.user_id, payload.user_message)
        emotional_state = self._infer_emotional_state(payload.user_message)
        strategy = self._build_response_strategy(emotional_state, memories)

        assistant_content = self._compose_response(payload.user_message, context, memories, strategy)
        assistant_message = self._conversation_service.add_message(
            MessageCreate(
                conversation_id=payload.conversation_id,
                content=assistant_content,
                role="assistant",
            )
        )

        return OrchestrationResult(
            assistant_message=assistant_message,
            trace=OrchestrationTrace(
                context=context,
                retrieved_memories=memories,
                emotional_state=emotional_state,
                response_strategy=strategy,
            ),
            metadata={
                "pipeline_version": "v1",
                "created_user_message_id": str(user_message.id),
                "created_assistant_message_id": str(assistant_message.id),
            },
        )

    def _gather_context(self, conversation_id: UUID, user_id: UUID, agent_id: UUID) -> OrchestrationContext:
        conversation = self._conversation_service.get_conversation(conversation_id)
        agent = self._agent_service.get_agent(agent_id)

        return OrchestrationContext(
            conversation_id=conversation.id,
            user_id=user_id,
            agent_id=agent_id,
            agent_name=agent.name,
            recent_messages=conversation.messages[-5:],
        )

    def _retrieve_memory(self, user_id: UUID, message: str) -> List[RetrievedMemory]:
        query_tokens = {token.lower() for token in message.split() if token.strip()}
        ranked: List[RetrievedMemory] = []

        for memory in self._memory_service.list_memories(user_id):
            memory_tokens = {token.lower() for token in f"{memory.key} {memory.value}".split() if token.strip()}
            overlap = query_tokens.intersection(memory_tokens)
            score = len(overlap) / max(len(query_tokens), 1)
            if score > 0:
                ranked.append(
                    RetrievedMemory(
                        key=memory.key,
                        value=memory.value,
                        relevance_score=round(score, 3),
                    )
                )

        ranked.sort(key=lambda item: item.relevance_score, reverse=True)
        return ranked[:3]

    def _infer_emotional_state(self, message: str) -> EmotionalState:
        lowered = message.lower()
        negative_tokens = {"sad", "angry", "upset", "anxious", "stressed", "worried", "hate"}
        positive_tokens = {"happy", "great", "excited", "love", "good", "grateful", "confident"}

        neg_count = sum(1 for token in negative_tokens if token in lowered)
        pos_count = sum(1 for token in positive_tokens if token in lowered)

        if neg_count > pos_count:
            intensity = min(1.0, 0.3 + (0.1 * neg_count))
            return EmotionalState(
                primary_emotion="negative",
                intensity=round(intensity, 2),
                rationale="Detected negatively charged vocabulary in user input.",
            )

        if pos_count > neg_count:
            intensity = min(1.0, 0.3 + (0.1 * pos_count))
            return EmotionalState(
                primary_emotion="positive",
                intensity=round(intensity, 2),
                rationale="Detected positive sentiment indicators in user input.",
            )

        return EmotionalState(
            primary_emotion="neutral",
            intensity=0.25,
            rationale="No strong sentiment markers detected.",
        )

    def _build_response_strategy(
        self,
        emotional_state: EmotionalState,
        memories: List[RetrievedMemory],
    ) -> ResponseStrategy:
        if emotional_state.primary_emotion == "negative":
            tone = "empathetic"
            goals = [
                "acknowledge_emotion",
                "provide_stabilizing_guidance",
                "invite_clarification",
            ]
        elif emotional_state.primary_emotion == "positive":
            tone = "encouraging"
            goals = ["reinforce_progress", "offer_next_step"]
        else:
            tone = "balanced"
            goals = ["answer_directly", "offer_optional_follow_up"]

        if memories:
            goals.append("ground_in_user_memory")

        return ResponseStrategy(
            tone=tone,
            goals=goals,
            safety_notes=[
                "Avoid unsupported claims.",
                "Do not expose private memory keys that are not relevant.",
            ],
        )

    def _compose_response(
        self,
        user_message: str,
        context: OrchestrationContext,
        memories: List[RetrievedMemory],
        strategy: ResponseStrategy,
    ) -> str:
        memory_hint = ""
        if memories:
            memory_hint = f" I remember you mentioned: {memories[0].value}."

        if strategy.tone == "empathetic":
            return (
                f"I hear you. {user_message.strip()} sounds important, and I want to help.{memory_hint} "
                "Would you like to start with one small next step together?"
            )

        if strategy.tone == "encouraging":
            return (
                f"That is great momentum. {user_message.strip()} shows positive progress.{memory_hint} "
                "If you want, I can help you turn this into a concrete plan."
            )

        return (
            f"Thanks for sharing. Based on what you said, here is a practical response:{memory_hint} "
            "I can also provide a deeper breakdown if that would help."
        )
