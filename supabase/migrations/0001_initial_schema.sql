-- Best Friend AI — initial Supabase schema.
-- Apply this script once in the Supabase SQL editor.
-- It is idempotent: safe to re-run; nothing is dropped.

-- ============================================================
-- agents
-- Stores synthesized agents created via the agent registry.
-- ============================================================
create table if not exists public.agents (
    id uuid primary key,
    name text not null,
    display_name text,
    revision_version integer not null default 1,
    current_identity jsonb not null,
    revisions jsonb not null default '[]'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists agents_created_at_idx
    on public.agents (created_at desc);

-- ============================================================
-- agent_biographies
-- One biography record per agent (1:1, keyed by agent_id).
-- items + attachments are stored as JSONB blobs to mirror the
-- BiographyRecord shape used by the service.
-- ============================================================
create table if not exists public.agent_biographies (
    biography_id uuid not null,
    agent_id uuid primary key references public.agents (id) on delete cascade,
    version integer not null default 1,
    items jsonb not null default '[]'::jsonb,
    attachments jsonb not null default '[]'::jsonb,
    generated_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- ============================================================
-- agent_drafts
-- Multi-step creation wizard scratchpad. Keyed by client session.
-- ============================================================
create table if not exists public.agent_drafts (
    session_id text primary key,
    draft jsonb not null default '{}'::jsonb,
    step integer not null default 1,
    updated_at timestamptz not null default now()
);

-- ============================================================
-- lab_scenarios
-- Catalog of role-play scenarios for the Human Complexity Lab.
-- Seeded statically; rarely mutated at runtime.
-- ============================================================
create table if not exists public.lab_scenarios (
    id text primary key,
    title text not null,
    context text not null,
    objective text not null,
    prompt text not null,
    tags text[] not null default '{}',
    difficulty text not null check (difficulty in ('foundational', 'intermediate', 'advanced')),
    initiator text not null default 'user' check (initiator in ('user', 'agent')),
    created_at timestamptz not null default now()
);

-- ============================================================
-- lab_sessions
-- Active and completed practice sessions against a scenario.
-- ============================================================
create table if not exists public.lab_sessions (
    id uuid primary key default gen_random_uuid(),
    scenario_id text not null references public.lab_scenarios (id) on delete restrict,
    participant_id text,
    status text not null default 'active' check (status in ('active', 'completed')),
    started_at timestamptz not null default now(),
    completed_at timestamptz,
    summary text
);

create index if not exists lab_sessions_scenario_idx
    on public.lab_sessions (scenario_id);
create index if not exists lab_sessions_status_idx
    on public.lab_sessions (status);

-- ============================================================
-- lab_session_events
-- Append-only event log per session (one row per practice turn).
-- ============================================================
create table if not exists public.lab_session_events (
    id uuid primary key default gen_random_uuid(),
    session_id uuid not null references public.lab_sessions (id) on delete cascade,
    response_text text not null,
    emotional_state text,
    confidence numeric(3, 2),
    created_at timestamptz not null default now()
);

create index if not exists lab_session_events_session_idx
    on public.lab_session_events (session_id, created_at);

-- ============================================================
-- updated_at trigger
-- Keeps updated_at in sync without app-side bookkeeping.
-- ============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

drop trigger if exists agents_set_updated_at on public.agents;
create trigger agents_set_updated_at
    before update on public.agents
    for each row execute function public.set_updated_at();

drop trigger if exists agent_biographies_set_updated_at on public.agent_biographies;
create trigger agent_biographies_set_updated_at
    before update on public.agent_biographies
    for each row execute function public.set_updated_at();

drop trigger if exists agent_drafts_set_updated_at on public.agent_drafts;
create trigger agent_drafts_set_updated_at
    before update on public.agent_drafts
    for each row execute function public.set_updated_at();
