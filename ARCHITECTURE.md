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

- `OrchestratorService` (`app/services/orchestrator_service.py`) is the central decision/routing layer for chat orchestration.
- `app/models/orchestration_schemas.py` defines versioned orchestration contracts: input payload, context, decision result, subsystem outputs, and final assembled response context.
- Subsystem boundaries are interface-driven (`app/services/orchestration_interfaces.py`) with concrete, replaceable adapters in `app/services/orchestrator_subsystems.py`.
- Feature flags (`FeatureFlags`) gate orchestrator and subsystem rollout to preserve backward compatibility and controlled release.

### Orchestration Stages

1. Gather user context
2. Gather agent profile context
3. Gather conversation context
4. Gather memory context
5. Gather dynamic internal state
6. Decide subsystem routing
7. Assemble downstream response context

### Chat Integration

- Existing endpoint `/chat/messages` remains unchanged.
- New additive endpoint `/chat/messages/orchestrate` adds message persistence plus orchestrated response-context assembly for downstream response generation.


## Biography Engine Extension (v1)

- `agent_biographies`, `agent_biography_items`, and `agent_biography_item_links` add structured and queryable biography persistence without collapsing to undifferentiated text.
- Agent synthesis (`POST /api/agents`) now auto-generates an initial biography scaffold to keep lifecycle integration deterministic and backward compatible (additive response fields only).
- Orchestration consumers can request a condensed biography context via `/api/orchestration/agents/:agentId/biography-context`.
