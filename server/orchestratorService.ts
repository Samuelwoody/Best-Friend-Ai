import type { BiographyEngineService } from './biographyService.js';

export interface OrchestrationBiographyContext {
  agentId: string;
  biographyVersion: number;
  salientSummaries: Array<{
    category: string;
    summary: string;
    effect: string;
    salience: number;
  }>;
  guardedTopicCount: number;
}

export class OrchestratorService {
  constructor(private readonly biographyEngine: BiographyEngineService) {}

  async getAgentBiographyContext(agentId: string): Promise<OrchestrationBiographyContext | undefined> {
    const biography = await this.biographyEngine.getBiographyForOrchestration(agentId);
    if (!biography) {
      return undefined;
    }

    return {
      agentId,
      biographyVersion: biography.biographyVersion,
      salientSummaries: biography.highSalienceItems.map((item) => ({
        category: item.category,
        summary: item.eventSummary,
        effect: item.currentBehavioralEffect,
        salience: item.salience
      })),
      guardedTopicCount: biography.guardedItems.length
    };
  }
}
