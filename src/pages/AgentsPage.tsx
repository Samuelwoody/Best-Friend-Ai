import { useEffect, useState } from 'react';
import { PageContainer } from '../components/common/PageContainer';
import { listAgents } from '../lib/api';
import type { Agent } from '../types/agent';

export const AgentsPage = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    listAgents()
      .then(setAgents)
      .catch((fetchError) => setError((fetchError as Error).message));
  }, []);

  return (
    <PageContainer title="Agents" description="Browse and manage your active and draft AI agents.">
      {error && <p role="alert">Unable to load agents: {error}</p>}
      {!error && agents.length === 0 && <p>No agents created yet.</p>}
      {agents.length > 0 && (
        <ul>
          {agents.map((agent) => (
            <li key={agent.id}>
              <strong>{agent.name}</strong> · role: {agent.currentIdentity.role} · revision v
              {agent.revisionVersion}
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  );
};
