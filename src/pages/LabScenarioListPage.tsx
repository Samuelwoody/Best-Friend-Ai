import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '../components/common/PageContainer';
import { listLabScenarios, startLabSession } from '../lib/labApi';
import type { LabScenario } from '../types/lab';

export const LabScenarioListPage = () => {
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState<LabScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingScenarioId, setStartingScenarioId] = useState<string | null>(null);

  useEffect(() => {
    listLabScenarios()
      .then(setScenarios)
      .catch((loadError: Error) => {
        setError(loadError.message);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleStart = async (scenarioId: string) => {
    setError(null);
    setStartingScenarioId(scenarioId);

    try {
      const { session } = await startLabSession({ scenarioId });
      navigate(`/lab/simulation/${session.id}`);
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : 'Failed to start session.');
    } finally {
      setStartingScenarioId(null);
    }
  };

  return (
    <PageContainer
      title="Human Complexity Lab"
      description="Select a scenario to run a structured social and emotional simulation session."
    >
      {loading ? <p>Loading scenarios...</p> : null}
      {error ? <p className="status-error">{error}</p> : null}
      <div className="lab-grid">
        {scenarios.map((scenario) => (
          <article key={scenario.id} className="lab-card">
            <div className="lab-card-header">
              <h3>{scenario.title}</h3>
              <span className="lab-badge">{scenario.difficulty}</span>
            </div>
            <p><strong>Context:</strong> {scenario.context}</p>
            <p><strong>Objective:</strong> {scenario.objective}</p>
            <div className="lab-tag-row">
              {scenario.tags.map((tag) => (
                <span key={`${scenario.id}-${tag}`} className="lab-tag">#{tag}</span>
              ))}
            </div>
            <button
              type="button"
              disabled={startingScenarioId === scenario.id}
              onClick={() => {
                void handleStart(scenario.id);
              }}
            >
              {startingScenarioId === scenario.id ? 'Starting...' : 'Start Simulation'}
            </button>
          </article>
        ))}
      </div>
    </PageContainer>
  );
};
