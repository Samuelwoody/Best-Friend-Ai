import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageContainer } from '../components/common/PageContainer';
import { getLabSessionResult } from '../lib/labApi';
import type { LabSessionResult } from '../types/lab';

export const LabResultsPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [result, setResult] = useState<LabSessionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError('Missing session ID.');
      setLoading(false);
      return;
    }

    getLabSessionResult(sessionId)
      .then(setResult)
      .catch((resultError: Error) => {
        setError(resultError.message);
      })
      .finally(() => setLoading(false));
  }, [sessionId]);

  return (
    <PageContainer
      title="Results"
      description="Review simulation output and confidence indicators for your completed session."
    >
      {loading ? <p>Loading results...</p> : null}
      {error ? <p className="status-error">{error}</p> : null}

      {result ? (
        <article className="lab-card">
          <h3>Session {result.sessionId}</h3>
          <p><strong>Scenario:</strong> {result.scenarioId}</p>
          <p><strong>Completed:</strong> {new Date(result.completedAt).toLocaleString()}</p>
          <p><strong>Reflections:</strong> {result.eventCount}</p>
          <p><strong>Average confidence:</strong> {result.averageConfidence ?? 'Not captured'}</p>
          <p><strong>Summary:</strong> {result.summary}</p>
          <Link className="lab-link" to="/lab/scenarios">Run another scenario</Link>
        </article>
      ) : null}
    </PageContainer>
  );
};
