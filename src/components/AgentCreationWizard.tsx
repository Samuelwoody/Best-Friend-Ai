import { useEffect, useMemo, useState } from 'react';
import { createAgent, saveAgentDraft } from '../lib/api';
import type { Agent, AgentDraft, CommunicationStyle, EmotionalProfile, RelationalStyle, RoleType } from '../types/agent';
import { StepProgress } from './StepProgress';

type StepKey = 'role' | 'personality' | 'relationalStyle' | 'emotionalProfile' | 'communicationStyle';

interface StepDefinition {
  key: StepKey;
  title: string;
  description: string;
}

const STEPS: StepDefinition[] = [
  { key: 'role', title: 'Choose a role', description: 'Set the primary job of your agent.' },
  { key: 'personality', title: 'Define personality', description: 'Describe your agent voice and behavior.' },
  { key: 'relationalStyle', title: 'Relational style', description: 'How should your agent relate to the user?' },
  { key: 'emotionalProfile', title: 'Emotional profile', description: 'Set emotional tone and affect range.' },
  { key: 'communicationStyle', title: 'Communication style', description: 'Choose delivery format and tone density.' }
];

const ROLES: Array<{ label: string; value: RoleType }> = [
  { label: 'Companion', value: 'companion' },
  { label: 'Mentor', value: 'mentor' },
  { label: 'Coach', value: 'coach' },
  { label: 'Listener', value: 'listener' }
];

const RELATIONAL_STYLES: Array<{ label: string; value: RelationalStyle }> = [
  { label: 'Supportive', value: 'supportive' },
  { label: 'Challenging', value: 'challenging' },
  { label: 'Equal peer', value: 'equal-peer' },
  { label: 'Protective', value: 'protective' }
];

const EMOTIONAL_PROFILES: Array<{ label: string; value: EmotionalProfile }> = [
  { label: 'Calm', value: 'calm' },
  { label: 'Warm', value: 'warm' },
  { label: 'Energetic', value: 'energetic' },
  { label: 'Reflective', value: 'reflective' }
];

const COMMUNICATION_STYLES: Array<{ label: string; value: CommunicationStyle }> = [
  { label: 'Concise', value: 'concise' },
  { label: 'Balanced', value: 'balanced' },
  { label: 'Expressive', value: 'expressive' },
  { label: 'Humorous', value: 'humorous' }
];

const SESSION_KEY = 'agent-creation-session';
const LOCAL_DRAFT_KEY = 'agent-creation-draft';

function getOrCreateSessionId(): string {
  const existing = localStorage.getItem(SESSION_KEY);
  if (existing) {
    return existing;
  }

  const created = crypto.randomUUID();
  localStorage.setItem(SESSION_KEY, created);
  return created;
}

function validateStep(step: number, draft: AgentDraft): boolean {
  switch (step) {
    case 1:
      return Boolean(draft.role);
    case 2:
      return Boolean(draft.personality && draft.personality.trim().length >= 10);
    case 3:
      return Boolean(draft.relationalStyle);
    case 4:
      return Boolean(draft.emotionalProfile);
    case 5:
      return Boolean(draft.communicationStyle);
    default:
      return false;
  }
}

export function AgentCreationWizard() {
  const [activeStep, setActiveStep] = useState(1);
  const [draft, setDraft] = useState<AgentDraft>({});
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [createdAgent, setCreatedAgent] = useState<Agent | null>(null);

  const sessionId = useMemo(() => getOrCreateSessionId(), []);

  useEffect(() => {
    const cached = localStorage.getItem(LOCAL_DRAFT_KEY);
    if (cached) {
      setDraft(JSON.parse(cached) as AgentDraft);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(draft));
  }, [draft]);

  const currentStep = STEPS[activeStep - 1];
  const canContinue = validateStep(activeStep, draft);
  const isFinalStep = activeStep === STEPS.length;

  const persistStep = async () => {
    setIsSaving(true);
    setError('');
    try {
      await saveAgentDraft(sessionId, {
        step: activeStep,
        data: draft
      });
      setStatus(`Saved step ${activeStep} of ${STEPS.length}`);
    } catch (persistError) {
      setError((persistError as Error).message);
      throw persistError;
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = async () => {
    if (!canContinue) {
      setError('Please complete this step before continuing.');
      return;
    }

    await persistStep();

    if (!isFinalStep) {
      setActiveStep((step) => step + 1);
    }
  };

  const handleCreate = async () => {
    if (!canContinue) {
      setError('Please complete this step before creating the agent.');
      return;
    }

    await persistStep();
    setIsSaving(true);
    setError('');

    try {
      const agent = await createAgent(draft);
      setCreatedAgent(agent);
      setStatus('Agent created successfully.');
      localStorage.removeItem(LOCAL_DRAFT_KEY);
      localStorage.removeItem(SESSION_KEY);
    } catch (createError) {
      setError((createError as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="wizard-shell">
      <h1>Create Agent</h1>
      <StepProgress activeStep={activeStep} totalSteps={STEPS.length} />
      <h2>{currentStep.title}</h2>
      <p>{currentStep.description}</p>

      {currentStep.key === 'role' && (
        <fieldset>
          <legend>Select role</legend>
          {ROLES.map((role) => (
            <label key={role.value} className="option-row">
              <input
                type="radio"
                name="role"
                value={role.value}
                checked={draft.role === role.value}
                onChange={(event) => setDraft((prev) => ({ ...prev, role: event.target.value as RoleType }))}
              />
              {role.label}
            </label>
          ))}
        </fieldset>
      )}

      {currentStep.key === 'personality' && (
        <label className="stacked-input">
          Personality profile
          <textarea
            minLength={10}
            rows={5}
            placeholder="Example: thoughtful, direct, and optimistic with gentle accountability."
            value={draft.personality ?? ''}
            onChange={(event) => setDraft((prev) => ({ ...prev, personality: event.target.value }))}
          />
        </label>
      )}

      {currentStep.key === 'relationalStyle' && (
        <fieldset>
          <legend>Choose relational style</legend>
          {RELATIONAL_STYLES.map((style) => (
            <label key={style.value} className="option-row">
              <input
                type="radio"
                name="relational-style"
                value={style.value}
                checked={draft.relationalStyle === style.value}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, relationalStyle: event.target.value as RelationalStyle }))
                }
              />
              {style.label}
            </label>
          ))}
        </fieldset>
      )}

      {currentStep.key === 'emotionalProfile' && (
        <fieldset>
          <legend>Choose emotional profile</legend>
          {EMOTIONAL_PROFILES.map((profile) => (
            <label key={profile.value} className="option-row">
              <input
                type="radio"
                name="emotional-profile"
                value={profile.value}
                checked={draft.emotionalProfile === profile.value}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, emotionalProfile: event.target.value as EmotionalProfile }))
                }
              />
              {profile.label}
            </label>
          ))}
        </fieldset>
      )}

      {currentStep.key === 'communicationStyle' && (
        <fieldset>
          <legend>Choose communication style</legend>
          {COMMUNICATION_STYLES.map((style) => (
            <label key={style.value} className="option-row">
              <input
                type="radio"
                name="communication-style"
                value={style.value}
                checked={draft.communicationStyle === style.value}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, communicationStyle: event.target.value as CommunicationStyle }))
                }
              />
              {style.label}
            </label>
          ))}
        </fieldset>
      )}

      <div className="action-row">
        <button type="button" disabled={activeStep === 1 || isSaving} onClick={() => setActiveStep((step) => step - 1)}>
          Back
        </button>
        {!isFinalStep && (
          <button type="button" disabled={!canContinue || isSaving} onClick={handleNext}>
            Save & Continue
          </button>
        )}
        {isFinalStep && (
          <button type="button" disabled={!canContinue || isSaving} onClick={handleCreate}>
            Create Agent
          </button>
        )}
      </div>

      {status && <p className="status-success">{status}</p>}
      {error && <p className="status-error">{error}</p>}

      {createdAgent && (
        <section className="result-card">
          <h3>Agent ready</h3>
          <p>Agent ID: {createdAgent.id}</p>
          <p>Role: {createdAgent.role}</p>
          <p>Relational style: {createdAgent.relationalStyle}</p>
          <p>Communication: {createdAgent.communicationStyle}</p>
        </section>
      )}
    </div>
  );
}
