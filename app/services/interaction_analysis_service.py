from __future__ import annotations

from dataclasses import dataclass
from statistics import mean
from typing import Iterable, List
from uuid import UUID

from app.models.schemas import (
    InteractionAnalysisInsight,
    InteractionAnalysisMetric,
    InteractionAnalysisReport,
    MessageRead,
)
from app.services.conversation_service import ConversationService


@dataclass(frozen=True)
class _SignalWeights:
    emotional_shift: float
    openness: float
    engagement: float


class InteractionAnalysisService:
    """Produces deterministic interaction analytics for a conversation."""

    _POSITIVE_TOKENS = {
        "happy",
        "excited",
        "great",
        "good",
        "love",
        "thanks",
        "thank you",
        "awesome",
    }
    _NEGATIVE_TOKENS = {
        "sad",
        "angry",
        "frustrated",
        "upset",
        "bad",
        "hate",
        "stressed",
        "anxious",
    }
    _OPENNESS_TOKENS = {
        "i feel",
        "i think",
        "because",
        "personally",
        "for me",
        "my experience",
        "i want",
    }
    _ENGAGEMENT_TOKENS = {
        "?",
        "could",
        "can",
        "how",
        "what",
        "tell me",
        "help",
    }

    def __init__(self, conversation_service: ConversationService) -> None:
        self._conversation_service = conversation_service

    def analyze_conversation(self, conversation_id: UUID) -> InteractionAnalysisReport:
        conversation = self._conversation_service.get_conversation(conversation_id)
        user_messages = [m for m in conversation.messages if m.role == "user"]

        metrics = self._build_metrics(user_messages)
        insights = self._build_insights(metrics)
        return InteractionAnalysisReport(
            conversation_id=conversation.id,
            analyzed_messages=len(user_messages),
            metrics=metrics,
            insights=insights,
        )

    def _build_metrics(self, messages: List[MessageRead]) -> List[InteractionAnalysisMetric]:
        if not messages:
            return []

        sentiment_trace: List[float] = []
        openness_trace: List[float] = []
        engagement_trace: List[float] = []

        metrics: List[InteractionAnalysisMetric] = []
        for idx, message in enumerate(messages, start=1):
            text = message.content.lower()
            sentiment_score = self._sentiment_score(text)
            openness_score = self._keyword_score(text, self._OPENNESS_TOKENS)
            engagement_score = self._engagement_score(text)

            sentiment_trace.append(sentiment_score)
            openness_trace.append(openness_score)
            engagement_trace.append(engagement_score)

            emotional_shift = self._normalize_shift(sentiment_trace)
            openness_level = self._rolling_average(openness_trace)
            engagement_level = self._rolling_average(engagement_trace)

            metrics.append(
                InteractionAnalysisMetric(
                    message_id=message.id,
                    sequence_index=idx,
                    emotional_shift=emotional_shift,
                    openness=openness_level,
                    engagement=engagement_level,
                )
            )
        return metrics

    def _build_insights(
        self, metrics: List[InteractionAnalysisMetric]
    ) -> List[InteractionAnalysisInsight]:
        if not metrics:
            return [
                InteractionAnalysisInsight(
                    category="engagement",
                    summary="No user messages are available yet; insights will be generated once interaction begins.",
                    confidence=1.0,
                )
            ]

        latest = metrics[-1]
        aggregates = _SignalWeights(
            emotional_shift=mean(m.emotional_shift for m in metrics),
            openness=mean(m.openness for m in metrics),
            engagement=mean(m.engagement for m in metrics),
        )

        return [
            self._summarize_emotional_shift(latest.emotional_shift, aggregates.emotional_shift),
            self._summarize_openness(latest.openness, aggregates.openness),
            self._summarize_engagement(latest.engagement, aggregates.engagement),
        ]

    @classmethod
    def _summarize_emotional_shift(cls, latest: float, average: float) -> InteractionAnalysisInsight:
        if latest >= 0.7:
            text = "Emotional trajectory is becoming more positive across recent messages."
        elif latest <= 0.3:
            text = "Emotional trajectory is trending negative; consider supportive follow-up prompts."
        else:
            text = "Emotional trajectory is stable with moderate variation."
        return InteractionAnalysisInsight(category="emotional_shift", summary=text, confidence=round(average, 3))

    @classmethod
    def _summarize_openness(cls, latest: float, average: float) -> InteractionAnalysisInsight:
        if latest >= 0.7:
            text = "User communication is highly open and includes personal context."
        elif latest <= 0.3:
            text = "User communication is guarded; gentle exploratory prompts may increase openness."
        else:
            text = "User openness is moderate and consistent."
        return InteractionAnalysisInsight(category="openness", summary=text, confidence=round(average, 3))

    @classmethod
    def _summarize_engagement(cls, latest: float, average: float) -> InteractionAnalysisInsight:
        if latest >= 0.7:
            text = "User engagement is high with active follow-up behavior."
        elif latest <= 0.3:
            text = "User engagement appears low; concise prompts may help re-engage."
        else:
            text = "User engagement is steady without major spikes."
        return InteractionAnalysisInsight(category="engagement", summary=text, confidence=round(average, 3))

    @classmethod
    def _sentiment_score(cls, text: str) -> float:
        positive_hits = sum(token in text for token in cls._POSITIVE_TOKENS)
        negative_hits = sum(token in text for token in cls._NEGATIVE_TOKENS)
        raw = 0.5 + ((positive_hits - negative_hits) * 0.2)
        return cls._clamp(raw)

    @classmethod
    def _keyword_score(cls, text: str, keywords: Iterable[str]) -> float:
        hits = sum(keyword in text for keyword in keywords)
        raw = 0.2 + (hits * 0.2)
        return cls._clamp(raw)

    @classmethod
    def _engagement_score(cls, text: str) -> float:
        keyword_hits = sum(keyword in text for keyword in cls._ENGAGEMENT_TOKENS)
        length_bonus = 0.2 if len(text.split()) >= 10 else 0.0
        raw = 0.2 + (keyword_hits * 0.15) + length_bonus
        return cls._clamp(raw)

    @staticmethod
    def _clamp(value: float, floor: float = 0.0, ceiling: float = 1.0) -> float:
        return round(max(floor, min(ceiling, value)), 3)

    @classmethod
    def _normalize_shift(cls, sentiment_trace: List[float]) -> float:
        if len(sentiment_trace) == 1:
            return 0.5
        drift = sentiment_trace[-1] - sentiment_trace[-2]
        return cls._clamp(0.5 + drift)

    @classmethod
    def _rolling_average(cls, values: List[float]) -> float:
        return cls._clamp(mean(values))
