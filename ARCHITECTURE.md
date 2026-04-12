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
- `AgentIdentityService`: deterministic audiovisual identity generation, identity storage, and media generation plan preparation.
- `ConversationService`: conversation lifecycle and message appends.
- `MemoryService`: user memory upsert and retrieval.
- `HumanComplexityLabService` (`server/labService.ts`): scenario catalog, session lifecycle, event tracking, and result summarization for lab simulations.

## Routing

- `/auth`: registration and login.
- `/users`: list users and retrieve user.
- `/agents`: create/list/retrieve agents.
- `/agents/{agent_id}/identity/*`: generate/fetch audiovisual identity and prepare media generation plans.
- `/chat`: create/list/retrieve conversations and add messages.
- `/memory`: upsert/list memory entries.
- `/api/lab/*`: scenario discovery, session start, event append, completion, and results retrieval.

## Scalability Notes

- Services are isolated and can be moved behind interfaces/repositories.
- Stateful in-memory stores are intentionally encapsulated in each service for easy migration to database-backed repositories.
- Unified `APIResponse[T]` keeps response typing consistent across routers.
- `ServiceContainer` centralizes service lifecycle and dependency wiring.
