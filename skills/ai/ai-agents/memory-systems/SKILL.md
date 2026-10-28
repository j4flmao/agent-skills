---
name: ai-agent-memory-systems
description: >
  Use this skill when the user says 'agent memory', 'long-term memory', 'conversation memory', 'remember user preferences', 'context window full', 'summarize history', 'episodic memory', 'semantic memory'. Designs what an agent keeps in its context window, what it stores externally, how it writes and retrieves memories, and how memories expire. Do NOT use for: document RAG pipelines (ai/llm-engineering/rag-architecture), vector DB operations (data or ai vector-database skills), or the agent loop itself (ai/ai-agents/core-architectures).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [ai, agents, memory, context-window, retrieval, summarization]
---

# Agent Memory Systems

## Purpose
An LLM is stateless between calls; anything the agent "remembers" is either placed in the context window or retrieved into it. Memory design is therefore a set of policies: what stays verbatim in context, what gets compressed, what is persisted to external stores, how it is retrieved, and when it is updated or deleted. Bad memory design shows up as forgotten constraints, contradictory facts, and leaked data between users.

## Agent Protocol

### Trigger
"agent memory", "long-term memory", "remember across sessions", "context window full", "conversation summarization", "user profile memory", "episodic memory", "memory leaks between users".

### Input Context
- Session length and turn count; model context size.
- What must persist across sessions (preferences, facts, past task outcomes).
- Privacy/tenancy constraints and retention requirements.
- Existing storage (Postgres, Redis, vector DB).

### Output Artifact
Memory design: tiers, schemas, write/read/eviction policies, isolation and retention rules.

### Response Format
```
Working memory: pinned={...} window={n turns} compression={summary|drop}
Semantic store: {schema} retrieval={hybrid+rerank} k={n}
Episodic store: {schema} written on={event}
Profile/facts: {key-value schema} update={upsert w/ provenance}
Isolation: {tenant/user key}  Retention: {ttl}  Deletion: {API}
```

### Completion Criteria
- [ ] Pinned context (instructions, goal, constraints) never evicted.
- [ ] Every stored memory carries owner id, source, timestamp.
- [ ] Retrieval is scoped by owner before similarity search.
- [ ] Conflicting facts resolved by recency/provenance, not duplicated.
- [ ] User-facing delete path exists.

## Memory Tiers

| Tier | Lives in | Content | Retrieval | Typical store |
|---|---|---|---|---|
| Working | Context window | System prompt, goal, plan, recent turns, tool results | Always present | In-process |
| Semantic | External | Facts, documents, user profile | Similarity + filters | Postgres/pgvector, vector DB, KV |
| Episodic | External | Past tasks: what was tried, outcome, lesson | By task similarity or recency | Table + embeddings |
| Procedural | Prompt/code | Learned instructions, tool usage rules | Loaded at start | Versioned prompt files |

Semantic memory answers "what is true"; episodic memory answers "what happened when I tried". Raw transcripts are not episodic memory: distill them into short records (task, actions, outcome, lesson).

## Working Memory Management

Context is finite and long contexts degrade attention to the middle, so budget it explicitly:

```
[pinned]     system prompt, tool definitions, goal, constraints     ~fixed
[state]      current plan, key facts extracted so far              small, rewritten each step
[retrieved]  top-k memories for this step                          capped tokens
[window]     last N turns verbatim                                 sliding
[summary]    rolling summary of older turns                        rewritten when window overflows
```

```python
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class WorkingMemory:
    pinned: str
    max_window_tokens: int
    window: list[dict] = field(default_factory=list)
    summary: str = ""

    def add(self, message: dict, count_tokens, summarize) -> None:
        self.window.append(message)
        while sum(count_tokens(m["content"]) for m in self.window) > self.max_window_tokens:
            # Evict oldest turns into the rolling summary; never touch pinned content.
            oldest = self.window[:4]
            self.window = self.window[4:]
            self.summary = summarize(self.summary, oldest)

    def render(self, retrieved: list[str]) -> list[dict]:
        preamble = self.pinned
        if self.summary:
            preamble += f"\n\n<conversation_summary>\n{self.summary}\n</conversation_summary>"
        if retrieved:
            preamble += "\n\n<memories>\n" + "\n".join(retrieved) + "\n</memories>"
        return [{"role": "system", "content": preamble}, *self.window]
```

Keep tool-call/tool-result pairs together when evicting; most APIs reject a tool result whose call was removed.

## Long-Term Memory Store

```sql
CREATE TABLE agent_memory (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id     TEXT NOT NULL,
    user_id       TEXT NOT NULL,
    kind          TEXT NOT NULL CHECK (kind IN ('fact', 'preference', 'episode')),
    subject_key   TEXT,                       -- e.g. 'preferred_language' for upserts
    content       TEXT NOT NULL,
    embedding     vector(1024),               -- pgvector; dimension = your embedding model
    source        TEXT NOT NULL,              -- message id / tool / user-stated
    confidence    REAL NOT NULL DEFAULT 1.0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at    TIMESTAMPTZ,
    deleted_at    TIMESTAMPTZ,
    UNIQUE (tenant_id, user_id, kind, subject_key)
);
CREATE INDEX ON agent_memory USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON agent_memory USING gin (to_tsvector('english', content));
```

Retrieval: filter by `tenant_id`, `user_id`, `deleted_at IS NULL`, `expires_at` first; then hybrid search (vector + full-text, fused with reciprocal rank fusion) and rerank; inject only the top few with their timestamps so the model can judge freshness.

## Write Policies

| Policy | When | Risk |
|---|---|---|
| Explicit ("remember that...") | User asks | Low |
| Extraction after each session | Background job extracts facts/preferences | Hallucinated or sensitive facts stored |
| Episode on task completion | Store task, outcome, lesson | Storing failed approaches as advice |
| Agent-initiated tool (`save_memory`) | Model decides | Noise, prompt-injected writes |

Rules: upsert by `subject_key` so a new preference replaces the old one; store provenance; never persist secrets or content from untrusted documents as "facts" without review; treat retrieved memories as data, not instructions.

## Anti-Patterns
- Stuffing the entire history until the context limit; cost and latency balloon and quality drops.
- Similarity search without owner filters: cross-user leakage.
- Append-only facts with no conflict resolution ("likes tea", "likes coffee", both returned).
- Summaries that drop constraints ("budget under $500"); pin constraints in state instead.
- Memories with no expiry or deletion path (privacy and GDPR issues).

## Checklist
- [ ] Token budget per working-memory section.
- [ ] Rolling summary keeps decisions, constraints, open questions.
- [ ] Store schema with owner, kind, provenance, timestamps, expiry, soft delete.
- [ ] Scoped hybrid retrieval with reranking; k and token cap set.
- [ ] Upsert semantics for facts/preferences.
- [ ] Deletion and export endpoints; retention job.
- [ ] Eval: questions that require recalling facts from earlier sessions.

## References
- Packer et al., "MemGPT: Towards LLMs as Operating Systems" (2023) — tiered memory paging.
- Park et al., "Generative Agents" (UIST 2023) — recency/importance/relevance retrieval scoring.
- Liu et al., "Lost in the Middle" (TACL 2024) — position effects in long contexts.
