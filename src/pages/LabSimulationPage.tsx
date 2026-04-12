import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageContainer } from '../components/common/PageContainer';
import { appendLabSessionEvent, completeLabSession, getLabSession } from '../lib/labApi';
import type { LabScenario, LabSession } from '../types/lab';

export const LabSimulationPage = () => {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();

  const [session, setSession] = useState<LabSession | null>(null);
  const [scenario, setScenario] = useState<LabScenario | null>(null);
  const [responseText, setResponseText] = useState('');
  const [emotionalState, setEmotionalState] = useState('');
  const [confidence, setConfidence] = useState('0.5');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError('Missing session ID.');
      setLoading(false);
      return;
    }

    getLabSession(sessionId)
      .then((payload) => {
        setSession(payload.session);
        setScenario(payload.scenario ?? null);
      })
      .catch((sessionError: Error) => {
        setError(sessionError.message);
      })
      .finally(() => setLoading(false));
  }, [sessionId]);

  const submitReflection = async () => {
    if (!sessionId) return;

    setSubmitting(true);
    setError(null);

    try {
      await appendLabSessionEvent(sessionId, {
        responseText,
        emotionalState: emotionalState || undefined,
        confidence: Number(confidence)
      });

      const refreshed = await getLabSession(sessionId);
      setSession(refreshed.session);
      setResponseText('');
      setEmotionalState('');
      setConfidence('0.5');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to submit reflection.');
    } finally {
      setSubmitting(false);
    }
  };

  const completeSimulation = async () => {
    if (!sessionId) return;

    setSubmitting(true);
    setError(null);

    try {
      await completeLabSession(sessionId);
      navigate(`/lab/results/${sessionId}`);
    } catch (completeError) {
      setError(completeError instanceof Error ? completeError.message : 'Failed to complete simulation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageContainer
      title="Simulation"
      description="Capture how you would respond and track emotional complexity signals over the session."
    >
      {loading ? <p>Loading session...</p> : null}
      {error ? <p className="status-error">{error}</p> : null}
      {session && scenario ? (
        <div className="simulation-layout">
          <section className="lab-card">
            <h3>{scenario.title}</h3>
            <p><strong>Prompt:</strong> {scenario.prompt}</p>
            <p><strong>Status:</strong> {session.status}</p>
            <p><strong>Reflections submitted:</strong> {session.events.length}</p>
          </section>

          <section className="lab-card">
            <h3>Submit Reflection</h3>
            <label className="lab-label" htmlFor="reflection-text">Response</label>
            <textarea
              id="reflection-text"
              value={responseText}
              onChange={(event) => setResponseText(event.target.value)}
              minLength={3}
              required
            />

            <label className="lab-label" htmlFor="emotion-state">Emotional State (optional)</label>
            <input
              id="emotion-state"
              className="lab-input"
              value={emotionalState}
              onChange={(event) => setEmotionalState(event.target.value)}
              placeholder="e.g., grounded, tense, empathetic"
            />

            <label className="lab-label" htmlFor="confidence-level">Confidence ({confidence})</label>
            <input
              id="confidence-level"
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={confidence}
              onChange={(event) => setConfidence(event.target.value)}
            />

            <div className="action-row">
              <button
                type="button"
                disabled={submitting || responseText.trim().length < 3 || session.status === 'completed'}
                onClick={() => {
                  void submitReflection();
                }}
              >
                Save Reflection
              </button>
              <button
                type="button"
                disabled={submitting || session.status === 'completed'}
                onClick={() => {
                  void completeSimulation();
                }}
              >
                Complete Session
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </PageContainer>
  );
};
