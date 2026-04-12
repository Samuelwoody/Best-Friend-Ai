const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs/promises');
const { ConversationStore } = require('./conversationStore');
const { streamAssistantReply } = require('./chatService');

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(process.cwd(), 'public');
const store = new ConversationStore();

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

async function bootstrap() {
  await store.init();
  const server = http.createServer((req, res) => {
    handleRequest(req, res).catch((error) => {
      console.error(error);
      const statusCode = error.statusCode && Number.isInteger(error.statusCode) ? error.statusCode : 500;
      sendJson(res, statusCode, {
        error: statusCode === 500 ? 'Internal server error' : error.message,
      });
    });
  });

  server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });

  process.on('SIGINT', async () => {
    await store.waitForPendingWrites();
    process.exit(0);
  });
}

async function handleRequest(req, res) {
  const url = new URL(req.url, 'http://localhost');

  if (req.method === 'GET' && url.pathname === '/api/conversations') {
    return sendJson(res, 200, { conversations: store.listConversations() });
  }

  if (req.method === 'GET' && url.pathname.startsWith('/api/conversations/')) {
    const id = decodeURIComponent(url.pathname.split('/').pop());
    const conversation = store.getConversation(id);
    if (!conversation) return sendJson(res, 404, { error: 'Conversation not found' });
    return sendJson(res, 200, { conversation });
  }

  if (req.method === 'POST' && url.pathname === '/api/conversations') {
    const body = await parseJsonBody(req);
    const conversation = store.createConversation(body?.message ?? null);
    return sendJson(res, 201, { conversation });
  }

  if (req.method === 'POST' && url.pathname === '/api/chat/stream') {
    const body = await parseJsonBody(req);
    if (!body?.message || typeof body.message !== 'string') {
      return sendJson(res, 400, { error: 'Message is required' });
    }

    let conversation = body.conversationId
      ? store.getConversation(body.conversationId)
      : store.createConversation(body.message);

    if (!conversation) {
      conversation = store.createConversation(body.message);
    }

    store.appendMessage(conversation.id, { role: 'user', content: body.message });

    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    });

    res.write(`event: meta\ndata: ${JSON.stringify({ conversationId: conversation.id })}\n\n`);

    let assistantContent = '';
    for await (const chunk of streamAssistantReply(body.message)) {
      assistantContent += chunk;
      res.write(`event: chunk\ndata: ${JSON.stringify({ chunk })}\n\n`);
    }

    store.appendMessage(conversation.id, { role: 'assistant', content: assistantContent });
    res.write('event: done\ndata: {}\n\n');
    res.end();
    return;
  }

  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    return serveStaticFile(res, 'index.html');
  }

  if (req.method === 'GET') {
    return serveStaticFile(res, url.pathname.slice(1));
  }

  sendJson(res, 404, { error: 'Not found' });
}

async function parseJsonBody(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
  }

  if (!raw.trim()) return {};

  try {
    return JSON.parse(raw);
  } catch {
    throw Object.assign(new Error('Invalid JSON body'), { statusCode: 400 });
  }
}

async function serveStaticFile(res, relativePath) {
  const normalized = path.normalize(relativePath).replace(/^([.][.][/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, normalized);

  try {
    const file = await fs.readFile(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'text/plain; charset=utf-8' });
    res.end(file);
  } catch (error) {
    if (error.code === 'ENOENT') {
      sendJson(res, 404, { error: 'Asset not found' });
      return;
    }
    throw error;
  }
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(`${JSON.stringify(payload)}\n`);
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
