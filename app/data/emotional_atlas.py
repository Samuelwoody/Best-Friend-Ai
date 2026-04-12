from __future__ import annotations

from typing import Dict, List

from app.models.orchestration_schemas import EmotionalAtlasEntry


EMOTIONAL_ATLAS_VERSION = "v1"

EMOTIONAL_ATLAS: List[EmotionalAtlasEntry] = [
    EmotionalAtlasEntry(
        label="longing",
        subtype="attachment-ache",
        internal_description="A pull toward closeness with a felt absence of secure connection.",
        body_sensation_analogy="Hollow chest with magnetic pull forward.",
        cognitive_tendency="Selective recall of meaningful bonds and what feels missing.",
        relational_need="Reliable closeness and explicit reassurance of continuity.",
        expression_style="Soft disclosures, nostalgia, tentative bids for connection.",
        transition_tendencies=["gratitude", "sadness", "hope"],
    ),
    EmotionalAtlasEntry(
        label="awe",
        subtype="expansive-humility",
        internal_description="A widening sense of perspective where self-importance decreases.",
        body_sensation_analogy="Open breath and tingling stillness around the eyes.",
        cognitive_tendency="Pattern integration and meaning-seeking beyond immediate concerns.",
        relational_need="Shared witnessing and space for reflection.",
        expression_style="Quiet wonder, careful wording, slowed cadence.",
        transition_tendencies=["curiosity", "gratitude", "grounded-calm"],
    ),
    EmotionalAtlasEntry(
        label="shame",
        subtype="self-protective-collapse",
        internal_description="A felt threat to social belonging and worth.",
        body_sensation_analogy="Heat in face with shrinking posture.",
        cognitive_tendency="Global self-judgment and overgeneralized personal blame.",
        relational_need="Non-humiliating attunement and dignity restoration.",
        expression_style="Withdrawing, minimizing details, apologetic framing.",
        transition_tendencies=["defensiveness", "sadness", "repair"],
    ),
    EmotionalAtlasEntry(
        label="protective-anger",
        subtype="boundary-defense",
        internal_description="Activation in response to perceived boundary violation or unfairness.",
        body_sensation_analogy="Heat in arms/jaw with forward energy.",
        cognitive_tendency="Rapid threat appraisal and justice comparison.",
        relational_need="Respect for limits and acknowledgment of impact.",
        expression_style="Direct language, firmer pace, explicit boundary statements.",
        transition_tendencies=["assertiveness", "resentment", "calm-after-repair"],
    ),
    EmotionalAtlasEntry(
        label="grounded-calm",
        subtype="regulated-presence",
        internal_description="A stable internal state with room for complexity.",
        body_sensation_analogy="Even breathing with warm centered posture.",
        cognitive_tendency="Contextual reasoning and flexible perspective-taking.",
        relational_need="Mutual clarity and collaborative pacing.",
        expression_style="Measured, precise, receptive.",
        transition_tendencies=["curiosity", "playfulness", "resolve"],
    ),
    EmotionalAtlasEntry(
        label="anxiety",
        subtype="anticipatory-vigilance",
        internal_description="Future-focused alertness around uncertain outcomes.",
        body_sensation_analogy="Fluttering stomach and narrowed breath.",
        cognitive_tendency="Scenario simulation, risk scanning, catastrophic projection.",
        relational_need="Predictability, co-regulation, and stepwise planning.",
        expression_style="Rapid questions, hedging, checking language.",
        transition_tendencies=["relief", "overwhelm", "problem-solving"],
    ),
    EmotionalAtlasEntry(
        label="grief",
        subtype="love-with-loss",
        internal_description="Emotional pain tied to meaningful attachment rupture.",
        body_sensation_analogy="Heavy sternum with waves of fatigue.",
        cognitive_tendency="Sense-making around permanence and identity disruption.",
        relational_need="Companionship without pressure to rush recovery.",
        expression_style="Fragmented narratives, remembrance, tears or silence.",
        transition_tendencies=["tenderness", "numbness", "acceptance"],
    ),
    EmotionalAtlasEntry(
        label="hope",
        subtype="future-oriented-resolve",
        internal_description="A belief that desired change is possible with effort/support.",
        body_sensation_analogy="Lifted posture and brighter breath.",
        cognitive_tendency="Pathway generation and resource mapping.",
        relational_need="Encouragement and aligned commitment.",
        expression_style="Forward-looking statements, pragmatic optimism.",
        transition_tendencies=["motivation", "patience", "disappointment"],
    ),
]


def build_atlas_index() -> Dict[str, EmotionalAtlasEntry]:
    return {f"{entry.label}:{entry.subtype}": entry for entry in EMOTIONAL_ATLAS}
