export interface AgentDraft {
  role?: string;
  personality?: string;
  relationalStyle?: string;
  emotionalProfile?: string;
  communicationStyle?: string;
  worldviewDepth?: string;
  interfaceStyle?: string;
  displayName?: string;
}

export interface DraftRepository {
  upsert(sessionId: string, draft: AgentDraft, step: number): Promise<void>;
  get(sessionId: string): Promise<AgentDraft | undefined>;
  count(): Promise<number>;
}

export class InMemoryDraftRepository implements DraftRepository {
  private drafts = new Map<string, AgentDraft>();

  async upsert(sessionId: string, draft: AgentDraft): Promise<void> {
    this.drafts.set(sessionId, draft);
  }

  async get(sessionId: string): Promise<AgentDraft | undefined> {
    return this.drafts.get(sessionId);
  }

  async count(): Promise<number> {
    return this.drafts.size;
  }
}
