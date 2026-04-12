export type ScenarioDifficulty = 'introductory' | 'intermediate' | 'advanced';

export interface LabScenario {
  id: string;
  title: string;
  context: string;
  objective: string;
  prompt: string;
  tags: string[];
  difficulty: ScenarioDifficulty;
}

export interface LabSessionEvent {
  id: string;
  createdAt: string;
  responseText: string;
  emotionalState?: string;
  confidence?: number;
}

export interface LabSession {
  id: string;
  scenarioId: string;
  participantId?: string;
  startedAt: string;
  completedAt?: string;
  status: 'active' | 'completed';
  events: LabSessionEvent[];
}

export interface LabSessionResult {
  sessionId: string;
  scenarioId: string;
  completedAt: string;
  eventCount: number;
  averageConfidence: number | null;
  summary: string;
}
