from memory_system import MemoryRetrievalHooks, MemoryStorage, RetrievalHookInput


def test_memory_lifecycle(tmp_path):
    db = tmp_path / "memory.db"
    storage = MemoryStorage(db)
    hooks = MemoryRetrievalHooks(storage)

    storage.upsert_conversation("conv-1", "Onboarding")
    storage.upsert_agent("agent-1", "Support")

    hooks.ingest_event(
        content="User prefers concise responses",
        emotional_weight=0.7,
        relevance_score=0.9,
        context={"topic": "style", "source": "conversation"},
        conversation_id="conv-1",
        agent_id="agent-1",
    )
    hooks.ingest_event(
        content="User likes weekend travel planning",
        emotional_weight=0.4,
        relevance_score=0.6,
        context={"topic": "travel"},
        conversation_id="conv-1",
        agent_id="agent-1",
    )

    results = hooks.fetch(
        RetrievalHookInput(
            prompt="How should I answer?",
            conversation_id="conv-1",
            agent_id="agent-1",
            min_relevance=0.5,
        )
    )

    assert len(results) == 2
    assert results[0].relevance_score >= results[1].relevance_score
    assert results[0].conversation_id == "conv-1"
    assert results[0].agent_id == "agent-1"


def test_prompt_rendering(tmp_path):
    storage = MemoryStorage(tmp_path / "memory.db")
    hooks = MemoryRetrievalHooks(storage)

    hooks.ingest_event(
        content="Project deadline is Thursday",
        emotional_weight=0.8,
        relevance_score=0.75,
        context={"project": "alpha"},
    )

    rendered = hooks.render_for_prompt(RetrievalHookInput(prompt="status update"))

    assert "Relevant memory context:" in rendered
    assert "Project deadline is Thursday" in rendered
