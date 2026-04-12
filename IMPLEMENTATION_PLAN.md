# IMPLEMENTATION_PLAN.md — Phased Platform Roadmap

## Guiding Objectives

- Build for reliability, safety, and modular extensibility from day one.
- Minimize rewrite risk by establishing stable contracts early.
- Prioritize operational maturity alongside feature delivery.

## Phase 0 — Foundation and Governance

Deliverables:
- Repository scaffolding and architecture baseline.
- Core governance docs (`AGENTS.md`, `ARCHITECTURE.md`, `PROJECT_RULES.md`, `DOMAIN_MODEL.md`).
- CI skeleton for linting, tests, and contract checks.

Exit Criteria:
- Team can implement features within agreed boundaries.
- Architectural and coding rules are enforceable in review/CI.

## Phase 1 — Identity, Access, and Core API Surface

Deliverables:
- Authentication and authorization foundation.
- Tenant context propagation and request identity model.
- Initial API gateway/BFF contracts.

Exit Criteria:
- Secure authenticated requests across all entry points.
- Contract tests validating edge-to-service communication.

## Phase 2 — Conversation and Agent Runtime MVP

Deliverables:
- Conversation service with message persistence.
- Agent runtime service with model routing abstraction.
- Streaming response pipeline and baseline safety checks.

Exit Criteria:
- Users can run end-to-end conversations with persistent history.
- Observability for request and response lifecycle.

## Phase 3 — Memory System and Retrieval Orchestration

Deliverables:
- Memory service (write, retrieve, update, delete).
- Embedding/index pipeline.
- Retrieval session tracking and ranking controls.

Exit Criteria:
- Agent can use memory context with audited retrieval behavior.
- Deletion/redaction workflows proven in integration tests.

## Phase 4 — Tooling Ecosystem and Policy Enforcement

Deliverables:
- Tool registry and permission model.
- Tool execution runtime with policy guards.
- Risk-based controls for high-impact tool actions.

Exit Criteria:
- Safe tool invocation with complete audit trails.
- Policy profile selection and enforcement by tenant/agent.

## Phase 5 — Reliability, Scale, and Multi-Region Readiness

Deliverables:
- Queue-backed async workflows.
- Horizontal autoscaling and load-shedding policies.
- Disaster recovery and multi-region failover strategy.

Exit Criteria:
- Defined SLOs met under load test profiles.
- Runbooks validated in game-day exercises.

## Phase 6 — Billing, Admin Controls, and Enterprise Features

Deliverables:
- Subscription and quota management.
- Admin console capabilities (governance, policy tuning, audit access).
- Enterprise integration interfaces.

Exit Criteria:
- Monetization and operational governance in place.
- Tenant admins can safely self-manage controls.

## Phase 7 — Continuous Optimization

Deliverables:
- Advanced analytics and feedback loops.
- Model quality and cost optimization workflows.
- Ongoing security/compliance hardening.
- Initial interaction analysis system for emotional shifts, openness, and engagement insights.

Exit Criteria:
- Stable release cadence with measurable quality gains.
- Cost/performance objectives tracked and continuously improved.


## Active Increment — Human Complexity Lab (April 12, 2026)

Deliverables:
- Human Complexity Lab frontend workflow with dedicated Scenario List, Simulation, and Results pages.
- Backend lab module exposing scenario catalog, session tracking, event capture, and result computation endpoints.
- Typed frontend/backed contracts for lab scenarios, session events, and completion results.

Owning module/service:
- `server/labService.ts` (session orchestration)
- `src/pages/Lab*` + `src/lib/labApi.ts` (UI + integration)

Upstream dependencies:
- Existing Express API host (`server/index.ts`)
- React Router app shell (`src/router/AppRouter.tsx`)

Downstream consumers:
- Lab-facing UI routes (`/lab/scenarios`, `/lab/simulation/:sessionId`, `/lab/results/:sessionId`)

Versioned interface contract:
- v1 route family under `/api/lab/*` with additive payload evolution policy.

Compatibility notes:
- Additive-only API extension; existing `/api/agents` and `/api/agent-drafts` contracts remain unchanged.
- Session state retained in-memory; database persistence can be introduced behind same route contract in later phases.



## Active Increment — Chat Orchestrator Core (April 12, 2026)

Deliverables:
- Deterministic orchestration pipeline in backend (`context gathering -> memory retrieval -> emotional state -> response strategy`).
- Integrated orchestration endpoint at `POST /chat/orchestrate` that stores user and assistant messages within the same conversation lifecycle.
- Pipeline trace payload for observability/debug workflows without breaking existing chat contracts.

Owning module/service:
- `app/services/orchestrator_service.py`
- `app/api/routes/chat.py`

Upstream dependencies:
- `ConversationService` for conversation state and message persistence.
- `MemoryService` for user memory retrieval.
- `AgentService` for agent metadata used during context gathering.

Downstream consumers:
- Chat clients that need one-call orchestrated responses with transparent trace data.

Versioned interface contract:
- `POST /chat/orchestrate` v1 payload and response models (`OrchestrationRequest`, `OrchestrationResult`), additive evolution only.

Compatibility notes:
- Existing `/chat/messages` and conversation routes remain unchanged.
- New behavior is additive and does not alter persisted schema contracts.


## Active Increment — Agent Synthesis Engine (April 12, 2026)

Deliverables:
- Deterministic synthesis pipeline that transforms creation-flow inputs into structured identity revisions.
- Agent creation API integration that persists current identity + append-only revision history.
- Agent listing integration for management surfaces to consume synthesized agents.

Owning module/service:
- `server/agentSynthesisService.ts`
- `server/agentRegistryService.ts`
- `server/index.ts` (`/api/agents`, `/api/agent-drafts`)

Upstream dependencies:
- Creation wizard payload from `src/components/AgentCreationWizard.tsx`.
- Typed contract definitions in `src/types/agent.ts`.

Downstream consumers:
- Agent manager/list UI (`src/pages/AgentsPage.tsx`).
- Future runtime modules that need structured motivation/perception/regulation seeds.

Versioned interface contract:
- v1 synthesized identity revision envelope (`revisionVersion`, structured profile fields, seed placeholders), additive evolution only.

Compatibility notes:
- Draft save-later API remains additive and backward-compatible.
- Identity revisions are append-only; latest revision pointer is used for current runtime behavior.
