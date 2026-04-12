from __future__ import annotations

import json
import sqlite3
import uuid
from contextlib import contextmanager
from dataclasses import asdict
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

from .models import Agent, Conversation, MemoryRecord, utc_now_iso


class MemoryStorage:
    """SQLite-backed, structured memory storage with conversation/agent links.

    Design goals:
    - scalable querying through indexes
    - structured JSON context payloads
    - explicit links between memories, conversations, and agents
    """

    def __init__(self, db_path: str | Path = "memory.db") -> None:
        self.db_path = str(db_path)
        self._initialize_schema()

    @contextmanager
    def _conn(self) -> Iterable[sqlite3.Connection]:
        connection = sqlite3.connect(self.db_path)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        try:
            yield connection
            connection.commit()
        except Exception:
            connection.rollback()
            raise
        finally:
            connection.close()

    def _initialize_schema(self) -> None:
        with self._conn() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS conversations (
                    id TEXT PRIMARY KEY,
                    title TEXT,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS agents (
                    id TEXT PRIMARY KEY,
                    name TEXT,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS memories (
                    id TEXT PRIMARY KEY,
                    content TEXT NOT NULL,
                    emotional_weight REAL NOT NULL,
                    relevance_score REAL NOT NULL,
                    context_json TEXT NOT NULL,
                    conversation_id TEXT,
                    agent_id TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL,
                    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL
                );

                CREATE INDEX IF NOT EXISTS idx_memories_conversation
                    ON memories(conversation_id);
                CREATE INDEX IF NOT EXISTS idx_memories_agent
                    ON memories(agent_id);
                CREATE INDEX IF NOT EXISTS idx_memories_relevance
                    ON memories(relevance_score DESC);
                CREATE INDEX IF NOT EXISTS idx_memories_weight
                    ON memories(emotional_weight DESC);
                """
            )

    def upsert_conversation(self, conversation_id: str, title: Optional[str] = None) -> Conversation:
        created_at = utc_now_iso()
        with self._conn() as conn:
            conn.execute(
                """
                INSERT INTO conversations(id, title, created_at)
                VALUES(?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET title=excluded.title
                """,
                (conversation_id, title, created_at),
            )
            row = conn.execute(
                "SELECT id, title, created_at FROM conversations WHERE id = ?",
                (conversation_id,),
            ).fetchone()
        return Conversation(id=row["id"], title=row["title"], created_at=row["created_at"])

    def upsert_agent(self, agent_id: str, name: Optional[str] = None) -> Agent:
        created_at = utc_now_iso()
        with self._conn() as conn:
            conn.execute(
                """
                INSERT INTO agents(id, name, created_at)
                VALUES(?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET name=excluded.name
                """,
                (agent_id, name, created_at),
            )
            row = conn.execute(
                "SELECT id, name, created_at FROM agents WHERE id = ?",
                (agent_id,),
            ).fetchone()
        return Agent(id=row["id"], name=row["name"], created_at=row["created_at"])

    def add_memory(
        self,
        *,
        content: str,
        emotional_weight: float,
        relevance_score: float,
        context: Dict[str, Any],
        conversation_id: Optional[str] = None,
        agent_id: Optional[str] = None,
        memory_id: Optional[str] = None,
    ) -> MemoryRecord:
        now = utc_now_iso()
        memory_id = memory_id or str(uuid.uuid4())
        context_json = json.dumps(context, separators=(",", ":"), sort_keys=True)

        with self._conn() as conn:
            conn.execute(
                """
                INSERT INTO memories(
                    id, content, emotional_weight, relevance_score,
                    context_json, conversation_id, agent_id, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    memory_id,
                    content,
                    emotional_weight,
                    relevance_score,
                    context_json,
                    conversation_id,
                    agent_id,
                    now,
                    now,
                ),
            )
            row = conn.execute("SELECT * FROM memories WHERE id = ?", (memory_id,)).fetchone()

        return self._row_to_memory(row)

    def update_relevance(self, memory_id: str, relevance_score: float) -> MemoryRecord:
        now = utc_now_iso()
        with self._conn() as conn:
            conn.execute(
                "UPDATE memories SET relevance_score = ?, updated_at = ? WHERE id = ?",
                (relevance_score, now, memory_id),
            )
            row = conn.execute("SELECT * FROM memories WHERE id = ?", (memory_id,)).fetchone()
            if row is None:
                raise KeyError(f"Memory {memory_id} not found")
        return self._row_to_memory(row)

    def retrieve_memories(
        self,
        *,
        conversation_id: Optional[str] = None,
        agent_id: Optional[str] = None,
        min_relevance: float = 0.0,
        limit: int = 20,
    ) -> List[MemoryRecord]:
        filters = ["relevance_score >= ?"]
        params: List[Any] = [min_relevance]

        if conversation_id:
            filters.append("conversation_id = ?")
            params.append(conversation_id)
        if agent_id:
            filters.append("agent_id = ?")
            params.append(agent_id)

        where_clause = " AND ".join(filters)
        query = f"""
            SELECT *
            FROM memories
            WHERE {where_clause}
            ORDER BY relevance_score DESC, emotional_weight DESC, created_at DESC
            LIMIT ?
        """
        params.append(limit)

        with self._conn() as conn:
            rows = conn.execute(query, params).fetchall()

        return [self._row_to_memory(row) for row in rows]

    @staticmethod
    def _row_to_memory(row: sqlite3.Row) -> MemoryRecord:
        if row is None:
            raise KeyError("Memory row not found")
        return MemoryRecord(
            id=row["id"],
            content=row["content"],
            emotional_weight=row["emotional_weight"],
            relevance_score=row["relevance_score"],
            context=json.loads(row["context_json"]),
            conversation_id=row["conversation_id"],
            agent_id=row["agent_id"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

    def export_memory(self, memory_id: str) -> Dict[str, Any]:
        with self._conn() as conn:
            row = conn.execute("SELECT * FROM memories WHERE id = ?", (memory_id,)).fetchone()
            if row is None:
                raise KeyError(f"Memory {memory_id} not found")
        return asdict(self._row_to_memory(row))
