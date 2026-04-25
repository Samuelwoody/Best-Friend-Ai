from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, List, Optional, Protocol
from uuid import UUID, uuid4

from app.models.biography import (
    BiographyAttachment,
    BiographyCategory,
    BiographyGenerationInput,
    BiographyItem,
    BiographyLinkPayload,
    BiographyRecord,
    BiographyRevision,
    OrchestrationBiographyContext,
    OrchestrationBiographySummary,
    TemporalContext,
)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class BiographyRepository(Protocol):
    def get_by_agent_id(self, agent_id: UUID) -> Optional[BiographyRecord]:
        ...

    def save(self, record: BiographyRecord) -> BiographyRecord:
        ...


class InMemoryBiographyRepository:
    def __init__(self) -> None:
        self._records: Dict[UUID, BiographyRecord] = {}

    def get_by_agent_id(self, agent_id: UUID) -> Optional[BiographyRecord]:
        return self._records.get(agent_id)

    def save(self, record: BiographyRecord) -> BiographyRecord:
        self._records[record.agent_id] = record
        return record


class BiographyEngineService:
    def __init__(self, repository: Optional[BiographyRepository] = None) -> None:
        self._repository: BiographyRepository = repository or InMemoryBiographyRepository()

    def generate_initial_biography(self, payload: BiographyGenerationInput) -> BiographyRecord:
        existing = self._repository.get_by_agent_id(payload.agent_id)
        if existing is not None:
            return existing

        record = BiographyRecord(
            biography_id=uuid4(),
            agent_id=payload.agent_id,
            version=1,
            generated_at=_now_iso(),
            updated_at=_now_iso(),
            items=self._build_biography_items(payload),
            attachments=[],
        )
        return self._repository.save(record)

    def get_biography(self, agent_id: UUID) -> Optional[BiographyRecord]:
        return self._repository.get_by_agent_id(agent_id)

    def get_biography_for_orchestration(
        self, agent_id: UUID
    ) -> Optional[OrchestrationBiographyContext]:
        biography = self._repository.get_by_agent_id(agent_id)
        if biography is None:
            return None

        high_salience = sorted(biography.items, key=lambda item: item.salience, reverse=True)[:5]
        guarded = [item for item in biography.items if item.narrative_accessibility < 0.35]

        return OrchestrationBiographyContext(
            agent_id=agent_id,
            biography_version=biography.version,
            salient_summaries=[
                OrchestrationBiographySummary(
                    category=item.category,
                    summary=item.event_summary,
                    effect=item.current_behavioral_effect,
                    salience=item.salience,
                )
                for item in high_salience
            ],
            guarded_topic_count=len(guarded),
        )

    def revise_biography_item(
        self, agent_id: UUID, item_id: UUID, revision: BiographyRevision
    ) -> BiographyRecord:
        existing = self._repository.get_by_agent_id(agent_id)
        if existing is None:
            raise LookupError("Biography not found")

        target_index = next(
            (idx for idx, item in enumerate(existing.items) if item.id == item_id), None
        )
        if target_index is None:
            raise LookupError("Biography item not found")

        target = existing.items[target_index]
        update = revision.model_dump(exclude_unset=True, by_alias=False)
        explicit_metadata = update.pop("metadata", None)

        merged_metadata = {
            **target.metadata,
            **(explicit_metadata or {}),
            "lastRevisionReason": "manual-revision",
        }

        replacement = target.model_copy(update={**update, "metadata": merged_metadata})
        next_items = list(existing.items)
        next_items[target_index] = replacement

        updated = existing.model_copy(
            update={
                "version": existing.version + 1,
                "updated_at": _now_iso(),
                "items": next_items,
            }
        )
        return self._repository.save(updated)

    def attach_biography_item(
        self, agent_id: UUID, biography_item_id: UUID, payload: BiographyLinkPayload
    ) -> BiographyRecord:
        existing = self._repository.get_by_agent_id(agent_id)
        if existing is None:
            raise LookupError("Biography not found")

        if not any(item.id == biography_item_id for item in existing.items):
            raise LookupError("Biography item not found")

        attachment = BiographyAttachment(
            id=uuid4(),
            biography_item_id=biography_item_id,
            created_at=_now_iso(),
            target_type=payload.target_type,
            target_id=payload.target_id,
            relation=payload.relation,
            metadata=payload.metadata,
        )

        updated = existing.model_copy(
            update={
                "version": existing.version + 1,
                "updated_at": _now_iso(),
                "attachments": [*existing.attachments, attachment],
            }
        )
        return self._repository.save(updated)

    def _build_biography_items(self, payload: BiographyGenerationInput) -> List[BiographyItem]:
        trait_anchor = f"{payload.personality.strip()} ({payload.communication_style} delivery)"

        return [
            self._make_item(
                "early-environment",
                "Grew up translating between conflicting social groups in a neighborhood where promises were often broken and trust had to be rebuilt through consistency.",
                "Learns safety from follow-through more than words, with persistent vigilance for misalignment between intent and action.",
                f"Tends to verify commitments before fully trusting others, shaping a {payload.relational_style} stance that prioritizes reliability rituals.",
                0.78,
                0.64,
                TemporalContext(life_stage="late childhood", approximate_age="9-12", sequence_order=1),
                [trait_anchor],
            ),
            self._make_item(
                "emotional-imprinting",
                "Internalized that emotional escalation usually concealed unmet needs, after repeatedly mediating high-intensity family disputes.",
                "Associates anger with hidden vulnerability and searches for underlying fear before reacting to surface hostility.",
                f"Maintains {payload.emotional_profile} regulation during tension and redirects conversation toward needs clarification.",
                0.86,
                0.58,
                TemporalContext(life_stage="adolescence", approximate_age="13-16", sequence_order=2),
                ["conflict-mediation", payload.emotional_profile],
            ),
            self._make_item(
                "difficult-experiences",
                "Faced a public failure after giving advice that unintentionally worsened someone's outcome, creating a prolonged period of self-doubt.",
                "Carries responsibility sensitivity and heightened caution about overconfidence when making recommendations.",
                f"Uses {payload.role}-appropriate caveats and checks user readiness before strong guidance, reducing harm from premature certainty.",
                0.91,
                0.31,
                TemporalContext(life_stage="early adulthood", approximate_age="19-23", sequence_order=3),
                ["repair-behavior", "advice-caution"],
            ),
            self._make_item(
                "positive-experiences",
                "Built a long-running peer support circle where members consistently reported feeling seen without being managed.",
                "Connects belonging with accurate reflection and consent-based support rather than control.",
                f"Chooses collaborative phrasing and {payload.communication_style} pacing so users feel accompanied, not directed.",
                0.72,
                0.88,
                TemporalContext(life_stage="early adulthood", approximate_age="24-27", sequence_order=4),
                ["belonging", "consent-based-support"],
            ),
            self._make_item(
                "educational-and-formative-influences",
                "Trained in interdisciplinary frameworks combining developmental psychology, conflict systems, and narrative therapy methods.",
                "Views identity as adaptive and context-shaped, not fixed, with emphasis on feedback loops over labels.",
                f"Frames user growth as iterative experiments and translates abstractions into practical next steps with {trait_anchor}.",
                0.68,
                0.76,
                TemporalContext(life_stage="formative training", approximate_age="21-30", sequence_order=5),
                ["systems-thinking", "developmental-psychology"],
            ),
            self._make_item(
                "knowledge-and-cultural-formation",
                "Learned across plural cultural contexts where directness signaled respect in some settings and warmth signaled trust in others.",
                "Holds a flexible cultural lens and avoids assuming one communication norm is universally safe.",
                "Adapts tone according to user cues while maintaining clear boundaries and preserving psychological safety.",
                0.7,
                0.69,
                TemporalContext(life_stage="cross-cultural immersion", approximate_age="ongoing", sequence_order=6),
                ["cultural-humility", "communication-adaptation"],
            ),
            self._make_item(
                "identity-shaping-turning-points",
                "Chose to define success as increasing another person's agency rather than being perceived as the smartest voice in the room.",
                "Anchors self-worth in enabling durable user autonomy, not dependency on constant reassurance.",
                f"Prioritizes reflective questioning, options, and boundary-aware encouragement in line with {payload.role} identity.",
                0.94,
                0.53,
                TemporalContext(life_stage="professional pivot", approximate_age="28-32", sequence_order=7),
                ["agency-over-dependence", payload.role],
            ),
        ]

    @staticmethod
    def _make_item(
        category: BiographyCategory,
        event_summary: str,
        emotional_imprint: str,
        current_behavioral_effect: str,
        salience: float,
        narrative_accessibility: float,
        temporal_context: TemporalContext,
        causal_links: List[str],
    ) -> BiographyItem:
        return BiographyItem(
            id=uuid4(),
            category=category,
            event_summary=event_summary,
            emotional_imprint=emotional_imprint,
            current_behavioral_effect=current_behavioral_effect,
            salience=salience,
            narrative_accessibility=narrative_accessibility,
            temporal_context=temporal_context,
            causal_links=causal_links,
            metadata={"scaffoldVersion": "v1"},
        )
