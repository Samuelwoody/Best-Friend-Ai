import { useEffect, useState } from 'react';
import { PageContainer } from '../components/common/PageContainer';
import { getHealth, type HealthStatus } from '../lib/healthApi';

export const SettingsPage = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch((fetchError: Error) => setError(fetchError.message));
  }, []);

  return (
    <PageContainer
      title="Settings"
      description="Workspace configuration and integrations."
    >
      {error ? <p className="status-error">{error}</p> : null}

      <div className="stat-grid">
        <div className="stat-tile">
          <strong>
            <span
              className={`status-dot ${health?.openaiConfigured ? 'status-dot-ok' : 'status-dot-warn'}`}
            />
            {health?.openaiConfigured ? 'Active' : 'Not configured'}
          </strong>
          <span>OpenAI API key (OPENAI_API_KEY)</span>
        </div>
        <div className="stat-tile">
          <strong>
            <span
              className={`status-dot ${health?.supabaseConfigured ? 'status-dot-ok' : 'status-dot-warn'}`}
            />
            {health?.supabaseConfigured ? 'Active' : 'Not configured'}
          </strong>
          <span>Supabase (SUPABASE_URL + SERVICE_ROLE_KEY)</span>
        </div>
        <div className="stat-tile">
          <strong>{health?.status ?? '—'}</strong>
          <span>Agent service status</span>
        </div>
      </div>

      <p style={{ color: 'var(--muted)', marginTop: '1rem' }}>
        Update credentials in your Vercel project environment variables and redeploy to apply changes.
      </p>
    </PageContainer>
  );
};
