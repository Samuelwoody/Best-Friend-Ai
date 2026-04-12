-- Roll back initial full schema migration
BEGIN;

DROP TRIGGER IF EXISTS trg_simulations_set_updated_at ON simulations;
DROP TRIGGER IF EXISTS trg_memories_set_updated_at ON memories;
DROP TRIGGER IF EXISTS trg_messages_set_updated_at ON messages;
DROP TRIGGER IF EXISTS trg_conversations_set_updated_at ON conversations;
DROP TRIGGER IF EXISTS trg_agent_profiles_set_updated_at ON agent_profiles;
DROP TRIGGER IF EXISTS trg_agents_set_updated_at ON agents;
DROP TRIGGER IF EXISTS trg_users_set_updated_at ON users;

DROP FUNCTION IF EXISTS set_updated_at();

DROP TABLE IF EXISTS interaction_logs;
DROP TABLE IF EXISTS simulations;
DROP TABLE IF EXISTS emotional_states;
DROP TABLE IF EXISTS memories;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS conversations;
DROP TABLE IF EXISTS agent_profiles;
DROP TABLE IF EXISTS agents;
DROP TABLE IF EXISTS users;

COMMIT;
