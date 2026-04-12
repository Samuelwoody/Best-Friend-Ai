# Best Friend AI

Best Friend AI is a production-grade, modular platform for building highly personalized AI companionship experiences at internet scale.

## Repository Structure

- `frontend/` — user-facing applications and client delivery surfaces.
- `backend/` — edge APIs, BFF patterns, authn/authz enforcement, and request orchestration.
- `services/` — independently deployable domain and AI services.
- `modules/` — reusable domain modules and policy engines.
- `database/` — schemas, migrations, indexing, and governance artifacts.
- `shared/` — shared contracts, SDKs, utilities, and standards.

## Foundational Documents

- `AGENTS.md` — mandatory development and AI contribution rules.
- `ARCHITECTURE.md` — high-level system design and service boundaries.
- `PROJECT_RULES.md` — coding, architecture, and integration constraints.
- `DOMAIN_MODEL.md` — core entity definitions and relationships.
- `IMPLEMENTATION_PLAN.md` — phased roadmap to full platform maturity.

## Engineering Intent

This repository is intentionally prepared for long-term scale:
- multi-tenant architecture,
- strict modular boundaries,
- auditability and safety-first AI orchestration,
- resilience and observability for millions of users.

