-- Initial full schema migration
BEGIN;

\i db/schema.sql

COMMIT;
