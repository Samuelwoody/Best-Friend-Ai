export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface StreamOptions {
  message: string;
  history: ChatMessage[];
  agentId?: string;
  signal?: AbortSignal;
  onChunk: (text: string) => void;
}

export async function streamChat({ message, history, agentId, signal, onChunk }: StreamOptions): Promise<void> {
  const response = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history, agentId }),
    signal
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Chat request failed (${response.status})`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Streaming is not supported in this environment.');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';

    for (const rawEvent of events) {
      const lines = rawEvent.split('\n');
      let eventName = 'message';
      let dataLine = '';

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          eventName = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
          dataLine = line.slice(6);
        }
      }

      if (!dataLine) continue;

      try {
        const payload = JSON.parse(dataLine);
        if (eventName === 'chunk' && typeof payload.content === 'string') {
          onChunk(payload.content);
        } else if (eventName === 'error') {
          throw new Error(payload.message ?? 'Chat stream error');
        }
      } catch (parseError) {
        if (parseError instanceof SyntaxError) continue;
        throw parseError;
      }
    }
  }
}
