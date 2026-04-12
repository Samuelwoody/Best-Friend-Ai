BEGIN;

ALTER TABLE agents
    DROP COLUMN IF EXISTS active_identity_revision_id;

DROP TABLE IF EXISTS agent_identity_revisions;

COMMIT;
