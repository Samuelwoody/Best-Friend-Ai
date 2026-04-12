import cors from 'cors';
import express from 'express';
import { z } from 'zod';
import {
  HumanComplexityLabService,
  sessionEventSchema,
  startSessionSchema
} from './labService';

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json());

const roleEnum = z.enum(['companion', 'mentor', 'coach', 'listener']);
const relationalStyleEnum = z.enum(['supportive', 'challenging', 'equal-peer', 'protective']);
const emotionalProfileEnum = z.enum(['calm', 'warm', 'energetic', 'reflective']);
const communicationStyleEnum = z.enum(['concise', 'balanced', 'expressive', 'humorous']);

const draftSchema = z.object({
  role: roleEnum.optional(),
  personality: z.string().min(10).optional(),
  relationalStyle: relationalStyleEnum.optional(),
  emotionalProfile: emotionalProfileEnum.optional(),
  communicationStyle: communicationStyleEnum.optional()
});

const draftUpdateSchema = z.object({
  step: z.number().int().min(1).max(5),
  data: draftSchema
});

const finalAgentSchema = z.object({
  role: roleEnum,
  personality: z.string().min(10),
  relationalStyle: relationalStyleEnum,
  emotionalProfile: emotionalProfileEnum,
  communicationStyle: communicationStyleEnum
});

type AgentDraft = z.infer<typeof draftSchema>;
type Agent = z.infer<typeof finalAgentSchema> & {
  id: string;
  createdAt: string;
};

const drafts = new Map<string, AgentDraft>();
const agents: Agent[] = [];
const labService = new HumanComplexityLabService();

app.post('/api/agent-drafts/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const parsed = draftUpdateSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const existing = drafts.get(sessionId) ?? {};
  const merged = { ...existing, ...parsed.data.data };
  drafts.set(sessionId, merged);

  return res.status(200).json({ sessionId });
});

app.post('/api/agents', (req, res) => {
  const parsed = finalAgentSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const agent: Agent = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...parsed.data
  };

  agents.push(agent);
  return res.status(201).json(agent);
});



app.get('/api/lab/scenarios', (_req, res) => {
  const scenarios = labService.listScenarios();
  res.status(200).json({ scenarios });
});

app.post('/api/lab/sessions', (req, res) => {
  const parsed = startSessionSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const scenario = labService.getScenario(parsed.data.scenarioId);
  if (!scenario) {
    return res.status(404).json({ error: 'Scenario not found' });
  }

  const session = labService.startSession(parsed.data);
  return res.status(201).json({ session, scenario });
});

app.get('/api/lab/sessions/:sessionId', (req, res) => {
  const session = labService.getSession(req.params.sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const scenario = labService.getScenario(session.scenarioId);
  return res.status(200).json({ session, scenario });
});

app.post('/api/lab/sessions/:sessionId/events', (req, res) => {
  const parsed = sessionEventSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const session = labService.getSession(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  try {
    const event = labService.appendEvent(req.params.sessionId, parsed.data);
    return res.status(201).json({ event });
  } catch (error) {
    return res.status(409).json({
      error: error instanceof Error ? error.message : 'Unable to append event'
    });
  }
});

app.post('/api/lab/sessions/:sessionId/complete', (req, res) => {
  const session = labService.getSession(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const result = labService.completeSession(req.params.sessionId);
  return res.status(200).json({ result });
});

app.get('/api/lab/sessions/:sessionId/results', (req, res) => {
  const result = labService.getSessionResult(req.params.sessionId);
  if (!result) {
    return res.status(404).json({ error: 'Result not found' });
  }

  return res.status(200).json({ result });
});

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', agents: agents.length, drafts: drafts.size });
});

app.listen(port, () => {
  console.log(`Agent service listening on port ${port}`);
});
