from __future__ import annotations

from collections import defaultdict
from typing import Dict, List
from uuid import UUID

from app.models.orchestration_schemas import ActivatedInternalPart, InternalPartDefinition
from app.models.schemas import AgentRead


class InnerMultiplicityService:
    """Computes nuanced internal-part activation for an agent from runtime context."""

    _DEFAULT_PART_EMOTION_MAP: Dict[str, Dict[str, float]] = {
        "protector": {"protective-anger:boundary-defense": 0.22, "grounded-calm:regulated-presence": 0.08},
        "vulnerable": {"longing:attachment-ache": 0.2, "shame:self-protective-collapse": 0.1},
        "logical": {"grounded-calm:regulated-presence": 0.18, "hope:future-oriented-resolve": 0.08},
        "impulsive": {"anxiety:anticipatory-vigilance": 0.15, "awe:expansive-humility": 0.1},
        "idealistic": {"hope:future-oriented-resolve": 0.2, "awe:expansive-humility": 0.08},
        "defensive": {"protective-anger:boundary-defense": 0.18, "shame:self-protective-collapse": 0.12},
    }

    def get_parts_for_agent(self, agent: AgentRead) -> List[InternalPartDefinition]:
        return list(agent.internal_parts)

    def compute_activated_parts(
        self,
        agent: AgentRead,
        user_message: str,
        memory_entries: Dict[str, str],
        agent_biography_snapshot: str,
    ) -> List[ActivatedInternalPart]:
        lowered_message = user_message.lower()
        lowered_bio = agent_biography_snapshot.lower()

        activated: List[ActivatedInternalPart] = []
        for part in self.get_parts_for_agent(agent):
            trigger_hits = self._count_trigger_hits(part, lowered_message)
            memory_hits = self._count_memory_hits(part, memory_entries)
            biography_hits = self._count_biography_hits(part, lowered_bio)

            weighted_score = min(
                1.0,
                round(
                    (part.influence_level * 0.5)
                    + (0.2 * trigger_hits)
                    + (0.15 * memory_hits)
                    + (0.15 * biography_hits),
                    3,
                ),
            )

            if weighted_score < 0.22:
                continue

            reasons: List[str] = []
            if trigger_hits:
                reasons.append(f"trigger_hits={trigger_hits}")
            if memory_hits:
                reasons.append(f"memory_hits={memory_hits}")
            if biography_hits:
                reasons.append(f"biography_hits={biography_hits}")
            if not reasons:
                reasons.append("baseline_influence")

            activated.append(
                ActivatedInternalPart(
                    definition=part,
                    activation_score=weighted_score,
                    activation_reasons=reasons,
                )
            )

        activated.sort(key=lambda item: item.activation_score, reverse=True)
        return activated[:4]

    def expose_active_part_influence(self, active_parts: List[ActivatedInternalPart]) -> Dict[str, float]:
        influence: Dict[str, float] = defaultdict(float)
        for part in active_parts:
            emotion_map = part.definition.emotional_state_interactions or self._DEFAULT_PART_EMOTION_MAP.get(
                part.definition.type,
                {},
            )
            for key, weight in emotion_map.items():
                influence[key] += round(weight * part.activation_score, 4)

        return {key: round(value, 4) for key, value in influence.items()}

    def compute_internal_tension_level(self, active_parts: List[ActivatedInternalPart]) -> float:
        if len(active_parts) < 2:
            return 0.0

        sorted_parts = sorted(active_parts, key=lambda part: part.activation_score, reverse=True)
        top = sorted_parts[0]
        second = sorted_parts[1]

        intent_distance = self._intentional_distance(top.definition, second.definition)
        activation_overlap = min(top.activation_score, second.activation_score)

        return round(min(1.0, (0.6 * activation_overlap) + (0.4 * intent_distance)), 3)

    def summarize_internal_tension(self, active_parts: List[ActivatedInternalPart]) -> str:
        tension_level = self.compute_internal_tension_level(active_parts)
        if not active_parts:
            return "stable"
        if tension_level < 0.25:
            return "low tension"
        if tension_level < 0.6:
            return "moderate tension"
        return "elevated tension"

    def build_agent_biography_snapshot(self, agent_id: UUID, agent_description: str) -> str:
        return f"agent_id={agent_id}; description={agent_description}"

    def _count_trigger_hits(self, part: InternalPartDefinition, lowered_message: str) -> int:
        if not part.triggers:
            return 0
        return sum(1 for trigger in part.triggers if trigger.lower() in lowered_message)

    def _count_memory_hits(self, part: InternalPartDefinition, memory_entries: Dict[str, str]) -> int:
        if not part.biography_interactions:
            return 0
        combined_memory = " ".join(f"{key} {value}".lower() for key, value in memory_entries.items())
        return sum(1 for keyword in part.biography_interactions if keyword.lower() in combined_memory)

    def _count_biography_hits(self, part: InternalPartDefinition, lowered_bio: str) -> int:
        if not part.biography_interactions:
            return 0
        return sum(1 for keyword in part.biography_interactions if keyword.lower() in lowered_bio)

    def _intentional_distance(self, left: InternalPartDefinition, right: InternalPartDefinition) -> float:
        left_map = left.intentional_core_interactions
        right_map = right.intentional_core_interactions
        if not left_map or not right_map:
            return 0.2

        all_keys = set(left_map) | set(right_map)
        if not all_keys:
            return 0.2

        total_gap = 0.0
        for key in all_keys:
            total_gap += abs(left_map.get(key, 0.0) - right_map.get(key, 0.0))

        return min(1.0, total_gap / len(all_keys))
