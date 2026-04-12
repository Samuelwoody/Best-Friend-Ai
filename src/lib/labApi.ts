import type { LabScenario, LabSession, LabSessionEvent, LabSessionResult } from '../types/lab';

const JSON_HEADERS = {
  'Content-Type': 'application/json'
};

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Request failed');
  }

  return response.json() as Promise<T>;
}

export async function listLabScenarios(): Promise<LabScenario[]> {
  const response = await fetch('/api/lab/scenarios');
  const payload = await handleResponse<{ scenarios: LabScenario[] }>(response);
  return payload.scenarios;
}

export async function startLabSession(payload: {
  scenarioId: string;
  participantId?: string;
}): Promise<{ session: LabSession; scenario: LabScenario }> {
  const response = await fetch('/api/lab/sessions', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload)
  });

  return handleResponse<{ session: LabSession; scenario: LabScenario }>(response);
}

export async function getLabSession(sessionId: string): Promise<{ session: LabSession; scenario?: LabScenario }> {
  const response = await fetch(`/api/lab/sessions/${sessionId}`);
  return handleResponse<{ session: LabSession; scenario?: LabScenario }>(response);
}

export async function appendLabSessionEvent(
  sessionId: string,
  payload: { responseText: string; emotionalState?: string; confidence?: number }
): Promise<LabSessionEvent> {
  const response = await fetch(`/api/lab/sessions/${sessionId}/events`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload)
  });

  const result = await handleResponse<{ event: LabSessionEvent }>(response);
  return result.event;
}

export async function completeLabSession(sessionId: string): Promise<LabSessionResult> {
  const response = await fetch(`/api/lab/sessions/${sessionId}/complete`, {
    method: 'POST'
  });

  const result = await handleResponse<{ result: LabSessionResult }>(response);
  return result.result;
}

export async function getLabSessionResult(sessionId: string): Promise<LabSessionResult> {
  const response = await fetch(`/api/lab/sessions/${sessionId}/results`);
  const result = await handleResponse<{ result: LabSessionResult }>(response);
  return result.result;
}
