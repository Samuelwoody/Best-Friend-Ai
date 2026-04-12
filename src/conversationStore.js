const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

class ConversationStore {
  constructor(options = {}) {
    this.filePath = options.filePath ?? path.join(process.cwd(), 'data', 'conversations.json');
    this.conversations = new Map();
    this.persistScheduled = false;
    this.lastPersist = Promise.resolve();
  }

  async init() {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });

    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      if (!raw.trim()) return;

      const parsed = JSON.parse(raw);
      for (const convo of parsed.conversations ?? []) {
        this.conversations.set(convo.id, convo);
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw new Error(`Failed to load conversations: ${error.message}`);
      }
    }
  }

  listConversations() {
    return Array.from(this.conversations.values())
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .map((conversation) => ({
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        messageCount: conversation.messages.length,
      }));
  }

  getConversation(id) {
    return this.conversations.get(id) ?? null;
  }

  createConversation(initialMessage = null) {
    const now = new Date().toISOString();
    const conversation = {
      id: crypto.randomUUID(),
      title: this.buildTitle(initialMessage),
      createdAt: now,
      updatedAt: now,
      messages: [],
    };

    this.conversations.set(conversation.id, conversation);
    this.schedulePersist();
    return conversation;
  }

  appendMessage(conversationId, message) {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    conversation.messages.push({
      id: crypto.randomUUID(),
      role: message.role,
      content: message.content,
      createdAt: new Date().toISOString(),
    });
    conversation.updatedAt = new Date().toISOString();

    if (conversation.messages.length === 1) {
      conversation.title = this.buildTitle(conversation.messages[0].content);
    }

    this.schedulePersist();
    return conversation;
  }

  async waitForPendingWrites() {
    await this.lastPersist;
  }

  buildTitle(text) {
    if (!text || !text.trim()) return 'New Conversation';
    const trimmed = text.trim().replace(/\s+/g, ' ');
    return trimmed.length > 50 ? `${trimmed.slice(0, 47)}...` : trimmed;
  }

  schedulePersist() {
    if (this.persistScheduled) return;

    this.persistScheduled = true;
    this.lastPersist = this.lastPersist.then(async () => {
      await new Promise((resolve) => setTimeout(resolve, 25));
      this.persistScheduled = false;
      const payload = {
        conversations: Array.from(this.conversations.values()),
      };
      await fs.writeFile(this.filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    });
  }
}

module.exports = { ConversationStore };
