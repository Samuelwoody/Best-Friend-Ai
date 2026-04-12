const CHUNK_DELAY_MS = 35;

function buildAssistantReply(input) {
  const normalized = input.trim();
  if (!normalized) {
    return 'I did not receive any message. Please type something and I can help.';
  }

  return [
    'Got it — here is a structured response based on your message.',
    '',
    `You said: "${normalized}"`,
    '',
    'Next steps:',
    '1) Clarify your goal.',
    '2) Add key constraints.',
    '3) Ask for a concrete output format.',
  ].join('\n');
}

async function* streamAssistantReply(input) {
  const reply = buildAssistantReply(input);
  const words = reply.split(/(\s+)/).filter(Boolean);

  for (const word of words) {
    await delay(CHUNK_DELAY_MS);
    yield word;
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { streamAssistantReply };
