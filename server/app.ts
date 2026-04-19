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
import { AgentRegistryService, InMemoryAgentRepository } from './agentRegistryService';
import {
  BiographyEngineService,
  InMemoryBiographyRepository,
  biographyLinkPayloadSchema,
  biographyRevisionSchema
} from './biographyService';
import {
  HumanComplexityLabService,
  InMemoryLabRepository,
  sessionEventSchema,
  startSessionSchema
} from './labService';
import { OrchestratorService } from './orchestratorService';
import { InMemoryDraftRepository, type DraftRepository } from './draftStore';
import { getSupabaseClient, isSupabaseConfigured } from './db/supabase';
import {
  SupabaseAgentRepository,
  SupabaseBiographyRepository,
  SupabaseDraftRepository,
  SupabaseLabRepository
} from './db/supabaseRepositories';

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

export function createApp(): Express {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  const supabase = getSupabaseClient();
  const synthesisService = new AgentSynthesisService();

  const agentRegistry = new AgentRegistryService(
    synthesisService,
    supabase ? new SupabaseAgentRepository(supabase) : new InMemoryAgentRepository()
  );
  const biographyEngine = new BiographyEngineService(
    supabase ? new SupabaseBiographyRepository(supabase) : new InMemoryBiographyRepository()
  );
  const labService = new HumanComplexityLabService(
    supabase ? new SupabaseLabRepository(supabase) : new InMemoryLabRepository()
  );
  const drafts: DraftRepository = supabase
    ? new SupabaseDraftRepository(supabase)
    : new InMemoryDraftRepository();

  const orchestratorService = new OrchestratorService(biographyEngine);

  app.post('/api/agent-drafts/:sessionId', async (req, res, next) => {
    try {
      const { sessionId } = req.params;
      const parsed = draftUpdateSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }

      const existing = (await drafts.get(sessionId)) ?? {};
      const merged = { ...existing, ...parsed.data.data };
      await drafts.upsert(sessionId, merged, parsed.data.step);

      return res.status(200).json({ sessionId });
    } catch (error) {
      return next(error);
    }
  });

  app.post('/api/agents', async (req, res, next) => {
    try {
      const parsed = finalAgentCreationSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }

      const agent = await agentRegistry.createAgent(parsed.data);
      const biography = await biographyEngine.generateInitialBiography({
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
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/agents', async (_req, res, next) => {
    try {
      const agents = await agentRegistry.listAgents();
      return res.status(200).json({ agents });
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/agents/:agentId', async (req, res, next) => {
    try {
      const agent = await agentRegistry.findAgent(req.params.agentId);
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      return res.status(200).json({ agent });
    } catch (error) {
      return next(error);
    }
  });

  app.post('/api/agents/:agentId/biography/generate', async (req, res, next) => {
    try {
      const agent = await agentRegistry.findAgent(req.params.agentId);
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
        const biography = await biographyEngine.generateInitialBiography(generationInput);
        return res.status(201).json({ biography });
      }

      const current = await biographyEngine.getBiography(agent.id);
      if (current) {
        return res.status(409).json({
          error: 'Biography already exists. Forced regeneration requires migration-safe strategy.'
        });
      }

      const biography = await biographyEngine.generateInitialBiography(generationInput);
      return res.status(201).json({ biography });
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/agents/:agentId/biography', async (req, res, next) => {
    try {
      const biography = await biographyEngine.getBiography(req.params.agentId);
      if (!biography) {
        return res.status(404).json({ error: 'Biography not found' });
      }
      return res.status(200).json({ biography });
    } catch (error) {
      return next(error);
    }
  });

  app.patch('/api/agents/:agentId/biography/items/:itemId', async (req, res, next) => {
    try {
      const parsed = biographyRevisionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }
      const biography = await biographyEngine.reviseBiographyItem(req.params.agentId, req.params.itemId, parsed.data);
      return res.status(200).json({ biography });
    } catch (error) {
      if (error instanceof Error && /not found/i.test(error.message)) {
        return res.status(404).json({ error: error.message });
      }
      return next(error);
    }
  });

  app.post('/api/agents/:agentId/biography/items/:itemId/attachments', async (req, res, next) => {
    try {
      const parsed = biographyLinkPayloadSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }
      const biography = await biographyEngine.attachBiographyItem(req.params.agentId, req.params.itemId, parsed.data);
      return res.status(201).json({ biography });
    } catch (error) {
      if (error instanceof Error && /not found/i.test(error.message)) {
        return res.status(404).json({ error: error.message });
      }
      return next(error);
    }
  });

  app.get('/api/orchestration/agents/:agentId/biography-context', async (req, res, next) => {
    try {
      const biographyContext = await orchestratorService.getAgentBiographyContext(req.params.agentId);
      if (!biographyContext) {
        return res.status(404).json({ error: 'Biography context not found' });
      }
      return res.status(200).json({ biographyContext });
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/lab/scenarios', async (_req, res, next) => {
    try {
      const scenarios = await labService.listScenarios();
      res.status(200).json({ scenarios });
    } catch (error) {
      return next(error);
    }
  });

  app.post('/api/lab/sessions', async (req, res, next) => {
    try {
      const parsed = startSessionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }

      const scenario = await labService.getScenario(parsed.data.scenarioId);
      if (!scenario) {
        return res.status(404).json({ error: 'Scenario not found' });
      }

      const session = await labService.startSession(parsed.data);
      return res.status(201).json({ session, scenario });
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/lab/sessions/:sessionId', async (req, res, next) => {
    try {
      const session = await labService.getSession(req.params.sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      const scenario = await labService.getScenario(session.scenarioId);
      return res.status(200).json({ session, scenario });
    } catch (error) {
      return next(error);
    }
  });

  app.post('/api/lab/sessions/:sessionId/events', async (req, res, next) => {
    try {
      const parsed = sessionEventSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }
      const event = await labService.appendEvent(req.params.sessionId, parsed.data);
      return res.status(201).json({ event });
    } catch (error) {
      if (error instanceof Error && /not found/i.test(error.message)) {
        return res.status(404).json({ error: error.message });
      }
      if (error instanceof Error && /already completed/i.test(error.message)) {
        return res.status(409).json({ error: error.message });
      }
      return next(error);
    }
  });

  app.post('/api/lab/sessions/:sessionId/complete', async (req, res, next) => {
    try {
      const result = await labService.completeSession(req.params.sessionId);
      return res.status(200).json({ result });
    } catch (error) {
      if (error instanceof Error && /not found/i.test(error.message)) {
        return res.status(404).json({ error: error.message });
      }
      return next(error);
    }
  });

  app.get('/api/lab/sessions/:sessionId/results', async (req, res, next) => {
    try {
      const result = await labService.getSessionResult(req.params.sessionId);
      if (!result) {
        return res.status(404).json({ error: 'Result not found' });
      }
      return res.status(200).json({ result });
    } catch (error) {
      return next(error);
    }
  });

  app.post('/api/chat/stream', async (req, res, next) => {
    try {
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
        const agent = await agentRegistry.findAgent(agentId);
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
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/health', async (_req, res) => {
    try {
      const [agentCount, draftCount] = await Promise.all([
        agentRegistry.countAgents(),
        drafts.count()
      ]);

      res.status(200).json({
        status: 'ok',
        agents: agentCount,
        drafts: draftCount,
        openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
        supabaseConfigured: isSupabaseConfigured()
      });
    } catch (error) {
      res.status(200).json({
        status: 'degraded',
        error: error instanceof Error ? error.message : 'unknown',
        openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
        supabaseConfigured: isSupabaseConfigured()
      });
    }
  });

  // Generic error handler (last)
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[server] unhandled error:', message);
    res.status(500).json({ error: message });
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
