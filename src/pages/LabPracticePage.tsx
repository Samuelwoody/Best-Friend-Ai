import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageContainer } from '../components/common/PageContainer';
import { listAgents } from '../lib/api';
import { listLabScenarios } from '../lib/labApi';
import { streamChat, type ChatMessage } from '../lib/chatApi';
import type { Agent } from '../types/agent';
import type { LabScenario } from '../types/lab';

interface ConversationMessage extends ChatMessage {
  id: string;
}

export const LabPracticePage = () => {
  const { scenarioId, agentId } = useParams<{ scenarioId: string; agentId: string }>();

  const [scenario, setScenario] = useState<LabScenario | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const openerTriggered = useRef(false);

  useEffect(() => {
    if (!scenarioId || !agentId) {
      setError('Missing scenario or agent.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    Promise.all([listLabScenarios(), listAgents()])
      .then(([scenarios, agents]) => {
        if (cancelled) return;
        const foundScenario = scenarios.find((s) => s.id === scenarioId) ?? null;
        const foundAgent = agents.find((a) => a.id === agentId) ?? null;
        setScenario(foundScenario);
        setAgent(foundAgent);
        if (!foundScenario) setError('Scenario not found.');
        else if (!foundAgent) setError('Agent not found.');
      })
      .catch((loadError: Error) => {
        if (!cancelled) setError(loadError.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [scenarioId, agentId]);

  useEffect(() => {
    if (!scenario || !agent || openerTriggered.current) return;
    if (scenario.initiator !== 'agent') return;

    openerTriggered.current = true;

    const opener: ConversationMessage = {
      id: `${Date.now()}-opener`,
      role: 'assistant',
      content: ''
    };
    setMessages([opener]);
    setSending(true);

    streamChat({
      history: [],
      agentId: agent.id,
      scenarioId: scenario.id,
      isOpening: true,
      onChunk: (text) => {
        setMessages((prev) =>
          prev.map((msg) => (msg.id === opener.id ? { ...msg, content: msg.content + text } : msg))
        );
      }
    })
      .catch((openerError: Error) => {
        setError(openerError.message);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === opener.id && msg.content === ''
              ? { ...msg, content: `⚠️ ${openerError.message}` }
              : msg
          )
        );
      })
      .finally(() => setSending(false));
  }, [scenario, agent]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending || !scenario || !agent) return;

    const userMessage: ConversationMessage = {
      id: `${Date.now()}-u`,
      role: 'user',
      content: trimmed
    };
    const assistantMessage: ConversationMessage = {
      id: `${Date.now()}-a`,
      role: 'assistant',
      content: ''
    };

    const history = messages.map(({ role, content }) => ({ role, content }));

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInput('');
    setSending(true);
    setError(null);

    try {
      await streamChat({
        message: trimmed,
        history,
        agentId: agent.id,
        scenarioId: scenario.id,
        onChunk: (text) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessage.id ? { ...msg, content: msg.content + text } : msg
            )
          );
        }
      });
    } catch (sendError) {
      const reason = sendError instanceof Error ? sendError.message : 'Chat request failed.';
      setError(reason);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessage.id && msg.content === ''
            ? { ...msg, content: `⚠️ ${reason}` }
            : msg
        )
      );
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  return (
    <PageContainer
      title={scenario?.title ?? 'Practice'}
      description="Rehearse the conversation with an agent role-playing the other person."
    >
      {loading ? <p>Loading scenario…</p> : null}
      {error ? <p className="status-error">{error}</p> : null}

      {scenario && agent ? (
        <div className="chat-shell">
          <div className="lab-card" style={{ marginBottom: '0.75rem' }}>
            <p style={{ margin: 0 }}>
              <strong>Setting:</strong> {scenario.context}
            </p>
            <p style={{ margin: '0.4rem 0 0', color: 'var(--muted)' }}>
              <strong>Your goal:</strong> {scenario.objective}
            </p>
            <p style={{ margin: '0.4rem 0 0', color: 'var(--muted)' }}>
              <strong>Practicing with:</strong> {agent.name} ·{' '}
              {scenario.initiator === 'agent'
                ? 'they will start the conversation'
                : 'you start the conversation'}
            </p>
          </div>

          <div className="chat-stream" ref={scrollRef}>
            {messages.length === 0 ? (
              <p className="chat-empty">
                {scenario.initiator === 'user'
                  ? 'Open with whatever feels natural to you.'
                  : 'Waiting for your conversation partner…'}
              </p>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`chat-bubble chat-bubble-${msg.role}`}>
                  <span className="chat-role">{msg.role === 'user' ? 'You' : agent.name}</span>
                  <p>{msg.content || (sending ? '…' : '')}</p>
                </div>
              ))
            )}
          </div>

          <div className="chat-input-row">
            <textarea
              rows={2}
              value={input}
              placeholder="Write your message… (Enter to send, Shift+Enter for newline)"
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending}
            />
            <button type="button" onClick={() => void handleSend()} disabled={sending || !input.trim()}>
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>

          <div className="lab-link-row" style={{ marginTop: '0.75rem' }}>
            <Link className="lab-link" to="/lab/scenarios">
              ← Back to scenarios
            </Link>
          </div>
        </div>
      ) : null}
    </PageContainer>
  );
};
