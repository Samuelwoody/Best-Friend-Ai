export type RoleType = 'companion' | 'mentor' | 'coach' | 'listener';
export type RelationalStyle = 'supportive' | 'challenging' | 'equal-peer' | 'protective';
export type EmotionalProfile = 'calm' | 'warm' | 'energetic' | 'reflective';
export type CommunicationStyle = 'concise' | 'balanced' | 'expressive' | 'humorous';

export interface AgentDraft {
  role?: RoleType;
  personality?: string;
  relationalStyle?: RelationalStyle;
  emotionalProfile?: EmotionalProfile;
  communicationStyle?: CommunicationStyle;
}

export interface Agent extends Required<AgentDraft> {
  id: string;
  createdAt: string;
}

export interface DraftUpdatePayload {
  step: number;
  data: AgentDraft;
}
