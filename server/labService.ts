import { z } from 'zod';

export const scenarioDifficultyEnum = z.enum(['introductory', 'intermediate', 'advanced']);

export const scenarioSchema = z.object({
  id: z.string(),
  title: z.string(),
  context: z.string(),
  objective: z.string(),
  prompt: z.string(),
  tags: z.array(z.string()).default([]),
  difficulty: scenarioDifficultyEnum
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
    difficulty: 'intermediate'
  },
  {
    id: 'scenario-supportive-listening',
    title: 'Supportive Listening During Grief',
    context: 'A friend shares they recently lost a close family member.',
    objective: 'Demonstrate empathy without minimizing their emotions.',
    prompt: 'Write your immediate response as if you are in a private conversation with your friend.',
    tags: ['empathy', 'grief', 'listening'],
    difficulty: 'introductory'
  },
  {
    id: 'scenario-accountability-repair',
    title: 'Repair After Breaking Trust',
    context: 'You forgot an important promise and your partner feels let down.',
    objective: 'Own your mistake and propose a concrete repair plan.',
    prompt: 'Craft a response that validates impact, accepts responsibility, and proposes next steps.',
    tags: ['repair', 'accountability', 'relationships'],
    difficulty: 'advanced'
  }
];

export class HumanComplexityLabService {
  private sessions = new Map<string, LabSession>();

  listScenarios(): LabScenario[] {
    return scenarios;
  }

  getScenario(scenarioId: string): LabScenario | undefined {
    return scenarios.find((scenario) => scenario.id === scenarioId);
  }

  startSession(payload: z.infer<typeof startSessionSchema>): LabSession {
    const session: LabSession = {
      id: crypto.randomUUID(),
      scenarioId: payload.scenarioId,
      participantId: payload.participantId,
      startedAt: new Date().toISOString(),
      status: 'active',
      events: []
    };

    this.sessions.set(session.id, session);
    return session;
  }

  getSession(sessionId: string): LabSession | undefined {
    return this.sessions.get(sessionId);
  }

  appendEvent(sessionId: string, payload: z.infer<typeof sessionEventSchema>): LabSessionEvent {
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
      ...payload
    };

    session.events.push(event);
    return event;
  }

  completeSession(sessionId: string): SessionResult {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (!session.completedAt) {
      session.completedAt = new Date().toISOString();
      session.status = 'completed';
    }

    return this.buildResult(session);
  }

  getSessionResult(sessionId: string): SessionResult | undefined {
    const session = this.sessions.get(sessionId);
    if (!session || !session.completedAt) {
      return undefined;
    }

    return this.buildResult(session);
  }

  private buildResult(session: LabSession): SessionResult {
    const confidenceValues = session.events
      .map((event) => event.confidence)
      .filter((value): value is number => typeof value === 'number');

    const averageConfidence = confidenceValues.length
      ? Number((confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length).toFixed(2))
      : null;

    const summary = session.events.length
      ? `Completed with ${session.events.length} reflection entries and ${averageConfidence ?? 'no'} confidence trend data.`
      : 'Completed without submitted reflections.';

    return {
      sessionId: session.id,
      scenarioId: session.scenarioId,
      completedAt: session.completedAt ?? new Date().toISOString(),
      eventCount: session.events.length,
      averageConfidence,
      summary
    };
  }
}
