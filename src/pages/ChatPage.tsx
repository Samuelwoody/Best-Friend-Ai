import { useEffect, useRef, useState } from 'react';
import { PageContainer } from '../components/common/PageContainer';
import { listAgents } from '../lib/api';
import { streamChat, type ChatMessage } from '../lib/chatApi';
import type { Agent } from '../types/agent';

interface ConversationMessage extends ChatMessage {
  id: string;
}

export const ChatPage = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    listAgents()
      .then(setAgents)
      .catch(() => {
        // Non-blocking; chat still works without agents.
      });
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

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
        agentId: selectedAgentId || undefined,
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
      title="Chat"
      description="Converse with Best Friend AI in real time. Pick an agent to adopt its identity."
    >
      <div className="chat-shell">
        <div className="chat-toolbar">
          <label className="lab-label" htmlFor="chat-agent-select">
            Agent persona
          </label>
          <select
            id="chat-agent-select"
            className="lab-input"
            value={selectedAgentId}
            onChange={(event) => setSelectedAgentId(event.target.value)}
            disabled={sending}
          >
            <option value="">Default companion</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name} — {agent.currentIdentity.role}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="ghost-button"
            onClick={() => setMessages([])}
            disabled={sending || messages.length === 0}
          >
            Clear
          </button>
        </div>

        <div className="chat-stream" ref={scrollRef}>
          {messages.length === 0 ? (
            <p className="chat-empty">Start the conversation below.</p>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`chat-bubble chat-bubble-${msg.role}`}>
                <span className="chat-role">{msg.role === 'user' ? 'You' : 'Assistant'}</span>
                <p>{msg.content || (sending ? '…' : '')}</p>
              </div>
            ))
          )}
        </div>

        {error ? <p className="status-error">{error}</p> : null}

        <div className="chat-input-row">
          <textarea
            rows={2}
            value={input}
            placeholder="Write a message… (Enter to send, Shift+Enter for newline)"
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
          />
          <button type="button" onClick={() => void handleSend()} disabled={sending || !input.trim()}>
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>
    </PageContainer>
  );
};
