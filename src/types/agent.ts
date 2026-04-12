export type RoleType = 'companion' | 'mentor' | 'coach' | 'listener';
export type RelationalStyle = 'supportive' | 'challenging' | 'equal-peer' | 'protective';
export type EmotionalProfile = 'calm' | 'warm' | 'energetic' | 'reflective';
export type CommunicationStyle = 'concise' | 'balanced' | 'expressive' | 'humorous';
export type WorldviewDepth = 'practical' | 'balanced' | 'philosophical';
export type InterfaceStyle = 'minimal' | 'guided' | 'immersive';

export interface AgentDraft {
  role?: RoleType;
  personality?: string;
  relationalStyle?: RelationalStyle;
  emotionalProfile?: EmotionalProfile;
  communicationStyle?: CommunicationStyle;
  worldviewDepth?: WorldviewDepth;
  interfaceStyle?: InterfaceStyle;
  displayName?: string;
}

export interface AgentIdentityRevision {
  revisionId: string;
  revisionVersion: number;
  createdAt: string;
  role: RoleType;
  relationalStyle: RelationalStyle;
  affectiveBaselineSeed: string;
  willIntentionalCoreSeed: string;
}

export interface Agent {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  revisionVersion: number;
  currentIdentity: AgentIdentityRevision;
}

export interface DraftUpdatePayload {
  step: number;
  data: AgentDraft;
}
