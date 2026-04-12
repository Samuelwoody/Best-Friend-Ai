from app.models.orchestration_schemas import InternalPartDefinition
from app.models.schemas import AgentRead
from app.services.inner_multiplicity_service import InnerMultiplicityService


def test_inner_multiplicity_activation_and_influence_are_weighted():
    service = InnerMultiplicityService()

    agent = AgentRead(
        name="Multi-part Agent",
        description="Warm but boundary-aware guide with trust and growth history.",
        owner_id="11111111-1111-1111-1111-111111111111",
        internal_parts=[
            InternalPartDefinition(
                name="Boundary Protector",
                type="protector",
                role="Maintains safety and clear limits.",
                triggers=["unsafe", "pressure"],
                influence_level=0.7,
                emotional_state_interactions={"protective-anger:boundary-defense": 0.25},
                biography_interactions=["trust", "boundary"],
                intentional_core_interactions={"safety": 0.9, "connection": 0.2},
            ),
            InternalPartDefinition(
                name="Heart Vulnerability",
                type="vulnerable",
                role="Brings attachment pain into awareness.",
                triggers=["alone", "rejected"],
                influence_level=0.6,
                emotional_state_interactions={"longing:attachment-ache": 0.23},
                biography_interactions=["loss", "distance"],
                intentional_core_interactions={"connection": 0.9, "safety": 0.1},
            ),
            InternalPartDefinition(
                name="Analytical Planner",
                type="logical",
                role="Converts ambiguity into next actions.",
                triggers=["plan", "prepare"],
                influence_level=0.55,
                emotional_state_interactions={"grounded-calm:regulated-presence": 0.2},
                biography_interactions=["growth", "progress"],
                intentional_core_interactions={"clarity": 0.95},
            ),
        ],
    )

    active = service.compute_activated_parts(
        agent=agent,
        user_message="I feel alone and under pressure; help me prepare a safe plan.",
        memory_entries={"priority": "boundary trust and progress"},
        agent_biography_snapshot="History includes loss, rebuilding trust, and values-driven growth.",
    )

    assert len(active) >= 2
    assert active[0].activation_score >= active[-1].activation_score

    influence = service.expose_active_part_influence(active)
    assert influence
    assert any(key.startswith("protective-anger") for key in influence)

    tension_level = service.compute_internal_tension_level(active)
    assert 0.0 <= tension_level <= 1.0
    assert service.summarize_internal_tension(active) in {"low tension", "moderate tension", "elevated tension"}
