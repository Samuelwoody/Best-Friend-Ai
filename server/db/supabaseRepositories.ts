import type { SupabaseClient } from '@supabase/supabase-js';
import type { BiographyRecord, BiographyRepository } from '../biographyService';
import type { AgentRepository, StoredAgent } from '../agentRegistryService';
import type {
  LabScenario,
  LabSession,
  LabSessionEvent,
  LabSessionRepository,
  SessionResult
} from '../labService';
import type { AgentDraft, DraftRepository } from '../draftStore';

export class SupabaseBiographyRepository implements BiographyRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getByAgentId(agentId: string): Promise<BiographyRecord | undefined> {
    const { data, error } = await this.client
      .from('agent_biographies')
      .select('*')
      .eq('agent_id', agentId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load biography: ${error.message}`);
    }
    if (!data) return undefined;

    return {
      biographyId: data.biography_id,
      agentId: data.agent_id,
      version: data.version,
      generatedAt: data.generated_at,
      updatedAt: data.updated_at,
      items: (data.items ?? []) as BiographyRecord['items'],
      attachments: (data.attachments ?? []) as BiographyRecord['attachments']
    };
  }

  async save(record: BiographyRecord): Promise<BiographyRecord> {
    const { error } = await this.client.from('agent_biographies').upsert(
      {
        biography_id: record.biographyId,
        agent_id: record.agentId,
        version: record.version,
        items: record.items,
        attachments: record.attachments,
        generated_at: record.generatedAt
      },
      { onConflict: 'agent_id' }
    );

    if (error) {
      throw new Error(`Failed to save biography: ${error.message}`);
    }
    return record;
  }
}

export class SupabaseAgentRepository implements AgentRepository {
  constructor(private readonly client: SupabaseClient) {}

  async list(): Promise<StoredAgent[]> {
    const { data, error } = await this.client
      .from('agents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to list agents: ${error.message}`);
    }
    return (data ?? []).map(fromAgentRow);
  }

  async findById(agentId: string): Promise<StoredAgent | undefined> {
    const { data, error } = await this.client
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load agent: ${error.message}`);
    }
    return data ? fromAgentRow(data) : undefined;
  }

  async save(agent: StoredAgent): Promise<StoredAgent> {
    const { error } = await this.client.from('agents').upsert({
      id: agent.id,
      name: agent.name,
      display_name: agent.currentIdentity.sourceInputs.displayName ?? null,
      revision_version: agent.revisionVersion,
      current_identity: agent.currentIdentity,
      revisions: agent.revisions,
      created_at: agent.createdAt,
      updated_at: agent.updatedAt
    });

    if (error) {
      throw new Error(`Failed to save agent: ${error.message}`);
    }
    return agent;
  }

  async count(): Promise<number> {
    const { count, error } = await this.client
      .from('agents')
      .select('*', { count: 'exact', head: true });
    if (error) {
      throw new Error(`Failed to count agents: ${error.message}`);
    }
    return count ?? 0;
  }
}

function fromAgentRow(row: Record<string, unknown>): StoredAgent {
  return {
    id: row.id as string,
    name: row.name as string,
    revisionVersion: row.revision_version as number,
    currentIdentity: row.current_identity as StoredAgent['currentIdentity'],
    revisions: (row.revisions ?? []) as StoredAgent['revisions'],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  };
}

export class SupabaseDraftRepository implements DraftRepository {
  constructor(private readonly client: SupabaseClient) {}

  async upsert(sessionId: string, draft: AgentDraft, step: number): Promise<void> {
    const { error } = await this.client
      .from('agent_drafts')
      .upsert({ session_id: sessionId, draft, step }, { onConflict: 'session_id' });

    if (error) {
      throw new Error(`Failed to persist draft: ${error.message}`);
    }
  }

  async get(sessionId: string): Promise<AgentDraft | undefined> {
    const { data, error } = await this.client
      .from('agent_drafts')
      .select('draft')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load draft: ${error.message}`);
    }
    return data ? (data.draft as AgentDraft) : undefined;
  }

  async count(): Promise<number> {
    const { count, error } = await this.client
      .from('agent_drafts')
      .select('*', { count: 'exact', head: true });
    if (error) {
      throw new Error(`Failed to count drafts: ${error.message}`);
    }
    return count ?? 0;
  }
}

export class SupabaseLabRepository implements LabSessionRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listScenarios(): Promise<LabScenario[]> {
    const { data, error } = await this.client.from('lab_scenarios').select('*').order('id');
    if (error) {
      throw new Error(`Failed to list scenarios: ${error.message}`);
    }
    return (data ?? []).map(fromScenarioRow);
  }

  async getScenario(scenarioId: string): Promise<LabScenario | undefined> {
    const { data, error } = await this.client
      .from('lab_scenarios')
      .select('*')
      .eq('id', scenarioId)
      .maybeSingle();
    if (error) {
      throw new Error(`Failed to load scenario: ${error.message}`);
    }
    return data ? fromScenarioRow(data) : undefined;
  }

  async createSession(input: { scenarioId: string; participantId?: string }): Promise<LabSession> {
    const { data, error } = await this.client
      .from('lab_sessions')
      .insert({
        scenario_id: input.scenarioId,
        participant_id: input.participantId ?? null,
        status: 'active'
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Failed to create session: ${error?.message ?? 'no data'}`);
    }

    return { ...fromSessionRow(data), events: [] };
  }

  async getSession(sessionId: string): Promise<LabSession | undefined> {
    const { data, error } = await this.client
      .from('lab_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load session: ${error.message}`);
    }
    if (!data) return undefined;

    const events = await this.listEvents(sessionId);
    return { ...fromSessionRow(data), events };
  }

  async listEvents(sessionId: string): Promise<LabSessionEvent[]> {
    const { data, error } = await this.client
      .from('lab_session_events')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to load session events: ${error.message}`);
    }

    return (data ?? []).map((row) => ({
      id: row.id as string,
      createdAt: row.created_at as string,
      responseText: row.response_text as string,
      emotionalState: (row.emotional_state as string | null) ?? undefined,
      confidence: row.confidence !== null ? Number(row.confidence) : undefined
    }));
  }

  async appendEvent(
    sessionId: string,
    payload: { responseText: string; emotionalState?: string; confidence?: number }
  ): Promise<LabSessionEvent> {
    const { data, error } = await this.client
      .from('lab_session_events')
      .insert({
        session_id: sessionId,
        response_text: payload.responseText,
        emotional_state: payload.emotionalState ?? null,
        confidence: payload.confidence ?? null
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Failed to append event: ${error?.message ?? 'no data'}`);
    }

    return {
      id: data.id as string,
      createdAt: data.created_at as string,
      responseText: data.response_text as string,
      emotionalState: (data.emotional_state as string | null) ?? undefined,
      confidence: data.confidence !== null ? Number(data.confidence) : undefined
    };
  }

  async completeSession(sessionId: string, summary: string): Promise<SessionResult | undefined> {
    const completedAt = new Date().toISOString();
    const { data, error } = await this.client
      .from('lab_sessions')
      .update({ status: 'completed', completed_at: completedAt, summary })
      .eq('id', sessionId)
      .select('*')
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to complete session: ${error.message}`);
    }
    if (!data) return undefined;

    const events = await this.listEvents(sessionId);
    const avg =
      events.length > 0
        ? events.reduce((sum, event) => sum + (event.confidence ?? 0), 0) / events.length
        : null;

    return {
      sessionId,
      scenarioId: data.scenario_id as string,
      completedAt,
      eventCount: events.length,
      averageConfidence: avg,
      summary
    };
  }

  async getResult(sessionId: string): Promise<SessionResult | undefined> {
    const { data, error } = await this.client
      .from('lab_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('status', 'completed')
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load result: ${error.message}`);
    }
    if (!data) return undefined;

    const events = await this.listEvents(sessionId);
    const avg =
      events.length > 0
        ? events.reduce((sum, event) => sum + (event.confidence ?? 0), 0) / events.length
        : null;

    return {
      sessionId,
      scenarioId: data.scenario_id as string,
      completedAt: (data.completed_at as string) ?? new Date().toISOString(),
      eventCount: events.length,
      averageConfidence: avg,
      summary: (data.summary as string) ?? ''
    };
  }
}

function fromScenarioRow(row: Record<string, unknown>): LabScenario {
  return {
    id: row.id as string,
    title: row.title as string,
    context: row.context as string,
    objective: row.objective as string,
    prompt: row.prompt as string,
    tags: (row.tags ?? []) as string[],
    difficulty: row.difficulty as LabScenario['difficulty']
  };
}

function fromSessionRow(row: Record<string, unknown>): Omit<LabSession, 'events'> {
  return {
    id: row.id as string,
    scenarioId: row.scenario_id as string,
    participantId: (row.participant_id as string | null) ?? undefined,
    startedAt: row.started_at as string,
    completedAt: (row.completed_at as string | null) ?? undefined,
    status: row.status as LabSession['status']
  };
}
