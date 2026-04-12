import cors from 'cors';
import express from 'express';
import { z } from 'zod';
import {
  HumanComplexityLabService,
  sessionEventSchema,
  startSessionSchema
} from './labService';
import {
  communicationStyleEnum,
  emotionalProfileEnum,
  finalAgentCreationSchema,
  relationalStyleEnum,
  roleEnum,
  AgentSynthesisService,
  interfaceStyleEnum,
  worldviewDepthEnum
} from './agentSynthesisService';
import { AgentRegistryService } from './agentRegistryService';

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json());

const draftSchema = z.object({
  role: roleEnum.optional(),
  personality: z.string().min(10).optional(),
  relationalStyle: relationalStyleEnum.optional(),
  emotionalProfile: emotionalProfileEnum.optional(),
  communicationStyle: communicationStyleEnum.optional(),
  worldviewDepth: worldviewDepthEnum.optional(),
  interfaceStyle: interfaceStyleEnum.optional(),
  displayName: z.string().min(1).max(120).optional()
});

const draftUpdateSchema = z.object({
  step: z.number().int().min(1).max(5),
  data: draftSchema
});

type AgentDraft = z.infer<typeof draftSchema>;

const drafts = new Map<string, AgentDraft>();
const synthesisService = new AgentSynthesisService();
const agentRegistry = new AgentRegistryService(synthesisService);
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
  const parsed = finalAgentCreationSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const createdAgent = agentRegistry.createAgent(parsed.data);
  return res.status(201).json(createdAgent);
});

app.get('/api/agents', (_req, res) => {
  return res.status(200).json({ agents: agentRegistry.listAgents() });
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
  res.status(200).json({ status: 'ok', agents: agentRegistry.listAgents().length, drafts: drafts.size });
});

app.listen(port, () => {
  console.log(`Agent service listening on port ${port}`);
});
