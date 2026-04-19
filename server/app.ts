import cors from 'cors';
import express, { type Express } from 'express';
import OpenAI from 'openai';
import { z } from 'zod';
import {
  AgentSynthesisService,
  communicationStyleEnum,
  emotionalProfileEnum,
  finalAgentCreationSchema,
  interfaceStyleEnum,
  relationalStyleEnum,
  roleEnum,
  worldviewDepthEnum
} from './agentSynthesisService';
import { AgentRegistryService } from './agentRegistryService';
import {
  BiographyEngineService,
  biographyLinkPayloadSchema,
  biographyRevisionSchema
} from './biographyService';
import {
  HumanComplexityLabService,
  sessionEventSchema,
  startSessionSchema
} from './labService';
import { OrchestratorService } from './orchestratorService';

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

const biographyRegenerateSchema = z.object({
  forceRegenerate: z.boolean().default(false)
});

const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1)
});

const chatRequestSchema = z.object({
  message: z.string().min(1).max(8000),
  history: z.array(chatMessageSchema).max(40).optional(),
  agentId: z.string().optional()
});

type AgentDraft = z.infer<typeof draftSchema>;

export function createApp(): Express {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  const drafts = new Map<string, AgentDraft>();
  const synthesisService = new AgentSynthesisService();
  const agentRegistry = new AgentRegistryService(synthesisService);
  const labService = new HumanComplexityLabService();
  const biographyEngine = new BiographyEngineService();
  const orchestratorService = new OrchestratorService(biographyEngine);

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

    const agent = agentRegistry.createAgent(parsed.data);
    const biography = biographyEngine.generateInitialBiography({
      agentId: agent.id,
      role: parsed.data.role,
      personality: parsed.data.personality,
      relationalStyle: parsed.data.relationalStyle,
      emotionalProfile: parsed.data.emotionalProfile,
      communicationStyle: parsed.data.communicationStyle
    });

    return res.status(201).json({
      ...agent,
      biographyId: biography.biographyId,
      biographyVersion: biography.version
    });
  });

  app.get('/api/agents', (_req, res) => {
    return res.status(200).json({ agents: agentRegistry.listAgents() });
  });

  app.get('/api/agents/:agentId', (req, res) => {
    const agent = agentRegistry.listAgents().find((candidate) => candidate.id === req.params.agentId);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    return res.status(200).json({ agent });
  });

  app.post('/api/agents/:agentId/biography/generate', (req, res) => {
    const agent = agentRegistry.listAgents().find((candidate) => candidate.id === req.params.agentId);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const parsed = biographyRegenerateSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const source = agent.currentIdentity.sourceInputs;
    const generationInput = {
      agentId: agent.id,
      role: source.role,
      personality: source.personality,
      relationalStyle: source.relationalStyle,
      emotionalProfile: source.emotionalProfile,
      communicationStyle: source.communicationStyle
    };

    if (!parsed.data.forceRegenerate) {
      const biography = biographyEngine.generateInitialBiography(generationInput);
      return res.status(201).json({ biography });
    }

    const current = biographyEngine.getBiography(agent.id);
    if (current) {
      return res.status(409).json({
        error: 'Biography already exists. Forced regeneration requires migration-safe strategy.'
      });
    }

    const biography = biographyEngine.generateInitialBiography(generationInput);
    return res.status(201).json({ biography });
  });

  app.get('/api/agents/:agentId/biography', (req, res) => {
    const biography = biographyEngine.getBiography(req.params.agentId);
    if (!biography) {
      return res.status(404).json({ error: 'Biography not found' });
    }

    return res.status(200).json({ biography });
  });

  app.patch('/api/agents/:agentId/biography/items/:itemId', (req, res) => {
    const parsed = biographyRevisionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    try {
      const biography = biographyEngine.reviseBiographyItem(req.params.agentId, req.params.itemId, parsed.data);
      return res.status(200).json({ biography });
    } catch (error) {
      return res.status(404).json({ error: error instanceof Error ? error.message : 'Unable to revise biography item' });
    }
  });

  app.post('/api/agents/:agentId/biography/items/:itemId/attachments', (req, res) => {
    const parsed = biographyLinkPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    try {
      const biography = biographyEngine.attachBiographyItem(req.params.agentId, req.params.itemId, parsed.data);
      return res.status(201).json({ biography });
    } catch (error) {
      return res
        .status(404)
        .json({ error: error instanceof Error ? error.message : 'Unable to attach biography item reference' });
    }
  });

  app.get('/api/orchestration/agents/:agentId/biography-context', (req, res) => {
    const biographyContext = orchestratorService.getAgentBiographyContext(req.params.agentId);
    if (!biographyContext) {
      return res.status(404).json({ error: 'Biography context not found' });
    }

    return res.status(200).json({ biographyContext });
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

  app.post('/api/chat/stream', async (req, res) => {
    const parsed = chatRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'OPENAI_API_KEY is not configured on the server.' });
    }

    const { message, history = [], agentId } = parsed.data;

    let systemPrompt =
      'You are Best Friend AI — a warm, emotionally intelligent companion. ' +
      'Reply in the same language as the user. Be concise, genuine, and reflective.';

    if (agentId) {
      const agent = agentRegistry.listAgents().find((candidate) => candidate.id === agentId);
      if (agent) {
        const identity = agent.currentIdentity;
        systemPrompt = [
          `You are ${agent.name}, an AI agent with the following identity:`,
          `- Role: ${identity.role}`,
          `- Relational style: ${identity.relationalStyle}`,
          `- Personality: ${identity.personalityStructure.summary}`,
          `- Communication style: ${identity.communicationStyle.formatDensity} (${identity.communicationStyle.responseCadence})`,
          `- Narrative archetype: ${identity.narrativeIdentity.archetype} — ${identity.narrativeIdentity.selfStory}`,
          'Stay in character. Reply in the same language as the user.'
        ].join('\n');
      }
    }

    const client = new OpenAI({ apiKey });

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof (res as unknown as { flushHeaders?: () => void }).flushHeaders === 'function') {
      (res as unknown as { flushHeaders: () => void }).flushHeaders();
    }

    const send = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const stream = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
        stream: true,
        messages: [
          { role: 'system', content: systemPrompt },
          ...history.map((entry) => ({ role: entry.role, content: entry.content })),
          { role: 'user', content: message }
        ]
      });

      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta?.content;
        if (delta) {
          send('chunk', { content: delta });
        }
      }

      send('done', {});
      res.end();
    } catch (error) {
      send('error', { message: error instanceof Error ? error.message : 'Unknown OpenAI error' });
      res.end();
    }
  });

  app.get('/api/health', (_req, res) => {
    const agents = agentRegistry.listAgents();
    res.status(200).json({
      status: 'ok',
      agents: agents.length,
      drafts: drafts.size,
      biographies: agents.filter((agent) => Boolean(biographyEngine.getBiography(agent.id))).length,
      openaiConfigured: Boolean(process.env.OPENAI_API_KEY)
    });
  });

  return app;
}

let cached: Express | undefined;
export function getApp(): Express {
  if (!cached) {
    cached = createApp();
  }
  return cached;
}
