export interface HealthStatus {
  status: string;
  agents: number;
  drafts: number;
  openaiConfigured: boolean;
  supabaseConfigured: boolean;
}

export async function getHealth(): Promise<HealthStatus> {
  const response = await fetch('/api/health');
  if (!response.ok) {
    throw new Error(`Health check failed (${response.status})`);
  }
  return response.json() as Promise<HealthStatus>;
}
