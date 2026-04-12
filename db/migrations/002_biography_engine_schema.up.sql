BEGIN;

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

CREATE INDEX idx_agent_biographies_agent ON agent_biographies(agent_id);
CREATE INDEX idx_agent_biographies_contract ON agent_biographies(contract_version, current_version);
CREATE INDEX idx_agent_biography_items_biography ON agent_biography_items(biography_id, category);
CREATE INDEX idx_agent_biography_items_salience ON agent_biography_items(biography_id, salience DESC);
CREATE INDEX idx_agent_biography_items_temporal_gin ON agent_biography_items USING GIN(temporal_context);
CREATE INDEX idx_agent_biography_items_causal_gin ON agent_biography_items USING GIN(causal_links);
CREATE INDEX idx_agent_bio_links_item ON agent_biography_item_links(biography_item_id);
CREATE INDEX idx_agent_bio_links_target ON agent_biography_item_links(target_type, target_id);

CREATE TRIGGER trg_agent_biographies_set_updated_at
BEFORE UPDATE ON agent_biographies
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_agent_biography_items_set_updated_at
BEFORE UPDATE ON agent_biography_items
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
