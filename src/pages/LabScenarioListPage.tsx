import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '../components/common/PageContainer';
import { listAgents } from '../lib/api';
import { listLabScenarios } from '../lib/labApi';
import type { Agent } from '../types/agent';
import type { LabScenario } from '../types/lab';

export const LabScenarioListPage = () => {
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState<LabScenario[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<LabScenario | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');

  useEffect(() => {
    Promise.all([listLabScenarios(), listAgents()])
      .then(([scenarioList, agentList]) => {
        setScenarios(scenarioList);
        setAgents(agentList);
        if (agentList.length > 0) setSelectedAgentId(agentList[0].id);
      })
      .catch((loadError: Error) => setError(loadError.message))
      .finally(() => setLoading(false));
  }, []);

  const startPractice = () => {
    if (!selectedScenario || !selectedAgentId) return;
    navigate(`/lab/practice/${selectedScenario.id}/${selectedAgentId}`);
  };

  return (
    <PageContainer
      title="Human Complexity Lab"
      description="Pick a scenario and an agent to rehearse a difficult conversation."
    >
      {loading ? <p>Loading scenarios…</p> : null}
      {error ? <p className="status-error">{error}</p> : null}

      <div className="lab-grid">
        {scenarios.map((scenario) => (
          <article
            key={scenario.id}
            className="lab-card"
            style={
              selectedScenario?.id === scenario.id
                ? { borderColor: 'var(--accent)', boxShadow: '0 0 0 1px var(--accent)' }
                : undefined
            }
          >
            <div className="lab-card-header">
              <h3>{scenario.title}</h3>
              <span className="lab-badge">{scenario.difficulty}</span>
            </div>
            <p>
              <strong>Setting:</strong> {scenario.context}
            </p>
            <p>
              <strong>Goal:</strong> {scenario.objective}
            </p>
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem', margin: 0 }}>
              {scenario.initiator === 'agent'
                ? 'The other person starts the conversation.'
                : 'You start the conversation.'}
            </p>
            <div className="lab-tag-row">
              {scenario.tags.map((tag) => (
                <span key={`${scenario.id}-${tag}`} className="lab-tag">
                  #{tag}
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setSelectedScenario(scenario)}
              disabled={selectedScenario?.id === scenario.id}
            >
              {selectedScenario?.id === scenario.id ? 'Selected' : 'Choose this scenario'}
            </button>
          </article>
        ))}
      </div>

      {selectedScenario ? (
        <div className="lab-card" style={{ marginTop: '1rem' }}>
          <h3 style={{ margin: '0 0 0.5rem' }}>Pick a practice partner</h3>
          {agents.length === 0 ? (
            <p className="status-error">
              You need at least one agent. Create one in <strong>Create Agent</strong> first.
            </p>
          ) : (
            <>
              <p style={{ color: 'var(--muted)', margin: '0 0 0.75rem' }}>
                The agent you select will play the role of the other person in the conversation.
              </p>
              <select
                className="lab-input"
                value={selectedAgentId}
                onChange={(event) => setSelectedAgentId(event.target.value)}
              >
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name} — {agent.currentIdentity.role} / {agent.currentIdentity.relationalStyle}
                  </option>
                ))}
              </select>
              <div className="action-row">
                <button type="button" onClick={() => setSelectedScenario(null)}>
                  Cancel
                </button>
                <button type="button" onClick={startPractice} disabled={!selectedAgentId}>
                  Start practice
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}
    </PageContainer>
  );
};
