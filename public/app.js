const state = {
  conversations: [],
  activeConversationId: null,
  isStreaming: false,
};

const elements = {
  conversationList: document.querySelector('#conversationList'),
  newConversationBtn: document.querySelector('#newConversationBtn'),
  chatTitle: document.querySelector('#chatTitle'),
  statusText: document.querySelector('#statusText'),
  errorBanner: document.querySelector('#errorBanner'),
  messageList: document.querySelector('#messageList'),
  composer: document.querySelector('#composer'),
  messageInput: document.querySelector('#messageInput'),
  sendBtn: document.querySelector('#sendBtn'),
  messageTemplate: document.querySelector('#messageTemplate'),
};

init().catch(showError);

async function init() {
  bindEvents();
  await loadConversations();
  renderMessages([]);
}

function bindEvents() {
  elements.newConversationBtn.addEventListener('click', () => {
    state.activeConversationId = null;
    renderMessages([]);
    setStatus('Idle', 'idle');
    clearError();
    renderConversationList();
    elements.chatTitle.textContent = 'New Conversation';
  });

  elements.composer.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (state.isStreaming) return;

    const message = elements.messageInput.value.trim();
    if (!message) return;

    clearError();
    elements.messageInput.value = '';
    appendMessage({ role: 'user', content: message });

    const assistantNode = appendMessage({ role: 'assistant', content: '' });
    await sendMessage(message, assistantNode);
  });
}

async function loadConversations() {
  const response = await fetch('/api/conversations');
  if (!response.ok) throw new Error('Failed to load conversations.');

  const data = await response.json();
  state.conversations = data.conversations;
  renderConversationList();

  if (state.conversations.length > 0) {
    await openConversation(state.conversations[0].id);
  }
}

async function openConversation(conversationId) {
  const response = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}`);
  if (!response.ok) throw new Error('Failed to open conversation.');

  const data = await response.json();
  state.activeConversationId = data.conversation.id;
  elements.chatTitle.textContent = data.conversation.title;
  renderMessages(data.conversation.messages);
  renderConversationList();
}

function renderConversationList() {
  elements.conversationList.innerHTML = '';

  for (const conversation of state.conversations) {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.textContent = `${conversation.title} (${conversation.messageCount})`;
    button.classList.toggle('active', conversation.id === state.activeConversationId);
    button.addEventListener('click', () => openConversation(conversation.id).catch(showError));
    item.append(button);
    elements.conversationList.append(item);
  }
}

function renderMessages(messages) {
  elements.messageList.innerHTML = '';
  for (const message of messages) {
    appendMessage(message);
  }
}

function appendMessage(message) {
  const fragment = elements.messageTemplate.content.cloneNode(true);
  const row = fragment.querySelector('.message-row');
  const bubble = fragment.querySelector('.bubble');

  row.classList.add(message.role);
  bubble.textContent = message.content;

  elements.messageList.append(row);
  elements.messageList.scrollTop = elements.messageList.scrollHeight;
  return bubble;
}

async function sendMessage(message, assistantNode) {
  state.isStreaming = true;
  elements.sendBtn.disabled = true;
  setStatus('Streaming response...', 'loading');

  try {
    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId: state.activeConversationId,
        message,
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error('Streaming failed.');
    }

    await consumeEventStream(response.body, (event, payload) => {
      if (event === 'meta' && payload.conversationId) {
        state.activeConversationId = payload.conversationId;
      }

      if (event === 'chunk') {
        assistantNode.textContent += payload.chunk;
        elements.messageList.scrollTop = elements.messageList.scrollHeight;
      }
    });

    await loadConversations();
    if (state.activeConversationId) {
      const current = state.conversations.find((c) => c.id === state.activeConversationId);
      if (current) elements.chatTitle.textContent = current.title;
    }
    setStatus('Idle', 'idle');
  } catch (error) {
    assistantNode.textContent = 'Sorry — there was an error while generating a response.';
    showError(error);
    setStatus('Error', 'idle');
  } finally {
    state.isStreaming = false;
    elements.sendBtn.disabled = false;
  }
}

async function consumeEventStream(stream, onEvent) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split('\n\n');
    buffer = blocks.pop() || '';

    for (const block of blocks) {
      const eventMatch = block.match(/^event: (.+)$/m);
      const dataMatch = block.match(/^data: (.+)$/m);
      if (!eventMatch || !dataMatch) continue;

      const eventName = eventMatch[1].trim();
      const payload = JSON.parse(dataMatch[1]);
      onEvent(eventName, payload);
      if (eventName === 'done') return;
    }
  }
}

function setStatus(text, tone) {
  elements.statusText.textContent = text;
  elements.statusText.className = `status ${tone}`;
}

function showError(error) {
  elements.errorBanner.classList.remove('hidden');
  elements.errorBanner.textContent = error.message || 'Unexpected error';
}

function clearError() {
  elements.errorBanner.classList.add('hidden');
  elements.errorBanner.textContent = '';
}
