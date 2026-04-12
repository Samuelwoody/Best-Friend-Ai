import { AgentIdentityRevision, AgentSynthesisService, FinalAgentCreationInput } from './agentSynthesisService';

export interface StoredAgent {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  revisionVersion: number;
  currentIdentity: AgentIdentityRevision;
  revisions: AgentIdentityRevision[];
}

export class AgentRegistryService {
  private readonly agents: StoredAgent[] = [];

  constructor(private readonly synthesisService: AgentSynthesisService) {}

  createAgent(input: FinalAgentCreationInput): StoredAgent {
    const now = new Date().toISOString();
    const revision = this.synthesisService.synthesize(input, 1);
    const agent: StoredAgent = {
      id: crypto.randomUUID(),
      name: input.displayName ?? `Agent ${this.agents.length + 1}`,
      createdAt: now,
      updatedAt: now,
      revisionVersion: revision.revisionVersion,
      currentIdentity: revision,
      revisions: [revision]
    };

    this.agents.push(agent);
    return agent;
  }

  listAgents(): StoredAgent[] {
    return this.agents;
  }
}
