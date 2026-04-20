import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageContainer } from '../components/common/PageContainer';
import { getHealth, type HealthStatus } from '../lib/healthApi';

export const DashboardPage = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch((fetchError: Error) => setError(fetchError.message));
  }, []);

  return (
    <PageContainer
      title="Dashboard"
      description="Workspace health and current activity across your AI agents."
    >
      {error ? <p className="status-error">Unable to reach the agent service: {error}</p> : null}

      <div className="stat-grid">
        <div className="stat-tile">
          <strong>{health?.agents ?? '—'}</strong>
          <span>Agents created</span>
        </div>
        <div className="stat-tile">
          <strong>{health?.drafts ?? '—'}</strong>
          <span>Draft sessions</span>
        </div>
        <div className="stat-tile">
          <strong>
            <span
              className={`status-dot ${health?.openaiConfigured ? 'status-dot-ok' : 'status-dot-warn'}`}
            />
            {health?.openaiConfigured ? 'Connected' : 'Missing key'}
          </strong>
          <span>OpenAI integration</span>
        </div>
        <div className="stat-tile">
          <strong>
            <span
              className={`status-dot ${health?.supabaseConfigured ? 'status-dot-ok' : 'status-dot-warn'}`}
            />
            {health?.supabaseConfigured ? 'Connected' : 'Missing key'}
          </strong>
          <span>Supabase persistence</span>
        </div>
      </div>

      <div className="lab-link-row">
        <Link className="lab-link" to="/chat">Open chat →</Link>
        <Link className="lab-link" to="/create-agent">Create a new agent →</Link>
        <Link className="lab-link" to="/lab/scenarios">Run a lab scenario →</Link>
      </div>
    </PageContainer>
  );
};
