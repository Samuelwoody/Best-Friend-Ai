BEGIN;

DROP TRIGGER IF EXISTS trg_agent_biography_items_set_updated_at ON agent_biography_items;
DROP TRIGGER IF EXISTS trg_agent_biographies_set_updated_at ON agent_biographies;

DROP INDEX IF EXISTS idx_agent_bio_links_target;
DROP INDEX IF EXISTS idx_agent_bio_links_item;
DROP INDEX IF EXISTS idx_agent_biography_items_causal_gin;
DROP INDEX IF EXISTS idx_agent_biography_items_temporal_gin;
DROP INDEX IF EXISTS idx_agent_biography_items_salience;
DROP INDEX IF EXISTS idx_agent_biography_items_biography;
DROP INDEX IF EXISTS idx_agent_biographies_contract;
DROP INDEX IF EXISTS idx_agent_biographies_agent;

DROP TABLE IF EXISTS agent_biography_item_links;
DROP TABLE IF EXISTS agent_biography_items;
DROP TABLE IF EXISTS agent_biographies;

COMMIT;
