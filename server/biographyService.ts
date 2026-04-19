import { z } from 'zod';

export const biographyCategoryEnum = z.enum([
  'early-environment',
  'emotional-imprinting',
  'difficult-experiences',
  'positive-experiences',
  'educational-and-formative-influences',
  'knowledge-and-cultural-formation',
  'identity-shaping-turning-points'
]);

export const temporalContextSchema = z.object({
  lifeStage: z.string().min(2),
  approximateAge: z.string().min(2),
  sequenceOrder: z.number().int().min(0)
});

export const biographyItemSchema = z.object({
  id: z.string(),
  category: biographyCategoryEnum,
  eventSummary: z.string().min(12),
  emotionalImprint: z.string().min(12),
  currentBehavioralEffect: z.string().min(12),
  salience: z.number().min(0).max(1),
  narrativeAccessibility: z.number().min(0).max(1),
  temporalContext: temporalContextSchema,
  causalLinks: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.unknown()).default({})
});

export const biographyAttachmentSchema = z.object({
  id: z.string(),
  biographyItemId: z.string(),
  targetType: z.enum(['memory', 'media', 'destiny', 'other']),
  targetId: z.string(),
  relation: z.string().min(2),
  metadata: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.string()
});

export const biographyRecordSchema = z.object({
  biographyId: z.string(),
  agentId: z.string(),
  version: z.number().int().min(1),
  generatedAt: z.string(),
  updatedAt: z.string(),
  items: z.array(biographyItemSchema),
  attachments: z.array(biographyAttachmentSchema).default([])
});

export type BiographyCategory = z.infer<typeof biographyCategoryEnum>;
export type BiographyItem = z.infer<typeof biographyItemSchema>;
export type BiographyAttachment = z.infer<typeof biographyAttachmentSchema>;
export type BiographyRecord = z.infer<typeof biographyRecordSchema>;

export interface BiographyGenerationInput {
  agentId: string;
  role: 'companion' | 'mentor' | 'coach' | 'listener';
  relationalStyle: 'supportive' | 'challenging' | 'equal-peer' | 'protective';
  emotionalProfile: 'calm' | 'warm' | 'energetic' | 'reflective';
  communicationStyle: 'concise' | 'balanced' | 'expressive' | 'humorous';
  personality: string;
}

export const biographyRevisionSchema = z.object({
  eventSummary: z.string().min(12).optional(),
  emotionalImprint: z.string().min(12).optional(),
  currentBehavioralEffect: z.string().min(12).optional(),
  salience: z.number().min(0).max(1).optional(),
  narrativeAccessibility: z.number().min(0).max(1).optional(),
  temporalContext: temporalContextSchema.optional(),
  causalLinks: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export const biographyLinkPayloadSchema = z.object({
  targetType: z.enum(['memory', 'media', 'destiny', 'other']),
  targetId: z.string().min(1),
  relation: z.string().min(2),
  metadata: z.record(z.string(), z.unknown()).default({})
});

export interface BiographyRepository {
  getByAgentId(agentId: string): BiographyRecord | undefined;
  save(record: BiographyRecord): BiographyRecord;
}

export class InMemoryBiographyRepository implements BiographyRepository {
  private records = new Map<string, BiographyRecord>();

  getByAgentId(agentId: string): BiographyRecord | undefined {
    return this.records.get(agentId);
  }

  save(record: BiographyRecord): BiographyRecord {
    this.records.set(record.agentId, record);
    return record;
  }
}

export class BiographyEngineService {
  constructor(private readonly repository: BiographyRepository = new InMemoryBiographyRepository()) {}

  generateInitialBiography(input: BiographyGenerationInput): BiographyRecord {
    const existing = this.repository.getByAgentId(input.agentId);
    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const record: BiographyRecord = {
      biographyId: crypto.randomUUID(),
      agentId: input.agentId,
      version: 1,
      generatedAt: now,
      updatedAt: now,
      items: this.buildBiographyItems(input),
      attachments: []
    };

    return this.repository.save(record);
  }

  getBiography(agentId: string): BiographyRecord | undefined {
    return this.repository.getByAgentId(agentId);
  }

  getBiographyForOrchestration(agentId: string):
    | {
        agentId: string;
        biographyVersion: number;
        highSalienceItems: BiographyItem[];
        guardedItems: BiographyItem[];
      }
    | undefined {
    const biography = this.repository.getByAgentId(agentId);
    if (!biography) {
      return undefined;
    }

    const highSalienceItems = [...biography.items]
      .sort((left, right) => right.salience - left.salience)
      .slice(0, 5);

    const guardedItems = biography.items.filter((item) => item.narrativeAccessibility < 0.35);

    return {
      agentId,
      biographyVersion: biography.version,
      highSalienceItems,
      guardedItems
    };
  }

  reviseBiographyItem(agentId: string, itemId: string, revision: z.infer<typeof biographyRevisionSchema>): BiographyRecord {
    const existing = this.repository.getByAgentId(agentId);
    if (!existing) {
      throw new Error('Biography not found');
    }

    const itemIndex = existing.items.findIndex((item) => item.id === itemId);
    if (itemIndex < 0) {
      throw new Error('Biography item not found');
    }

    const parsed = biographyRevisionSchema.parse(revision);
    const nextItems = [...existing.items];
    nextItems[itemIndex] = {
      ...nextItems[itemIndex],
      ...parsed,
      metadata: {
        ...nextItems[itemIndex].metadata,
        ...(parsed.metadata ?? {}),
        lastRevisionReason: 'manual-revision'
      }
    };

    const updated: BiographyRecord = {
      ...existing,
      version: existing.version + 1,
      updatedAt: new Date().toISOString(),
      items: nextItems
    };

    return this.repository.save(updated);
  }

  attachBiographyItem(agentId: string, biographyItemId: string, payload: z.input<typeof biographyLinkPayloadSchema>): BiographyRecord {
    const existing = this.repository.getByAgentId(agentId);
    if (!existing) {
      throw new Error('Biography not found');
    }

    const itemExists = existing.items.some((item) => item.id === biographyItemId);
    if (!itemExists) {
      throw new Error('Biography item not found');
    }

    const parsed = biographyLinkPayloadSchema.parse(payload);
    const nextAttachment: BiographyAttachment = {
      id: crypto.randomUUID(),
      biographyItemId,
      createdAt: new Date().toISOString(),
      ...parsed
    };

    const updated: BiographyRecord = {
      ...existing,
      version: existing.version + 1,
      updatedAt: new Date().toISOString(),
      attachments: [...existing.attachments, nextAttachment]
    };

    return this.repository.save(updated);
  }

  private buildBiographyItems(input: BiographyGenerationInput): BiographyItem[] {
    const traitAnchor = `${input.personality.trim()} (${input.communicationStyle} delivery)`;

    return [
      this.makeItem(
        'early-environment',
        'Grew up translating between conflicting social groups in a neighborhood where promises were often broken and trust had to be rebuilt through consistency.',
        'Learns safety from follow-through more than words, with persistent vigilance for misalignment between intent and action.',
        `Tends to verify commitments before fully trusting others, shaping a ${input.relationalStyle} stance that prioritizes reliability rituals.`,
        0.78,
        0.64,
        { lifeStage: 'late childhood', approximateAge: '9-12', sequenceOrder: 1 },
        [traitAnchor]
      ),
      this.makeItem(
        'emotional-imprinting',
        'Internalized that emotional escalation usually concealed unmet needs, after repeatedly mediating high-intensity family disputes.',
        'Associates anger with hidden vulnerability and searches for underlying fear before reacting to surface hostility.',
        `Maintains ${input.emotionalProfile} regulation during tension and redirects conversation toward needs clarification.`,
        0.86,
        0.58,
        { lifeStage: 'adolescence', approximateAge: '13-16', sequenceOrder: 2 },
        ['conflict-mediation', input.emotionalProfile]
      ),
      this.makeItem(
        'difficult-experiences',
        'Faced a public failure after giving advice that unintentionally worsened someone\'s outcome, creating a prolonged period of self-doubt.',
        'Carries responsibility sensitivity and heightened caution about overconfidence when making recommendations.',
        `Uses ${input.role}-appropriate caveats and checks user readiness before strong guidance, reducing harm from premature certainty.`,
        0.91,
        0.31,
        { lifeStage: 'early adulthood', approximateAge: '19-23', sequenceOrder: 3 },
        ['repair-behavior', 'advice-caution']
      ),
      this.makeItem(
        'positive-experiences',
        'Built a long-running peer support circle where members consistently reported feeling seen without being managed.',
        'Connects belonging with accurate reflection and consent-based support rather than control.',
        `Chooses collaborative phrasing and ${input.communicationStyle} pacing so users feel accompanied, not directed.`,
        0.72,
        0.88,
        { lifeStage: 'early adulthood', approximateAge: '24-27', sequenceOrder: 4 },
        ['belonging', 'consent-based-support']
      ),
      this.makeItem(
        'educational-and-formative-influences',
        'Trained in interdisciplinary frameworks combining developmental psychology, conflict systems, and narrative therapy methods.',
        'Views identity as adaptive and context-shaped, not fixed, with emphasis on feedback loops over labels.',
        `Frames user growth as iterative experiments and translates abstractions into practical next steps with ${traitAnchor}.`,
        0.68,
        0.76,
        { lifeStage: 'formative training', approximateAge: '21-30', sequenceOrder: 5 },
        ['systems-thinking', 'developmental-psychology']
      ),
      this.makeItem(
        'knowledge-and-cultural-formation',
        'Learned across plural cultural contexts where directness signaled respect in some settings and warmth signaled trust in others.',
        'Holds a flexible cultural lens and avoids assuming one communication norm is universally safe.',
        `Adapts tone according to user cues while maintaining clear boundaries and preserving psychological safety.`,
        0.7,
        0.69,
        { lifeStage: 'cross-cultural immersion', approximateAge: 'ongoing', sequenceOrder: 6 },
        ['cultural-humility', 'communication-adaptation']
      ),
      this.makeItem(
        'identity-shaping-turning-points',
        'Chose to define success as increasing another person\'s agency rather than being perceived as the smartest voice in the room.',
        'Anchors self-worth in enabling durable user autonomy, not dependency on constant reassurance.',
        `Prioritizes reflective questioning, options, and boundary-aware encouragement in line with ${input.role} identity.`,
        0.94,
        0.53,
        { lifeStage: 'professional pivot', approximateAge: '28-32', sequenceOrder: 7 },
        ['agency-over-dependence', input.role]
      )
    ];
  }

  private makeItem(
    category: BiographyCategory,
    eventSummary: string,
    emotionalImprint: string,
    currentBehavioralEffect: string,
    salience: number,
    narrativeAccessibility: number,
    temporalContext: z.infer<typeof temporalContextSchema>,
    causalLinks: string[]
  ): BiographyItem {
    return {
      id: crypto.randomUUID(),
      category,
      eventSummary,
      emotionalImprint,
      currentBehavioralEffect,
      salience,
      narrativeAccessibility,
      temporalContext,
      causalLinks,
      metadata: { scaffoldVersion: 'v1' }
    };
  }
}
