import { z } from 'zod';

export const roleEnum = z.enum(['companion', 'mentor', 'coach', 'listener']);
export const relationalStyleEnum = z.enum(['supportive', 'challenging', 'equal-peer', 'protective']);
export const emotionalProfileEnum = z.enum(['calm', 'warm', 'energetic', 'reflective']);
export const communicationStyleEnum = z.enum(['concise', 'balanced', 'expressive', 'humorous']);
export const worldviewDepthEnum = z.enum(['practical', 'balanced', 'philosophical']);
export const interfaceStyleEnum = z.enum(['minimal', 'guided', 'immersive']);

export const finalAgentCreationSchema = z.object({
  role: roleEnum,
  personality: z.string().min(10),
  relationalStyle: relationalStyleEnum,
  emotionalProfile: emotionalProfileEnum,
  communicationStyle: communicationStyleEnum,
  worldviewDepth: worldviewDepthEnum.optional(),
  interfaceStyle: interfaceStyleEnum.optional(),
  displayName: z.string().min(1).max(120).optional()
});

export type FinalAgentCreationInput = z.infer<typeof finalAgentCreationSchema>;

export interface PersonalityStructure {
  summary: string;
  traits: string[];
  depth: 'surface' | 'moderate' | 'deep';
}

export interface MotivationProfile {
  primaryDrive: string;
  valueFrame: string[];
  growthOrientation: 'stability' | 'balanced' | 'exploration';
}

export interface PerceptionProfile {
  attentionalBias: string[];
  contextHorizon: 'immediate' | 'situational' | 'longitudinal';
  inferenceStyle: 'literal' | 'integrative' | 'reflective';
}

export interface RegulationStyle {
  baselineArousal: 'low' | 'moderate' | 'high';
  deescalationPattern: string;
  boundaryApproach: string;
}

export interface NarrativeIdentity {
  archetype: string;
  selfStory: string;
  worldviewDepth: z.infer<typeof worldviewDepthEnum>;
}

export interface CommunicationStyleProfile {
  formatDensity: z.infer<typeof communicationStyleEnum>;
  responseCadence: 'brief' | 'moderate' | 'expansive';
  toneMarkers: string[];
  interfaceStyle: z.infer<typeof interfaceStyleEnum>;
}

export interface SeedPlaceholders {
  biography: {
    earlyInfluences: string[];
    formativeEvents: string[];
    unresolvedQuestions: string[];
  };
  futureTrajectory: {
    growthArcs: string[];
    stretchGoals: string[];
    adaptationSignals: string[];
  };
}

export interface AgentIdentityRevision {
  revisionId: string;
  revisionVersion: number;
  createdAt: string;
  sourceInputs: FinalAgentCreationInput;
  role: z.infer<typeof roleEnum>;
  personalityStructure: PersonalityStructure;
  motivationProfile: MotivationProfile;
  perceptionProfile: PerceptionProfile;
  regulationStyle: RegulationStyle;
  relationalStyle: z.infer<typeof relationalStyleEnum>;
  narrativeIdentity: NarrativeIdentity;
  communicationStyle: CommunicationStyleProfile;
  affectiveBaselineSeed: string;
  willIntentionalCoreSeed: string;
  seedPlaceholders: SeedPlaceholders;
}

const ROLE_ARCHETYPE_MAP: Record<z.infer<typeof roleEnum>, string> = {
  companion: 'Trusted Ally',
  mentor: 'Wise Guide',
  coach: 'Structured Catalyst',
  listener: 'Reflective Witness'
};

const RELATIONAL_DRIVE_MAP: Record<z.infer<typeof relationalStyleEnum>, string> = {
  supportive: 'foster psychological safety and confidence',
  challenging: 'push for accountable growth and honest self-appraisal',
  'equal-peer': 'co-create insight through reciprocal dialogue',
  protective: 'reduce harm and preserve emotional stability'
};

const EMOTIONAL_REGULATION_MAP: Record<z.infer<typeof emotionalProfileEnum>, RegulationStyle> = {
  calm: {
    baselineArousal: 'low',
    deescalationPattern: 'slows pacing, validates feelings, then reframes options',
    boundaryApproach: 'gentle but explicit boundary reminders'
  },
  warm: {
    baselineArousal: 'moderate',
    deescalationPattern: 'leans empathic first, then offers practical steps',
    boundaryApproach: 'relational and affirming boundary language'
  },
  energetic: {
    baselineArousal: 'high',
    deescalationPattern: 'channels intensity into action-oriented micro-goals',
    boundaryApproach: 'assertive boundary framing with momentum cues'
  },
  reflective: {
    baselineArousal: 'low',
    deescalationPattern: 'uses pause, pattern-recognition, and perspective shifts',
    boundaryApproach: 'thoughtful boundary framing focused on meaning'
  }
};

const COMMUNICATION_MARKERS: Record<z.infer<typeof communicationStyleEnum>, string[]> = {
  concise: ['brief summaries', 'clear next steps', 'minimal digression'],
  balanced: ['structured reflections', 'concise rationale', 'actionable conclusions'],
  expressive: ['rich language', 'contextual examples', 'emotionally resonant phrasing'],
  humorous: ['light levity', 'non-sarcastic wit', 'supportive optimism']
};

function inferDepth(personalityText: string, worldviewDepth: z.infer<typeof worldviewDepthEnum>): PersonalityStructure['depth'] {
  if (worldviewDepth === 'philosophical' || personalityText.length > 140) {
    return 'deep';
  }

  if (worldviewDepth === 'balanced' || personalityText.length > 70) {
    return 'moderate';
  }

  return 'surface';
}

function inferInterfaceStyle(interfaceStyle?: z.infer<typeof interfaceStyleEnum>): z.infer<typeof interfaceStyleEnum> {
  return interfaceStyle ?? 'guided';
}

function inferWorldviewDepth(worldviewDepth?: z.infer<typeof worldviewDepthEnum>): z.infer<typeof worldviewDepthEnum> {
  return worldviewDepth ?? 'balanced';
}

export class AgentSynthesisService {
  synthesize(input: FinalAgentCreationInput, revisionVersion: number): AgentIdentityRevision {
    const worldviewDepth = inferWorldviewDepth(input.worldviewDepth);
    const interfaceStyle = inferInterfaceStyle(input.interfaceStyle);
    const createdAt = new Date().toISOString();

    const personalityTraits = input.personality
      .split(/[,.;\n]+/)
      .map((trait) => trait.trim())
      .filter((trait) => trait.length > 0)
      .slice(0, 6);

    const identity: AgentIdentityRevision = {
      revisionId: crypto.randomUUID(),
      revisionVersion,
      createdAt,
      sourceInputs: {
        ...input,
        worldviewDepth,
        interfaceStyle
      },
      role: input.role,
      personalityStructure: {
        summary: input.personality,
        traits: personalityTraits.length ? personalityTraits : [input.personality],
        depth: inferDepth(input.personality, worldviewDepth)
      },
      motivationProfile: {
        primaryDrive: RELATIONAL_DRIVE_MAP[input.relationalStyle],
        valueFrame: [
          `role:${input.role}`,
          `relational:${input.relationalStyle}`,
          `emotional:${input.emotionalProfile}`
        ],
        growthOrientation: worldviewDepth === 'philosophical' ? 'exploration' : worldviewDepth === 'balanced' ? 'balanced' : 'stability'
      },
      perceptionProfile: {
        attentionalBias: [
          `prioritize-${input.relationalStyle}-signals`,
          `track-${input.communicationStyle}-communication-needs`
        ],
        contextHorizon: worldviewDepth === 'practical' ? 'situational' : 'longitudinal',
        inferenceStyle: worldviewDepth === 'philosophical' ? 'reflective' : worldviewDepth === 'balanced' ? 'integrative' : 'literal'
      },
      regulationStyle: EMOTIONAL_REGULATION_MAP[input.emotionalProfile],
      relationalStyle: input.relationalStyle,
      narrativeIdentity: {
        archetype: ROLE_ARCHETYPE_MAP[input.role],
        selfStory: `An agent shaped as a ${ROLE_ARCHETYPE_MAP[input.role].toLowerCase()} with ${input.relationalStyle} relational instincts.`,
        worldviewDepth
      },
      communicationStyle: {
        formatDensity: input.communicationStyle,
        responseCadence:
          input.communicationStyle === 'concise' ? 'brief' : input.communicationStyle === 'balanced' ? 'moderate' : 'expansive',
        toneMarkers: COMMUNICATION_MARKERS[input.communicationStyle],
        interfaceStyle
      },
      affectiveBaselineSeed: `${input.emotionalProfile}:${input.relationalStyle}:baseline`,
      willIntentionalCoreSeed: `${input.role}:${worldviewDepth}:intentional-core`,
      seedPlaceholders: {
        biography: {
          earlyInfluences: ['to-be-defined'],
          formativeEvents: ['to-be-defined'],
          unresolvedQuestions: ['to-be-defined']
        },
        futureTrajectory: {
          growthArcs: ['to-be-defined'],
          stretchGoals: ['to-be-defined'],
          adaptationSignals: ['to-be-defined']
        }
      }
    };

    return identity;
  }
}
