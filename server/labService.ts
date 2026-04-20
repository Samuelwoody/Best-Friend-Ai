import { z } from 'zod';

export const scenarioDifficultyEnum = z.enum(['introductory', 'intermediate', 'advanced']);
export const scenarioInitiatorEnum = z.enum(['user', 'agent']);

export const scenarioSchema = z.object({
  id: z.string(),
  title: z.string(),
  context: z.string(),
  objective: z.string(),
  prompt: z.string(),
  tags: z.array(z.string()).default([]),
  difficulty: scenarioDifficultyEnum,
  initiator: scenarioInitiatorEnum.default('user')
});

export const startSessionSchema = z.object({
  scenarioId: z.string().min(1),
  participantId: z.string().min(1).max(128).optional()
});

export const sessionEventSchema = z.object({
  responseText: z.string().min(3).max(2000),
  emotionalState: z.string().min(2).max(100).optional(),
  confidence: z.number().min(0).max(1).optional()
});

export type LabScenario = z.infer<typeof scenarioSchema>;
export type LabSessionEvent = z.infer<typeof sessionEventSchema> & {
  id: string;
  createdAt: string;
};

export interface LabSession {
  id: string;
  scenarioId: string;
  participantId?: string;
  startedAt: string;
  completedAt?: string;
  status: 'active' | 'completed';
  events: LabSessionEvent[];
}

export interface SessionResult {
  sessionId: string;
  scenarioId: string;
  completedAt: string;
  eventCount: number;
  averageConfidence: number | null;
  summary: string;
}

const scenarios: LabScenario[] = [
  {
    id: 'scenario-conflict-boundary',
    title: 'Boundary Setting in a Team Conflict',
    context: 'A teammate repeatedly messages after work hours expecting immediate responses.',
    objective: 'Set a respectful boundary without damaging collaboration.',
    prompt: 'Respond to your teammate with a clear and emotionally intelligent boundary statement.',
    tags: ['boundaries', 'communication', 'workplace'],
    difficulty: 'intermediate',
    initiator: 'agent'
  },
  {
    id: 'scenario-supportive-listening',
    title: 'Supportive Listening During Grief',
    context: 'A friend shares they recently lost a close family member.',
    objective: 'Demonstrate empathy without minimizing their emotions.',
    prompt: 'Write your immediate response as if you are in a private conversation with your friend.',
    tags: ['empathy', 'grief', 'listening'],
    difficulty: 'introductory',
    initiator: 'agent'
  },
  {
    id: 'scenario-accountability-repair',
    title: 'Repair After Breaking Trust',
    context: 'You forgot an important promise and your partner feels let down.',
    objective: 'Own your mistake and propose a concrete repair plan.',
    prompt: 'Craft a response that validates impact, accepts responsibility, and proposes next steps.',
    tags: ['repair', 'accountability', 'relationships'],
    difficulty: 'advanced',
    initiator: 'user'
  }
];

export interface LabSessionRepository {
  listScenarios(): Promise<LabScenario[]>;
  getScenario(scenarioId: string): Promise<LabScenario | undefined>;
  createSession(input: { scenarioId: string; participantId?: string }): Promise<LabSession>;
  getSession(sessionId: string): Promise<LabSession | undefined>;
  listEvents(sessionId: string): Promise<LabSessionEvent[]>;
  appendEvent(
    sessionId: string,
    payload: { responseText: string; emotionalState?: string; confidence?: number }
  ): Promise<LabSessionEvent>;
  completeSession(sessionId: string, summary: string): Promise<SessionResult | undefined>;
  getResult(sessionId: string): Promise<SessionResult | undefined>;
}

export class InMemoryLabRepository implements LabSessionRepository {
  private sessions = new Map<string, LabSession>();

  async listScenarios(): Promise<LabScenario[]> {
    return scenarios.slice();
  }

  async getScenario(scenarioId: string): Promise<LabScenario | undefined> {
    return scenarios.find((scenario) => scenario.id === scenarioId);
  }

  async createSession(input: { scenarioId: string; participantId?: string }): Promise<LabSession> {
    const session: LabSession = {
      id: crypto.randomUUID(),
      scenarioId: input.scenarioId,
      participantId: input.participantId,
      startedAt: new Date().toISOString(),
      status: 'active',
      events: []
    };
    this.sessions.set(session.id, session);
    return session;
  }

  async getSession(sessionId: string): Promise<LabSession | undefined> {
    const session = this.sessions.get(sessionId);
    return session ? { ...session, events: session.events.slice() } : undefined;
  }

  async listEvents(sessionId: string): Promise<LabSessionEvent[]> {
    return this.sessions.get(sessionId)?.events.slice() ?? [];
  }

  async appendEvent(
    sessionId: string,
    payload: { responseText: string; emotionalState?: string; confidence?: number }
  ): Promise<LabSessionEvent> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    if (session.status === 'completed') {
      throw new Error('Session is already completed');
    }
    const event: LabSessionEvent = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      responseText: payload.responseText,
      emotionalState: payload.emotionalState,
      confidence: payload.confidence
    };
    session.events.push(event);
    return event;
  }

  async completeSession(sessionId: string, summary: string): Promise<SessionResult | undefined> {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    if (!session.completedAt) {
      session.completedAt = new Date().toISOString();
      session.status = 'completed';
    }
    return buildResult(session, summary);
  }

  async getResult(sessionId: string): Promise<SessionResult | undefined> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.completedAt) return undefined;
    return buildResult(session);
  }
}

function buildResult(session: LabSession, overrideSummary?: string): SessionResult {
  const confidenceValues = session.events
    .map((event) => event.confidence)
    .filter((value): value is number => typeof value === 'number');

  const averageConfidence = confidenceValues.length
    ? Number((confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length).toFixed(2))
    : null;

  const summary =
    overrideSummary ??
    (session.events.length
      ? `Completed with ${session.events.length} reflection entries and ${averageConfidence ?? 'no'} confidence trend data.`
      : 'Completed without submitted reflections.');

  return {
    sessionId: session.id,
    scenarioId: session.scenarioId,
    completedAt: session.completedAt ?? new Date().toISOString(),
    eventCount: session.events.length,
    averageConfidence,
    summary
  };
}

function buildSummaryForEvents(events: LabSessionEvent[]): string {
  const confidenceValues = events
    .map((event) => event.confidence)
    .filter((value): value is number => typeof value === 'number');
  const averageConfidence = confidenceValues.length
    ? Number((confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length).toFixed(2))
    : null;
  return events.length
    ? `Completed with ${events.length} reflection entries and ${averageConfidence ?? 'no'} confidence trend data.`
    : 'Completed without submitted reflections.';
}

export class HumanComplexityLabService {
  constructor(private readonly repository: LabSessionRepository = new InMemoryLabRepository()) {}

  async listScenarios(): Promise<LabScenario[]> {
    return this.repository.listScenarios();
  }

  async getScenario(scenarioId: string): Promise<LabScenario | undefined> {
    return this.repository.getScenario(scenarioId);
  }

  async startSession(payload: z.infer<typeof startSessionSchema>): Promise<LabSession> {
    return this.repository.createSession({
      scenarioId: payload.scenarioId,
      participantId: payload.participantId
    });
  }

  async getSession(sessionId: string): Promise<LabSession | undefined> {
    return this.repository.getSession(sessionId);
  }

  async appendEvent(
    sessionId: string,
    payload: z.infer<typeof sessionEventSchema>
  ): Promise<LabSessionEvent> {
    const session = await this.repository.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    if (session.status === 'completed') {
      throw new Error('Session is already completed');
    }
    return this.repository.appendEvent(sessionId, payload);
  }

  async completeSession(sessionId: string): Promise<SessionResult> {
    const events = await this.repository.listEvents(sessionId);
    const summary = buildSummaryForEvents(events);
    const result = await this.repository.completeSession(sessionId, summary);
    if (!result) {
      throw new Error('Session not found');
    }
    return result;
  }

  async getSessionResult(sessionId: string): Promise<SessionResult | undefined> {
    return this.repository.getResult(sessionId);
  }
}
