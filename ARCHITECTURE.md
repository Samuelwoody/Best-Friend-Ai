# Backend Architecture

## Layers

- **API Layer** (`app/api/routes`): HTTP contracts, route grouping, and response models.
- **Service Layer** (`app/services`): business logic and orchestration.
- **Model Layer** (`app/models`): request/response and entity schemas.
- **Core Layer** (`app/core`): shared infrastructure, currently typed API response envelope.

## Services

- `AuthService`: registration + login/token flow.
- `UserService`: user creation, retrieval, listing, and credential validation.
- `AgentService`: agent CRUD-oriented operations.
- `AgentSynthesisService` (`server/agentSynthesisService.ts`): deterministic synthesis of structured agent identity from creation-flow inputs (explicit fields + inferred defaults).
- `AgentRegistryService` (`server/agentRegistryService.ts`): persistence boundary for created agents and identity revision history.
- `AgentIdentityService`: deterministic audiovisual identity generation, identity storage, and media generation plan preparation.
- `ConversationService`: conversation lifecycle and message appends.
- `MemoryService`: user memory upsert and retrieval.
- `OrchestratorService`: deterministic response orchestration pipeline (context gathering, memory retrieval, emotional-state inference, response strategy selection, and assistant message composition).
- `HumanComplexityLabService` (`server/labService.ts`): scenario catalog, session lifecycle, event tracking, and result summarization for lab simulations.
- `BiographyEngineService` (`server/biographyService.ts`): deterministic synthetic life-history scaffold generation, biography retrieval for orchestration, revision/versioning, and attachment linkage for memory/media subsystems.
- `OrchestratorService` (`server/orchestratorService.ts`): orchestration-facing context projection of biography salience and guarded topics.

## Routing

- `/auth`: registration and login.
- `/users`: list users and retrieve user.
- `/agents`: create/list/retrieve agents, plus biography generation/retrieval/revision and biography item attachment endpoints.
- `/chat`: create/list/retrieve conversations, add messages, and execute orchestration pipeline via `/chat/orchestrate`.
- `/memory`: upsert/list memory entries.
- `/interaction-analysis`: conversation-level interaction analytics.

## Scalability Notes

- Services are isolated and can be moved behind interfaces/repositories.
- Stateful in-memory stores are intentionally encapsulated in each service for easy migration to database-backed repositories.
- Unified `APIResponse[T]` keeps response typing consistent across routers.
- `ServiceContainer` centralizes service lifecycle and dependency wiring.


## Analytics Extensions

- `InteractionAnalysisService`: computes conversation-level interaction analytics (emotional shifts, openness, engagement) and returns deterministic insights derived from user messages.
- Route group `/interaction-analysis`: read-only analytics endpoint for conversation insights.
- Dependency flow remains additive: API route -> `InteractionAnalysisService` -> `ConversationService` -> typed models.


## Agent Creation and Synthesis Extensions

- Creation flow contract includes role, personality, relational style, emotional profile, communication style, plus optional worldview depth and interface style.
- `POST /api/agents` performs deterministic synthesis and stores `currentIdentity` + append-only revision history (`revisions[]`).
- `GET /api/agents` exposes created agents for manager/list views using same persisted registry state.

## Affective Phenomenology Engine Extensions (April 12, 2026)

- `AffectivePhenomenologyEngine` (`app/services/affective_phenomenology_engine.py`) now owns deterministic affective composition from five signals: baseline profile, biography influence, conversation context, memory activation, and internal parts activation.
- `AffectiveSubsystem` now delegates to the engine and emits a structured v1 payload containing baseline profile, composed state, orchestrator summary, and trace attachment metadata.
- `OrchestratorService` now extracts affective summary data into assembled response context so downstream prompting and delivery layers can consume emotional state as a stable contract.
- `app/data/emotional_atlas.py` introduces an in-repo emotional atlas seed dataset with expandable typed entries (label/subtype/description/body/cognitive/relational/expression/transitions).

Owning module/service:
- `app/services/affective_phenomenology_engine.py`

Upstream dependencies:
- `ConversationService`, `MemoryService`, and `AgentService` contexts assembled in `OrchestratorService`.

Downstream consumers:
- `AffectiveSubsystem` output payload in orchestration responses.
- Response prompting, voice modulation, audiovisual generation, and communication intelligence modules (via emitted summary + trace contract).

Versioned interface contract:
- `SubsystemOutput.payload` for `affective_engine` remains additive under `contract_version: v1`; nested keys (`baseline_profile`, `current_state`, `summary`, `trace`, `trace_attachment`) are extensible.
