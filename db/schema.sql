-- Best-Friend-Ai relational schema (PostgreSQL)
-- This schema is designed for extensibility, auditability, and production-grade querying.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- =========================================================
-- Core principals
-- =========================================================

CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_ref        TEXT UNIQUE,
    email               CITEXT UNIQUE,
    display_name        TEXT NOT NULL,
    status              TEXT NOT NULL DEFAULT 'active',
    metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ
);

CREATE TABLE agents (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
    slug                TEXT NOT NULL UNIQUE,
    name                TEXT NOT NULL,
    description         TEXT,
    status              TEXT NOT NULL DEFAULT 'active',
    model_provider      TEXT,
    model_name          TEXT,
    config              JSONB NOT NULL DEFAULT '{}'::jsonb,
    current_version     INTEGER NOT NULL DEFAULT 1,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ
);

CREATE TABLE agent_profiles (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id            UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    version             INTEGER NOT NULL,
    profile_name        TEXT NOT NULL,
    personality         JSONB NOT NULL DEFAULT '{}'::jsonb,
    behavior_rules      JSONB NOT NULL DEFAULT '[]'::jsonb,
    prompt_template     TEXT,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    valid_from          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_to            TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (agent_id, version)
);



-- =========================================================
-- Agent biography engine
-- =========================================================

CREATE TABLE agent_biographies (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id            UUID NOT NULL UNIQUE REFERENCES agents(id) ON DELETE CASCADE,
    contract_version    TEXT NOT NULL DEFAULT 'v1',
    generation_method   TEXT NOT NULL DEFAULT 'biography-engine-v1',
    current_version     INTEGER NOT NULL DEFAULT 1,
    generated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata            JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE agent_biography_items (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    biography_id            UUID NOT NULL REFERENCES agent_biographies(id) ON DELETE CASCADE,
    item_version            INTEGER NOT NULL DEFAULT 1,
    category                TEXT NOT NULL,
    event_summary           TEXT NOT NULL,
    emotional_imprint       TEXT NOT NULL,
    current_behavior_effect TEXT NOT NULL,
    salience                NUMERIC(4,3) NOT NULL,
    narrative_accessibility NUMERIC(4,3) NOT NULL,
    temporal_context        JSONB NOT NULL,
    causal_links            JSONB NOT NULL DEFAULT '[]'::jsonb,
    metadata                JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (salience >= 0 AND salience <= 1),
    CHECK (narrative_accessibility >= 0 AND narrative_accessibility <= 1)
);

CREATE TABLE agent_biography_item_links (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    biography_item_id   UUID NOT NULL REFERENCES agent_biography_items(id) ON DELETE CASCADE,
    target_type         TEXT NOT NULL,
    target_id           TEXT NOT NULL,
    relation            TEXT NOT NULL,
    metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================
-- Conversations and messages
-- =========================================================

CREATE TABLE conversations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_id            UUID NOT NULL REFERENCES agents(id) ON DELETE RESTRICT,
    title               TEXT,
    status              TEXT NOT NULL DEFAULT 'active',
    context_snapshot    JSONB NOT NULL DEFAULT '{}'::jsonb,
    started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at            TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ
);

CREATE TABLE messages (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id     UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_type         TEXT NOT NULL, -- user | agent | system | tool
    sender_user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
    sender_agent_id     UUID REFERENCES agents(id) ON DELETE SET NULL,
    reply_to_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    role                TEXT NOT NULL, -- system | assistant | user | tool
    content             TEXT NOT NULL,
    content_json        JSONB NOT NULL DEFAULT '{}'::jsonb,
    token_count         INTEGER,
    sequence_no         BIGINT NOT NULL,
    metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (conversation_id, sequence_no)
);

-- =========================================================
-- Long-term memory and affective state
-- =========================================================

CREATE TABLE memories (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID REFERENCES users(id) ON DELETE CASCADE,
    agent_id            UUID REFERENCES agents(id) ON DELETE CASCADE,
    conversation_id     UUID REFERENCES conversations(id) ON DELETE SET NULL,
    source_message_id   UUID REFERENCES messages(id) ON DELETE SET NULL,
    memory_type         TEXT NOT NULL, -- fact | preference | summary | episodic | semantic
    key                 TEXT NOT NULL,
    value               JSONB NOT NULL,
    relevance_score     NUMERIC(5,4),
    confidence_score    NUMERIC(5,4),
    version             INTEGER NOT NULL DEFAULT 1,
    supersedes_id       UUID REFERENCES memories(id) ON DELETE SET NULL,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at          TIMESTAMPTZ,
    metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE emotional_states (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id     UUID REFERENCES conversations(id) ON DELETE CASCADE,
    message_id          UUID REFERENCES messages(id) ON DELETE SET NULL,
    user_id             UUID REFERENCES users(id) ON DELETE CASCADE,
    agent_id            UUID REFERENCES agents(id) ON DELETE CASCADE,
    subject_type        TEXT NOT NULL, -- user | agent
    valence             NUMERIC(5,4),
    arousal             NUMERIC(5,4),
    dominance           NUMERIC(5,4),
    emotion_label       TEXT,
    intensity           NUMERIC(5,4),
    confidence_score    NUMERIC(5,4),
    model_version       TEXT,
    detected_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================
-- Simulation and observability
-- =========================================================

CREATE TABLE simulations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id            UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    initiated_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name                TEXT NOT NULL,
    scenario            JSONB NOT NULL,
    input_payload       JSONB NOT NULL DEFAULT '{}'::jsonb,
    output_payload      JSONB NOT NULL DEFAULT '{}'::jsonb,
    status              TEXT NOT NULL DEFAULT 'queued', -- queued | running | completed | failed
    run_version         INTEGER NOT NULL DEFAULT 1,
    started_at          TIMESTAMPTZ,
    finished_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE interaction_logs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id     UUID REFERENCES conversations(id) ON DELETE CASCADE,
    message_id          UUID REFERENCES messages(id) ON DELETE CASCADE,
    simulation_id       UUID REFERENCES simulations(id) ON DELETE CASCADE,
    actor_type          TEXT NOT NULL, -- user | agent | system | tool
    actor_id            UUID,
    event_type          TEXT NOT NULL, -- message_created | tool_call | memory_write | moderation_flag ...
    event_version       INTEGER NOT NULL DEFAULT 1,
    payload             JSONB NOT NULL DEFAULT '{}'::jsonb,
    request_id          TEXT,
    trace_id            TEXT,
    logged_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================
-- Indexes
-- =========================================================

CREATE INDEX idx_users_status ON users(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_created_at ON users(created_at DESC);

CREATE INDEX idx_agents_owner ON agents(owner_user_id);
CREATE INDEX idx_agents_status ON agents(status) WHERE deleted_at IS NULL;

CREATE INDEX idx_agent_profiles_agent_active ON agent_profiles(agent_id, is_active);
CREATE INDEX idx_agent_profiles_validity ON agent_profiles(agent_id, valid_from DESC, valid_to);

CREATE INDEX idx_conversations_user_agent ON conversations(user_id, agent_id);
CREATE INDEX idx_conversations_status ON conversations(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_conversations_started_at ON conversations(started_at DESC);

CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at);
CREATE INDEX idx_messages_sender_user ON messages(sender_user_id);
CREATE INDEX idx_messages_sender_agent ON messages(sender_agent_id);
CREATE INDEX idx_messages_role ON messages(role);

CREATE INDEX idx_memories_user_agent_key ON memories(user_id, agent_id, key);
CREATE INDEX idx_memories_active ON memories(is_active, expires_at);
CREATE INDEX idx_memories_source_message ON memories(source_message_id);
CREATE INDEX idx_memories_value_gin ON memories USING GIN(value);

CREATE INDEX idx_emotional_states_subject ON emotional_states(subject_type, user_id, agent_id);
CREATE INDEX idx_emotional_states_detected_at ON emotional_states(detected_at DESC);

CREATE INDEX idx_simulations_agent_status ON simulations(agent_id, status);
CREATE INDEX idx_simulations_created_at ON simulations(created_at DESC);

CREATE INDEX idx_interaction_logs_conv_logged ON interaction_logs(conversation_id, logged_at DESC);
CREATE INDEX idx_interaction_logs_message ON interaction_logs(message_id);
CREATE INDEX idx_interaction_logs_simulation ON interaction_logs(simulation_id);
CREATE INDEX idx_interaction_logs_event ON interaction_logs(event_type, event_version);
CREATE INDEX idx_interaction_logs_payload_gin ON interaction_logs USING GIN(payload);


CREATE INDEX idx_agent_biographies_agent ON agent_biographies(agent_id);
CREATE INDEX idx_agent_biographies_contract ON agent_biographies(contract_version, current_version);

CREATE INDEX idx_agent_biography_items_biography ON agent_biography_items(biography_id, category);
CREATE INDEX idx_agent_biography_items_salience ON agent_biography_items(biography_id, salience DESC);
CREATE INDEX idx_agent_biography_items_temporal_gin ON agent_biography_items USING GIN(temporal_context);
CREATE INDEX idx_agent_biography_items_causal_gin ON agent_biography_items USING GIN(causal_links);

CREATE INDEX idx_agent_bio_links_item ON agent_biography_item_links(biography_item_id);
CREATE INDEX idx_agent_bio_links_target ON agent_biography_item_links(target_type, target_id);

-- =========================================================
-- Generic updated_at trigger utility
-- =========================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_agents_set_updated_at
BEFORE UPDATE ON agents
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_agent_profiles_set_updated_at
BEFORE UPDATE ON agent_profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_conversations_set_updated_at
BEFORE UPDATE ON conversations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_messages_set_updated_at
BEFORE UPDATE ON messages
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_memories_set_updated_at
BEFORE UPDATE ON memories
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_simulations_set_updated_at
BEFORE UPDATE ON simulations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


CREATE TRIGGER trg_agent_biographies_set_updated_at
BEFORE UPDATE ON agent_biographies
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_agent_biography_items_set_updated_at
BEFORE UPDATE ON agent_biography_items
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
