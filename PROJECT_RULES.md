# PROJECT_RULES.md — Engineering and Integration Rules

## 1) Coding Standards

- Code must be clean, typed (where language supports), and production-ready.
- Public methods/functions require clear contracts and error behavior.
- Favor explicitness over implicit side effects.
- Keep functions small but cohesive; avoid god-objects and god-services.
- Every non-trivial module must include test coverage.

## 2) Architecture Constraints

1. **Layering rule**
   - `frontend -> backend -> services -> modules -> database/shared contracts`
   - Upward imports are prohibited.

2. **Dependency inversion**
   - Depend on interfaces at boundaries.
   - Concrete implementations must remain replaceable.

3. **Single responsibility**
   - Services own bounded contexts.
   - Shared components must solve cross-cutting concerns only.

4. **Backward compatibility**
   - APIs are versioned.
   - Schema changes are additive first; destructive changes require staged migrations.

## 3) Integration Rules

- All inter-service communication uses versioned contracts.
- Synchronous calls require timeout, retry, and circuit-breaker policies.
- Asynchronous events must be idempotent and schema-versioned.
- Tool integrations in AI flows must include safety classification and permission gating.

## 4) Data Governance

- PII is classified and tagged at schema definition.
- Retention policies are mandatory for user-generated data and logs.
- Memory data must support selective deletion and user-initiated export.
- Any analytics extraction must preserve tenant isolation and privacy controls.

## 5) Security Rules

- Principle of least privilege for all services and operators.
- No plaintext secrets in code or config files.
- Security headers and input validation are mandatory at public boundaries.
- Authorization checks must exist at both edge and domain levels.

## 6) AI Safety and Policy Rules

- Policy checks are required before and after tool execution.
- High-risk operations require explicit policy allowlists.
- Prompt/template changes must be reviewed and versioned.
- Hallucination-sensitive outputs should include provenance when possible.

## 7) Delivery and Operations

- CI must enforce lint, test, and contract validation gates.
- Deployments should support progressive rollout and rollback.
- Every service must publish health/readiness endpoints.
- On-call runbooks are required before production launch.
