import { AgentIdentityRevision, AgentSynthesisService, FinalAgentCreationInput } from './agentSynthesisService.js';

export interface StoredAgent {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  revisionVersion: number;
  currentIdentity: AgentIdentityRevision;
  revisions: AgentIdentityRevision[];
}

export interface AgentRepository {
  list(): Promise<StoredAgent[]>;
  findById(agentId: string): Promise<StoredAgent | undefined>;
  save(agent: StoredAgent): Promise<StoredAgent>;
  count(): Promise<number>;
}

export class InMemoryAgentRepository implements AgentRepository {
  private readonly agents: StoredAgent[] = [];

  async list(): Promise<StoredAgent[]> {
    return this.agents.slice();
  }

  async findById(agentId: string): Promise<StoredAgent | undefined> {
    return this.agents.find((agent) => agent.id === agentId);
  }

  async save(agent: StoredAgent): Promise<StoredAgent> {
    const existingIndex = this.agents.findIndex((candidate) => candidate.id === agent.id);
    if (existingIndex >= 0) {
      this.agents[existingIndex] = agent;
    } else {
      this.agents.push(agent);
    }
    return agent;
  }

  async count(): Promise<number> {
    return this.agents.length;
  }
}

export class AgentRegistryService {
  constructor(
    private readonly synthesisService: AgentSynthesisService,
    private readonly repository: AgentRepository = new InMemoryAgentRepository()
  ) {}

  async createAgent(input: FinalAgentCreationInput): Promise<StoredAgent> {
    const now = new Date().toISOString();
    const revision = this.synthesisService.synthesize(input, 1);
    const existingCount = await this.repository.count();
    const agent: StoredAgent = {
      id: crypto.randomUUID(),
      name: input.displayName ?? `Agent ${existingCount + 1}`,
      createdAt: now,
      updatedAt: now,
      revisionVersion: revision.revisionVersion,
      currentIdentity: revision,
      revisions: [revision]
    };

    await this.repository.save(agent);
    return agent;
  }

  async listAgents(): Promise<StoredAgent[]> {
    return this.repository.list();
  }

  async findAgent(agentId: string): Promise<StoredAgent | undefined> {
    return this.repository.findById(agentId);
  }

  async countAgents(): Promise<number> {
    return this.repository.count();
  }
}
