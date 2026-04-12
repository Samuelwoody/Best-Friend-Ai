import type { Agent, AgentDraft, DraftUpdatePayload } from '../types/agent';

const JSON_HEADERS = {
  'Content-Type': 'application/json'
};

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Request failed');
  }

  return response.json() as Promise<T>;
}

export async function saveAgentDraft(sessionId: string, payload: DraftUpdatePayload): Promise<{ sessionId: string }> {
  const response = await fetch(`/api/agent-drafts/${sessionId}`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload)
  });

  return handleResponse<{ sessionId: string }>(response);
}

export async function createAgent(payload: AgentDraft): Promise<Agent> {
  const response = await fetch('/api/agents', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload)
  });

  return handleResponse<Agent>(response);
}

export async function listAgents(): Promise<Agent[]> {
  const response = await fetch('/api/agents');
  const payload = await handleResponse<{ agents: Agent[] }>(response);
  return payload.agents;
}
