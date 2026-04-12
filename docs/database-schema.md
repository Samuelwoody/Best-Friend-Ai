# Database Schema Overview

This project uses a structured relational PostgreSQL schema that models core interaction flows between users and agents.

## Entity summary

- **users**: end users and account-level metadata.
- **agents**: configurable AI personas and runtime defaults.
- **agent_profiles**: versioned profile snapshots for an agent's behavior and persona.
- **agent_identity_revisions**: append-only synthesized identity revisions (motivation/perception/regulation/narrative/communication seeds).
- **conversations**: a user-agent session container.
- **messages**: ordered utterances within a conversation.
- **memories**: long-term fact/preference store, with version and supersession.
- **emotional_states**: affective signals inferred at user/agent/message/conversation scope.
- **simulations**: offline or scheduled scenario executions.
- **interaction_logs**: event stream for observability, audits, and replay.

## Relationship map

- `agents.owner_user_id -> users.id`
- `agent_profiles.agent_id -> agents.id`
- `agent_identity_revisions.agent_id -> agents.id`
- `conversations.user_id -> users.id`
- `conversations.agent_id -> agents.id`
- `messages.conversation_id -> conversations.id`
- `messages.sender_user_id -> users.id`
- `messages.sender_agent_id -> agents.id`
- `messages.reply_to_message_id -> messages.id` (self-reference)
- `memories.user_id -> users.id`
- `memories.agent_id -> agents.id`
- `memories.conversation_id -> conversations.id`
- `memories.source_message_id -> messages.id`
- `memories.supersedes_id -> memories.id` (self-reference)
- `emotional_states.conversation_id -> conversations.id`
- `emotional_states.message_id -> messages.id`
- `emotional_states.user_id -> users.id`
- `emotional_states.agent_id -> agents.id`
- `simulations.agent_id -> agents.id`
- `simulations.initiated_by_user_id -> users.id`
- `interaction_logs.conversation_id -> conversations.id`
- `interaction_logs.message_id -> messages.id`
- `interaction_logs.simulation_id -> simulations.id`

## Versioning and extensibility choices

- **Version columns** are included for evolving records:
  - `agents.current_version`
  - `agent_identity_revisions.revision_version`
  - `agent_profiles.version` (unique per agent)
  - `memories.version` and `memories.supersedes_id`
  - `simulations.run_version`
  - `interaction_logs.event_version`
- **JSONB columns** (`metadata`, `config`, `payload`, `value`) allow non-breaking schema extension.
- **Soft deletion support** (`deleted_at`) on high-level entities supports retention and recovery.
- **Auditability** via timestamps (`created_at`, `updated_at`, and domain-specific event times).
- **Automatic `updated_at` maintenance** enforced by DB trigger.

## Indexing strategy

Indexes were defined for:

- high-cardinality foreign key joins (conversation/message/simulation lookups),
- time-ordered reads (`created_at`, `started_at`, `logged_at`, `detected_at`),
- active record filtering (`status`, `is_active`, partial indexes),
- event analytics (`event_type`, `event_version`),
- flexible query payloads with GIN (`memories.value`, `interaction_logs.payload`).

## Migrations

- `db/migrations/001_initial_schema.up.sql`: applies initial schema.
- `db/migrations/001_initial_schema.down.sql`: drops initial schema in reverse dependency order.

> Note: `db/migrations/001_initial_schema.up.sql` uses `\i db/schema.sql` and is intended for psql-driven migration execution.
