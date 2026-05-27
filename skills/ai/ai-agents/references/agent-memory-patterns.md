# Agent Memory Patterns

## Overview

Memory is the backbone of stateful AI agents. Without memory, every interaction starts from scratch. This reference covers memory architectures, retrieval strategies, persistence backends, and practical implementation patterns for production agent systems.

## Memory Types

### Conversational Memory

Stores the raw dialog history as a list of messages.

```python
from dataclasses import dataclass, field
from typing import List, Dict, Optional

@dataclass
class ConversationMemory:
    messages: List[Dict] = field(default_factory=list)
    max_turns: int = 20

    def add_message(self, role: str, content: str, metadata: Optional[Dict] = None):
        self.messages.append({
            "role": role,
            "content": content,
            "metadata": metadata or {}
        })
        if len(self.messages) > self.max_turns * 2:
            self.messages = self.messages[-(self.max_turns * 2):]

    def get_context(self) -> List[Dict]:
        return [{"role": m["role"], "content": m["content"]} for m in self.messages]

    def clear(self):
        self.messages = []
```

### Summary Memory

Periodically summarizes older conversation turns to compress history while preserving key information.

```python
import asyncio
from typing import List, Dict

class SummaryMemory:
    def __init__(self, llm, summary_threshold: int = 10):
        self.llm = llm
        self.summary_threshold = summary_threshold
        self.recent_messages: List[Dict] = []
        self.summary: str = ""

    async def add_and_compress(self, messages: List[Dict]) -> str:
        self.recent_messages.extend(messages)
        if len(self.recent_messages) >= self.summary_threshold:
            context = "\n".join(
                f"{m['role']}: {m['content']}" for m in self.recent_messages
            )
            self.summary = await self.llm.generate(
                f"Summarize the following conversation, preserving key facts, decisions, and user preferences:\n{context}"
            )
            self.recent_messages = []
        return self.summary

    def get_context(self) -> str:
        recent = "\n".join(
            f"{m['role']}: {m['content']}" for m in self.recent_messages[-6:]
        )
        if self.summary:
            return f"Previous conversation summary:\n{self.summary}\n\nRecent messages:\n{recent}"
        return recent
```

### Entity Memory

Extracts and tracks named entities (people, places, concepts, preferences) across conversations.

```python
import re
from typing import Dict, List, Set

class EntityMemory:
    def __init__(self):
        self.entities: Dict[str, Dict] = {}

    def extract_entities(self, text: str) -> List[str]:
        patterns = [
            r"\b[A-Z][a-z]+ [A-Z][a-z]+\b",
            r"\b(?:API|DB|CLI|UI|UX|SDK|LLM|RAG)\b",
            r"\b[A-Za-z]+Project\b",
            r"\b[A-Za-z]+Service\b",
        ]
        found: Set[str] = set()
        for pattern in patterns:
            found.update(re.findall(pattern, text))
        return list(found)

    def update(self, text: str, metadata: Optional[Dict] = None):
        extracted = self.extract_entities(text)
        for entity in extracted:
            if entity not in self.entities:
                self.entities[entity] = {
                    "mentions": 0,
                    "first_seen": None,
                    "attributes": {},
                }
            self.entities[entity]["mentions"] += 1
            if metadata:
                self.entities[entity]["attributes"].update(metadata)

    def get_relevant(self, query: str, top_k: int = 5) -> List[str]:
        query_lower = query.lower()
        scored = []
        for name, data in self.entities.items():
            score = data["mentions"]
            if query_lower in name.lower():
                score += 10
            for attr_val in data["attributes"].values():
                if isinstance(attr_val, str) and query_lower in attr_val.lower():
                    score += 5
            scored.append((name, score))
        scored.sort(key=lambda x: -x[1])
        return [name for name, _ in scored[:top_k]]

    def get_context(self, query: str) -> str:
        relevant = self.get_relevant(query)
        lines = []
        for name in relevant:
            ent = self.entities[name]
            attrs = ", ".join(f"{k}={v}" for k, v in ent["attributes"].items())
            if attrs:
                lines.append(f"- {name} ({attrs}, mentioned {ent['mentions']} times)")
            else:
                lines.append(f"- {name} (mentioned {ent['mentions']} times)")
        return "Known entities:\n" + "\n".join(lines)
```

### Vector Memory

Stores conversation chunks as embeddings for semantic retrieval. Most powerful but most expensive.

```python
import numpy as np
from typing import List, Dict, Optional, Callable

class VectorMemoryEntry:
    def __init__(self, text: str, embedding: List[float], metadata: Dict):
        self.text = text
        self.embedding = np.array(embedding)
        self.metadata = metadata

class VectorMemory:
    def __init__(self, embedder: Callable, similarity: str = "cosine"):
        self.embedder = embedder
        self.entries: List[VectorMemoryEntry] = []
        self.similarity = similarity

    async def add(self, text: str, metadata: Optional[Dict] = None):
        embedding = await self.embedder(text)
        self.entries.append(VectorMemoryEntry(text, embedding, metadata or {}))

    def _cosine_similarity(self, a: np.ndarray, b: np.ndarray) -> float:
        dot = np.dot(a, b)
        norm = np.linalg.norm(a) * np.linalg.norm(b)
        return float(dot / norm) if norm > 0 else 0.0

    async def search(self, query: str, top_k: int = 5) -> List[Dict]:
        query_emb = np.array(await self.embedder(query))
        scored = []
        for entry in self.entries:
            score = self._cosine_similarity(query_emb, entry.embedding)
            scored.append((score, entry))
        scored.sort(key=lambda x: -x[0])
        return [
            {"text": entry.text, "score": score, "metadata": entry.metadata}
            for score, entry in scored[:top_k]
        ]

    async def get_context(self, query: str, top_k: int = 3) -> str:
        results = await self.search(query, top_k=top_k)
        if not results:
            return ""
        sections = ["Relevant previous context:"]
        for i, r in enumerate(results, 1):
            sections.append(f"[{i}] (relevance: {r['score']:.2f}) {r['text']}")
        return "\n".join(sections)
```

## Hybrid Memory Architecture

Combines all memory types for comprehensive context management.

```python
from typing import List, Dict, Optional

class HybridMemory:
    def __init__(self, llm, embedder, config: Optional[Dict] = None):
        self.config = config or {
            "conversation_max_turns": 20,
            "summary_threshold": 10,
            "vector_top_k": 3,
            "entity_enabled": True,
        }
        self.conversation = ConversationMemory(
            max_turns=self.config["conversation_max_turns"]
        )
        self.summary = SummaryMemory(llm, self.config["summary_threshold"])
        self.entity = EntityMemory() if self.config["entity_enabled"] else None
        self.vector = VectorMemory(embedder)

    async def add_message(self, role: str, content: str, metadata: Optional[Dict] = None):
        self.conversation.add_message(role, content, metadata)
        if self.entity:
            self.entity.update(content, metadata)
        if metadata and metadata.get("persist", False):
            await self.vector.add(content, {"role": role, **metadata})

    async def build_context(self, query: str) -> List[Dict]:
        messages = self.conversation.get_context()
        summary_text = await self.summary.add_and_compress(self.conversation.messages[-2:])
        vector_context = await self.vector.get_context(query, self.config["vector_top_k"])
        entity_context = self.entity.get_context(query) if self.entity else ""

        system_prompt = "You are a helpful assistant with memory."
        if summary_text:
            system_prompt += f"\n\n{summary_text}"
        if entity_context:
            system_prompt += f"\n\n{entity_context}"
        if vector_context:
            system_prompt += f"\n\n{vector_context}"

        return [{"role": "system", "content": system_prompt}, *messages]
```

## Persistence Backends

### Redis for Short-Term Memory

```python
import json
import redis.asyncio as redis

class RedisConversationMemory:
    def __init__(self, redis_url: str = "redis://localhost:6379", ttl: int = 3600):
        self.redis = redis.from_url(redis_url)
        self.ttl = ttl

    async def add_message(self, session_id: str, role: str, content: str):
        key = f"session:{session_id}:messages"
        message = json.dumps({"role": role, "content": content})
        await self.redis.rpush(key, message)
        await self.redis.expire(key, self.ttl)

    async def get_messages(self, session_id: str, limit: int = 20) -> List[Dict]:
        key = f"session:{session_id}:messages"
        raw = await self.redis.lrange(key, -limit, -1)
        return [json.loads(m) for m in raw]

    async def clear_session(self, session_id: str):
        await self.redis.delete(f"session:{session_id}:messages")
```

### PostgreSQL for Long-Term Memory

```python
import asyncpg
from typing import List, Dict, Optional
from datetime import datetime

class PostgresEntityMemory:
    def __init__(self, dsn: str):
        self.dsn = dsn

    async def _connect(self):
        return await asyncpg.connect(self.dsn)

    async def store_entity(self, session_id: str, name: str, attributes: Dict):
        conn = await self._connect()
        try:
            await conn.execute(
                """
                INSERT INTO entity_memory (session_id, entity_name, attributes, updated_at)
                VALUES ($1, $2, $3::jsonb, NOW())
                ON CONFLICT (session_id, entity_name)
                DO UPDATE SET attributes = $3::jsonb, updated_at = NOW(),
                              mention_count = entity_memory.mention_count + 1
                """,
                session_id, name, json.dumps(attributes)
            )
        finally:
            await conn.close()

    async def get_entities(self, session_id: str) -> List[Dict]:
        conn = await self._connect()
        try:
            rows = await conn.fetch(
                "SELECT entity_name, attributes, mention_count FROM entity_memory "
                "WHERE session_id = $1 ORDER BY mention_count DESC",
                session_id
            )
            return [dict(r) for r in rows]
        finally:
            await conn.close()

    async def search_entities(self, session_id: str, query: str) -> List[Dict]:
        conn = await self._connect()
        try:
            rows = await conn.fetch(
                """
                SELECT entity_name, attributes, mention_count FROM entity_memory
                WHERE session_id = $1
                  AND (entity_name % $2 OR attributes::text % $2)
                ORDER BY mention_count DESC LIMIT 10
                """,
                session_id, query
            )
            return [dict(r) for r in rows]
        finally:
            await conn.close()
```

### Vector Database for Semantic Memory

```python
from qdrant_client import QdrantClient, models
from typing import List, Dict, Optional

class QdrantVectorMemory:
    def __init__(self, host: str = "localhost", port: int = 6333, collection: str = "agent_memory"):
        self.client = QdrantClient(host=host, port=port)
        self.collection = collection

    async def ensure_collection(self, vector_size: int = 1536):
        collections = self.client.get_collections().collections
        if not any(c.name == self.collection for c in collections):
            self.client.create_collection(
                collection_name=self.collection,
                vectors_config=models.VectorParams(
                    size=vector_size, distance=models.Distance.COSINE
                ),
            )

    async def store(self, session_id: str, text: str, vector: List[float], metadata: Dict):
        self.client.upsert(
            collection_name=self.collection,
            points=[
                models.PointStruct(
                    id=hash(f"{session_id}:{text[:50]}"),
                    vector=vector,
                    payload={"session_id": session_id, "text": text, **metadata},
                )
            ],
        )

    async def search(self, session_id: str, vector: List[float], top_k: int = 5) -> List[Dict]:
        results = self.client.search(
            collection_name=self.collection,
            query_vector=vector,
            query_filter=models.Filter(
                must=[models.FieldCondition(
                    key="session_id", match=models.MatchValue(value=session_id)
                )]
            ),
            limit=top_k,
        )
        return [{"text": r.payload["text"], "score": r.score, "metadata": r.payload} for r in results]
```

## Memory Window Strategies

### Sliding Window

Keeps only the last N turns. Simple, fixed cost, loses older context.

```python
class SlidingWindowStrategy:
    def __init__(self, window_size: int = 10):
        self.window_size = window_size
        self.history: List[Dict] = []

    def add(self, message: Dict):
        self.history.append(message)
        if len(self.history) > self.window_size:
            self.history.pop(0)

    def get_context(self) -> List[Dict]:
        return self.history
```

### Token-Budget Window

Trims history to stay within a token budget by dropping oldest messages.

```python
class TokenBudgetWindow:
    def __init__(self, max_tokens: int = 4096, token_counter: callable = len):
        self.max_tokens = max_tokens
        self.token_counter = token_counter
        self.history: List[Dict] = []

    def add(self, message: Dict):
        self.history.append(message)
        total = sum(self.token_counter(json.dumps(m)) for m in self.history)
        while total > self.max_tokens and len(self.history) > 1:
            removed = self.history.pop(0)
            total -= self.token_counter(json.dumps(removed))

    def get_context(self) -> List[Dict]:
        return self.history
```

### Importance-Weighted Retention

Ranks messages by importance and keeps the most important ones.

```python
class ImportanceWeightedMemory:
    def __init__(self, llm, capacity: int = 20):
        self.llm = llm
        self.capacity = capacity
        self.memories: List[Dict] = []

    async def add(self, message: Dict):
        importance = await self._rate_importance(message)
        self.memories.append({**message, "_importance": importance})
        self.memories.sort(key=lambda m: m.get("_importance", 0), reverse=True)
        if len(self.memories) > self.capacity:
            self.memories = self.memories[:self.capacity]

    async def _rate_importance(self, message: Dict) -> float:
        prompt = f"Rate the importance of this message on a scale of 0-10: {message['content']}"
        result = await self.llm.generate(prompt)
        try:
            return float(result.strip())
        except ValueError:
            return 5.0

    def get_context(self) -> List[Dict]:
        return [{"role": m["role"], "content": m["content"]} for m in self.memories]
```

## Memory Consolidation Patterns

### Periodic Background Summarization

```python
import asyncio

class BackgroundConsolidator:
    def __init__(self, memory: HybridMemory, interval_seconds: int = 300):
        self.memory = memory
        self.interval = interval_seconds
        self._task = None

    async def start(self):
        async def _run():
            while True:
                await asyncio.sleep(self.interval)
                if len(self.memory.conversation.messages) > 0:
                    consolidated = await self.memory.summary.add_and_compress(
                        self.memory.conversation.messages[-2:]
                    )
        self._task = asyncio.create_task(_run())

    async def stop(self):
        if self._task:
            self._task.cancel()
```

### Hierarchical Memory Graph

```python
class MemoryNode:
    def __init__(self, content: str, level: int = 0):
        self.content = content
        self.level = level
        self.children: List[MemoryNode] = []
        self.parent: Optional[MemoryNode] = None

class HierarchicalMemory:
    def __init__(self, llm, max_depth: int = 3):
        self.llm = llm
        self.max_depth = max_depth
        self.root = MemoryNode("Session Root", level=0)

    async def add_fact(self, fact: str):
        node = MemoryNode(fact, level=0)
        await self._attach(node, self.root)

    async def _attach(self, node: MemoryNode, parent: MemoryNode):
        if parent.level < self.max_depth and len(parent.children) >= 5:
            summary = await self._summarize_children(parent)
            summary_node = MemoryNode(summary, parent.level + 1)
            summary_node.parent = parent.parent
            parent.children = [summary_node]
            summary_node.children = parent.children
        else:
            node.parent = parent
            parent.children.append(node)

    async def _summarize_children(self, node: MemoryNode) -> str:
        texts = [c.content for c in node.children]
        joined = "\n".join(f"- {t}" for t in texts)
        return await self.llm.generate(f"Summarize these related facts:\n{joined}")

    def get_context(self, depth: int = 0) -> str:
        lines = []
        def traverse(node: MemoryNode, level: int):
            if level > depth:
                return
            indent = "  " * level
            lines.append(f"{indent}- {node.content}")
            for child in node.children:
                traverse(child, level + 1)
        traverse(self.root, 0)
        return "\n".join(lines)
```

## Key Points

- Use conversational memory for short-term dialog context with a fixed window limit.
- Use summary memory to compress older conversation history while preserving key facts.
- Use entity memory to track named entities, preferences, and user-specific data across sessions.
- Use vector memory for semantic retrieval of relevant past context.
- Combine all four types in a hybrid architecture for production-grade agent memory.
- Persist short-term memory in Redis for fast access with TTL-based expiration.
- Persist long-term memory in PostgreSQL with trigram similarity search for entity matching.
- Persist semantic memory in a vector database like Qdrant for similarity search.
- Use sliding window or token-budget strategies to manage context length within model limits.
- Use importance-weighted retention when you need to keep the most relevant messages.
- Implement periodic background consolidation to compress memory without blocking interactions.
- Always log memory operations for debugging and audit purposes.
- Set explicit memory budgets per session to prevent unbounded growth.
- Consider hierarchical memory graphs for complex, long-running agent sessions.
