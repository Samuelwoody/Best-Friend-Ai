# Best Friend AI - Memory System

This repository implements a production-oriented memory subsystem designed for agentic conversation runtimes.

## Features

- Structured memory records with:
  - emotional weight
  - relevance score
  - JSON context payload
- Linkages to both conversations and agents
- Retrieval hooks for runtime prompt construction
- SQLite storage with indexes for scalable filtering and ranking

## Quick start

```python
from memory_system import MemoryStorage, MemoryRetrievalHooks, RetrievalHookInput

storage = MemoryStorage("memory.db")
hooks = MemoryRetrievalHooks(storage)

storage.upsert_conversation("conv-123", "Support chat")
storage.upsert_agent("agent-42", "Companion")

hooks.ingest_event(
    content="User wants concise summaries",
    emotional_weight=0.8,
    relevance_score=0.9,
    context={"intent": "response-style", "source": "chat"},
    conversation_id="conv-123",
    agent_id="agent-42",
)

prompt_context = hooks.render_for_prompt(
    RetrievalHookInput(prompt="How should I respond?", conversation_id="conv-123", agent_id="agent-42")
)
print(prompt_context)
```

## Development

Run tests:

```bash
pytest -q
```
