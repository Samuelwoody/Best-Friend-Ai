BEGIN;

CREATE TABLE IF NOT EXISTS agent_identity_revisions (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id                    UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    revision_version            INTEGER NOT NULL,
    source_contract_version     TEXT NOT NULL DEFAULT 'v1',
    role                        TEXT NOT NULL,
    relational_style            TEXT NOT NULL,
    personality_structure       JSONB NOT NULL DEFAULT '{}'::jsonb,
    motivation_profile          JSONB NOT NULL DEFAULT '{}'::jsonb,
    perception_profile          JSONB NOT NULL DEFAULT '{}'::jsonb,
    regulation_style            JSONB NOT NULL DEFAULT '{}'::jsonb,
    narrative_identity          JSONB NOT NULL DEFAULT '{}'::jsonb,
    communication_style         JSONB NOT NULL DEFAULT '{}'::jsonb,
    affective_baseline_seed     TEXT NOT NULL,
    will_intentional_core_seed  TEXT NOT NULL,
    biography_seed_placeholders JSONB NOT NULL DEFAULT '{}'::jsonb,
    future_trajectory_placeholders JSONB NOT NULL DEFAULT '{}'::jsonb,
    source_inputs               JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (agent_id, revision_version)
);

ALTER TABLE agents
    ADD COLUMN IF NOT EXISTS active_identity_revision_id UUID REFERENCES agent_identity_revisions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_agent_identity_revisions_agent_created
    ON agent_identity_revisions(agent_id, created_at DESC);

COMMIT;
