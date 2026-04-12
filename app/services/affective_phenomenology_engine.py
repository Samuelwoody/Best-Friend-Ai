from __future__ import annotations

from collections import defaultdict
from typing import Dict, Iterable, List, Sequence

from app.data.emotional_atlas import EMOTIONAL_ATLAS, EMOTIONAL_ATLAS_VERSION, build_atlas_index
from app.models.orchestration_schemas import (
    AffectiveComputationResult,
    AffectiveConstituent,
    AffectiveTrace,
    BaselineAffectiveProfile,
    ComposedAffectiveState,
    EmotionalAtlasEntry,
    OrchestrationContext,
    OrchestrationInputPayload,
)


class AffectivePhenomenologyEngine:
    """Deterministic affective engine for nuanced emotional composition in orchestration."""

    def __init__(self) -> None:
        self._atlas: List[EmotionalAtlasEntry] = EMOTIONAL_ATLAS
        self._atlas_index: Dict[str, EmotionalAtlasEntry] = build_atlas_index()

    def get_emotional_atlas(self) -> List[EmotionalAtlasEntry]:
        return list(self._atlas)

    def get_baseline_affective_profile(self, context: OrchestrationContext) -> BaselineAffectiveProfile:
        description = context.agent_profile.description.lower()
        tokens = context.agent_profile.name.lower() + " " + description

        dominant = ["grounded-calm"]
        if any(token in tokens for token in ("mentor", "coach", "guide")):
            dominant.append("hope")
        if any(token in tokens for token in ("warm", "care", "support", "friend")):
            dominant.append("longing")

        avoided = ["shame"] if "gentle" in description or "safe" in description else []
        regulation_styles = ["co-regulation", "cognitive-reframing"]
        if "direct" in description:
            regulation_styles = ["boundary-clarification", "problem-solving"]

        relational_defaults = [
            "clarity before advice",
            "repair over blame",
        ]

        return BaselineAffectiveProfile(
            dominant_tendencies=dominant,
            avoided_emotions=avoided,
            regulation_styles=regulation_styles,
            relational_defaults=relational_defaults,
            expressive_signature="warm-reflective" if "warm" in description else "balanced-reflective",
        )

    def compute_current_emotional_state(
        self,
        payload: OrchestrationInputPayload,
        context: OrchestrationContext,
    ) -> AffectiveComputationResult:
        baseline = self.get_baseline_affective_profile(context)
        biography_influence = self._infer_biography_influence(context)
        context_influence = self._infer_conversation_context_influence(payload, context)
        memory_influence = self._infer_memory_influence(context)
        parts_influence = self._infer_internal_parts_influence(context)

        merged = self._merge_influences(
            baseline=baseline,
            biography=biography_influence,
            conversation=context_influence,
            memory=memory_influence,
            parts=parts_influence,
        )
        composed_state = self._compose_state(baseline, merged)

        trace = AffectiveTrace(
            atlas_keys_used=[f"{item.label}:{item.subtype}" for item in self._atlas],
            biography_influence=biography_influence,
            context_influence=context_influence,
            memory_influence=memory_influence,
            parts_influence=parts_influence,
        )

        return AffectiveComputationResult(
            baseline_profile=baseline,
            current_state=composed_state,
            trace=trace,
        )

    def build_orchestrator_summary(self, result: AffectiveComputationResult) -> Dict[str, object]:
        dominant = [f"{item.label}:{item.subtype}" for item in result.current_state.dominant_emotions]
        mixed = [f"{item.label}:{item.subtype}" for item in result.current_state.mixed_emotions]
        return {
            "atlas_version": EMOTIONAL_ATLAS_VERSION,
            "dominant": dominant,
            "mixed": mixed,
            "regulation_style": result.current_state.regulation_style,
            "internal_feeling_description": result.current_state.internal_feeling_description,
            "relational_needs": result.current_state.relational_needs,
            "expression_style": result.current_state.expression_style,
            "transition_tendencies": result.current_state.transition_tendencies,
        }

    def attach_affective_trace(
        self,
        payload: OrchestrationInputPayload,
        result: AffectiveComputationResult,
    ) -> Dict[str, str]:
        dominant_labels = ",".join(item.label for item in result.current_state.dominant_emotions)
        return {
            "trace_version": result.trace.trace_version,
            "message_id": str(payload.message_id),
            "dominant_labels": dominant_labels,
            "regulation_style": result.current_state.regulation_style,
        }

    def _infer_biography_influence(self, context: OrchestrationContext) -> Dict[str, float]:
        description = context.agent_profile.description.lower()
        scores: Dict[str, float] = defaultdict(float)
        if "loss" in description or "grief" in description:
            scores["grief:love-with-loss"] += 0.28
        if "resilient" in description or "growth" in description:
            scores["hope:future-oriented-resolve"] += 0.25
        if "protector" in description or "boundary" in description:
            scores["protective-anger:boundary-defense"] += 0.21
        return dict(scores)

    def _infer_conversation_context_influence(
        self,
        payload: OrchestrationInputPayload,
        context: OrchestrationContext,
    ) -> Dict[str, float]:
        scores: Dict[str, float] = defaultdict(float)
        lowered = payload.user_message.lower()
        if any(token in lowered for token in ["anxious", "worry", "uncertain", "panic"]):
            scores["anxiety:anticipatory-vigilance"] += 0.5
        if any(token in lowered for token in ["miss", "alone", "distance"]):
            scores["longing:attachment-ache"] += 0.38
        if any(token in lowered for token in ["ashamed", "embarrassed", "fault"]):
            scores["shame:self-protective-collapse"] += 0.45
        if any(token in lowered for token in ["grateful", "inspired", "amazed", "wow"]):
            scores["awe:expansive-humility"] += 0.35
        if context.conversation.total_messages > 12:
            scores["grounded-calm:regulated-presence"] += 0.1
        return dict(scores)

    def _infer_memory_influence(self, context: OrchestrationContext) -> Dict[str, float]:
        scores: Dict[str, float] = defaultdict(float)
        for key, value in context.memory.entries.items():
            lowered = f"{key} {value}".lower()
            if "conflict" in lowered or "boundary" in lowered:
                scores["protective-anger:boundary-defense"] += 0.18
            if "bereavement" in lowered or "loss" in lowered:
                scores["grief:love-with-loss"] += 0.22
            if "goal" in lowered or "progress" in lowered:
                scores["hope:future-oriented-resolve"] += 0.2
            if "breathe" in lowered or "meditation" in lowered:
                scores["grounded-calm:regulated-presence"] += 0.18
        return dict(scores)

    def _infer_internal_parts_influence(self, context: OrchestrationContext) -> Dict[str, float]:
        if context.dynamic_state.active_parts_influence:
            return context.dynamic_state.active_parts_influence

        scores: Dict[str, float] = defaultdict(float)
        for activated_part in context.dynamic_state.active_parts:
            for emotion_key, interaction_weight in activated_part.definition.emotional_state_interactions.items():
                scores[emotion_key] += max(0.0, interaction_weight) * activated_part.activation_score
        return dict(scores)

    def _merge_influences(
        self,
        baseline: BaselineAffectiveProfile,
        biography: Dict[str, float],
        conversation: Dict[str, float],
        memory: Dict[str, float],
        parts: Dict[str, float],
    ) -> Dict[str, float]:
        merged: Dict[str, float] = defaultdict(float)
        for tendency in baseline.dominant_tendencies:
            key = self._find_first_key_for_label(tendency)
            if key:
                merged[key] += 0.18

        for source in [biography, conversation, memory, parts]:
            for key, value in source.items():
                if key in self._atlas_index:
                    merged[key] += value

        return dict(merged)

    def _compose_state(
        self,
        baseline: BaselineAffectiveProfile,
        merged: Dict[str, float],
    ) -> ComposedAffectiveState:
        sorted_items = sorted(merged.items(), key=lambda item: item[1], reverse=True)

        dominant_candidates = sorted_items[:2]
        mixed_candidates = sorted_items[2:5]

        dominant = [self._to_constituent(key, weight, "composed-dominant") for key, weight in dominant_candidates]
        mixed = [self._to_constituent(key, weight, "composed-mixed") for key, weight in mixed_candidates]

        if not dominant:
            default_key = self._find_first_key_for_label("grounded-calm")
            if default_key:
                dominant = [self._to_constituent(default_key, 0.2, "baseline-default")]

        relational_needs = self._collect_relational_needs([*dominant, *mixed])
        expression_style = self._select_expression_style(dominant, baseline.expressive_signature)
        transitions = self._collect_transition_tendencies([*dominant, *mixed])

        internal_description = self._build_internal_description(dominant, mixed)

        return ComposedAffectiveState(
            dominant_emotions=dominant,
            mixed_emotions=mixed,
            avoided_emotions=baseline.avoided_emotions,
            regulation_style=baseline.regulation_styles[0] if baseline.regulation_styles else "co-regulation",
            internal_feeling_description=internal_description,
            relational_needs=relational_needs,
            expression_style=expression_style,
            transition_tendencies=transitions,
        )

    def _find_first_key_for_label(self, label: str) -> str | None:
        for key, entry in self._atlas_index.items():
            if entry.label == label:
                return key
        return None

    def _to_constituent(self, key: str, weight: float, source: str) -> AffectiveConstituent:
        entry = self._atlas_index[key]
        return AffectiveConstituent(
            label=entry.label,
            subtype=entry.subtype,
            weight=min(1.0, round(weight, 3)),
            source=source,
        )

    def _collect_relational_needs(self, constituents: Sequence[AffectiveConstituent]) -> List[str]:
        needs: List[str] = []
        for constituent in constituents:
            atlas_key = f"{constituent.label}:{constituent.subtype}"
            entry = self._atlas_index.get(atlas_key)
            if entry and entry.relational_need not in needs:
                needs.append(entry.relational_need)
        return needs[:3]

    def _select_expression_style(
        self,
        dominant: Sequence[AffectiveConstituent],
        fallback: str,
    ) -> str:
        if not dominant:
            return fallback
        first = dominant[0]
        key = f"{first.label}:{first.subtype}"
        entry = self._atlas_index.get(key)
        return entry.expression_style if entry else fallback

    def _collect_transition_tendencies(self, constituents: Iterable[AffectiveConstituent]) -> List[str]:
        transitions: List[str] = []
        for constituent in constituents:
            entry = self._atlas_index.get(f"{constituent.label}:{constituent.subtype}")
            if not entry:
                continue
            for tendency in entry.transition_tendencies:
                if tendency not in transitions:
                    transitions.append(tendency)
        return transitions[:6]

    def _build_internal_description(
        self,
        dominant: Sequence[AffectiveConstituent],
        mixed: Sequence[AffectiveConstituent],
    ) -> str:
        if not dominant:
            return "Internally steady with low emotional turbulence and moderate openness."

        primary = dominant[0]
        primary_entry = self._atlas_index.get(f"{primary.label}:{primary.subtype}")
        if not primary_entry:
            return "Internally active with layered affective signals awaiting clarification."

        if not mixed:
            return (
                f"Primary internal tone resembles {primary_entry.internal_description.lower()} "
                f"Body analogy: {primary_entry.body_sensation_analogy.lower()}"
            )

        mixed_labels = ", ".join(item.label for item in mixed[:2])
        return (
            f"Primary tone: {primary_entry.internal_description} Mixed with {mixed_labels}, "
            "creating a multi-layered emotional field that benefits from paced reflection."
        )
