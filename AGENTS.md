# AGENTS.md — Best Friend AI Development Rules

This document defines mandatory operating rules for all human and AI contributors.

## 1) Core Engineering Principles

1. **Production-first mindset**
   - Every change must be suitable for a live, customer-facing system.
   - Temporary hacks, throwaway abstractions, and demo-only patterns are prohibited in mainline code.

2. **No simplification of critical behavior**
   - Do not reduce, collapse, or bypass required system behavior to make implementation easier.
   - Complex business or safety logic must remain explicit and testable.

3. **No breaking changes by default**
   - Existing interfaces, contracts, and persisted schemas must remain backward compatible.
   - Any unavoidable breaking change requires a migration plan, rollback plan, version bump, and approval.

4. **Strict modular architecture enforcement**
   - New logic must be added as modules/services with clear boundaries.
   - Cross-module imports must depend on interfaces/contracts, not internal implementation details.

## 2) Design and Change Management Rules

- Every new capability must declare:
  - owning module/service,
  - upstream dependencies,
  - downstream consumers,
  - versioned interface contract.
- Feature flags must guard risky production behavior.
- Changes affecting data model or APIs must include migration compatibility notes.
- Prefer additive evolution over destructive refactors.

## 3) Quality Gates (Required Before Merge)

- Linting and static analysis pass.
- Unit tests for domain logic pass.
- Integration tests for service boundaries pass.
- Security checks for secrets, dependency vulnerabilities, and auth/authz pathways pass.
- Observability requirements met (logs, metrics, traces).

## 4) AI-Specific Development Constraints

- AI behavior must be deterministic where required by policy (configurable temperature and guardrails).
- Prompt templates, tool contracts, and policy rules must be versioned artifacts.
- Memory updates must be auditable (who/what/when/why) and support safe deletion/redaction.
- Safety policy enforcement is non-optional and cannot be bypassed for convenience.

## 5) Documentation Standards

Any change to architecture, interfaces, domain entities, or operational workflows must update:
- `ARCHITECTURE.md` when boundaries or topology change,
- `PROJECT_RULES.md` when governance rules change,
- `DOMAIN_MODEL.md` when entities/relations evolve,
- `IMPLEMENTATION_PLAN.md` when roadmap sequencing changes.

## 6) Repository Scope Baseline

This repository is organized around six top-level areas:
- `frontend/` — user-facing web/mobile clients,
- `backend/` — API gateway, BFF layers, and platform entry points,
- `services/` — independently deployable domain/AI services,
- `modules/` — reusable business modules and policy engines,
- `database/` — schema, migrations, indexing, and data governance,
- `shared/` — contracts, SDKs, utilities, and cross-cutting standards.
