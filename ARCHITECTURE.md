# ARCHITECTURE.md — Best Friend AI System Architecture

## 1) Vision

Best Friend AI is a modular, multi-tenant, production-grade platform designed for millions of users with strict reliability, safety, and observability requirements.

## 2) High-Level Topology

```text
[Frontend Apps]
  -> [Backend Edge Layer / API Gateway / BFF]
      -> [Core Platform Services]
          -> [AI Orchestration Layer]
              -> [Model Providers + Tool Runtime + Memory]
      -> [Domain Services]
      -> [Event Bus / Async Workflows]
      -> [Data Platform (OLTP + OLAP + Cache + Search)]
```

## 3) Layered Architecture

### A. Frontend Layer (`frontend/`)

Responsibilities:
- End-user experience (web/mobile clients).
- Session lifecycle and presentation logic.
- Streaming UX for AI responses.
- Client-side feature flags and resilience patterns.

Constraints:
- No direct database access.
- No model-provider-specific logic in UI.

### B. Backend Edge Layer (`backend/`)

Responsibilities:
- API gateway and request routing.
- Authentication, authorization, and rate limiting.
- Tenant isolation and request context propagation.
- BFF endpoints optimized per client surface.

Constraints:
- Must delegate business workflows to services/modules.
- Must enforce consistent API contracts and versioning.

### C. Service Layer (`services/`)

Responsibilities:
- Domain workflows (users, conversations, memories, billing, notifications).
- AI orchestration as a dedicated service set.
- Integration endpoints for third-party systems.

Constraints:
- Services communicate through explicit APIs/events.
- Each service owns its data schema and migration lifecycle.

### D. Module Layer (`modules/`)

Responsibilities:
- Shared, domain-level building blocks (policy engines, ranking, retrieval adapters, tool safety).
- Deterministic business logic reusable across services.

Constraints:
- Modules are framework-agnostic where possible.
- Modules expose stable interfaces; internals remain private.

### E. Data Layer (`database/`)

Responsibilities:
- Transactional data store patterns (sharding/partitioning ready).
- Vector memory store for semantic retrieval.
- Search indexing and analytics pipelines.
- Migration scripts, retention policies, and redaction workflows.

Constraints:
- Backward-compatible schema evolution.
- All PII handling must be encrypted, audited, and policy-governed.

### F. Shared Layer (`shared/`)

Responsibilities:
- API contracts (OpenAPI/AsyncAPI/protobuf).
- Shared libraries (identity context, tracing IDs, error envelopes).
- Security standards and reusable middleware.

Constraints:
- Shared must not become a dumping ground.
- Promote only abstractions with multiple concrete consumers.

## 4) AI Orchestration Architecture

The AI orchestration subsystem must include:
- **Planner**: decomposes intent into tool/model steps.
- **Policy Guard**: safety, compliance, and content filtering.
- **Memory Orchestrator**: retrieval, writeback, summarization, redaction.
- **Tool Router**: governs external/internal tool invocation.
- **Response Composer**: consolidates outputs into user-safe responses.

All orchestration decisions should emit structured events for traceability.

## 5) Service Boundaries and Ownership

Core service boundaries:
- Identity & Access Service
- User Profile Service
- Conversation Service
- Memory Service
- Agent Runtime Service
- AI Orchestration Service
- Notification Service
- Billing & Subscription Service
- Analytics/Telemetry Service

Each service must define:
- Public API surface,
- Event schema,
- SLO targets,
- Ownership (team),
- Runbook and escalation path.

## 6) Scalability and Reliability Baselines

- Horizontal scaling for stateless edge and orchestration workers.
- Queue-based buffering for non-blocking heavy tasks.
- Multi-region readiness for low-latency and resilience.
- Idempotent commands for retry safety.
- Circuit breakers and adaptive rate limiting per downstream dependency.

## 7) Security & Compliance Foundations

- Zero-trust service-to-service authn/authz.
- End-to-end encryption (in transit and at rest).
- Secrets managed via dedicated secret manager.
- Audit trail for AI actions, memory writes, policy overrides, and admin operations.

## 8) Observability Requirements

- Unified correlation IDs across frontend, backend, services, tools, and model calls.
- Standardized structured logging with redaction-safe fields.
- Distributed tracing for orchestration steps and tool executions.
- Golden metrics per service: latency, throughput, errors, saturation.
