---
name: context-engineering
description: >
  Use this skill to optimize and engineer prompt context windows, manage token budgets, implement dynamic context injections, handle state management, and mitigate semantic drift in LLM agent cycles.
  This skill enforces: structured context priority scoring, token-budget calculations, crash-resilient persistent state adapters, and drift correction pipelines.
  Do NOT use for: basic prompt copywriting, model evaluation datasets, or general fine-tuning prep.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
type: skill
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [harness-engineering, context-engineering, agent-frameworks, tokens]
---

# Context Engineering Skill

## Purpose
Establishes a production-grade context management framework for agent execution loops. Prevents prompt token overflows, minimizes runtime API costs, maintains execution states across restarts, and mitigates semantic drift during long chat sessions. This system provides automated mechanisms to prune, summarize, score, and inject context blocks dynamically into prompt structures.

---

## Core Principles
1. **Token Allocation as Budget Management**: Treat model context windows as finite memory caches. Allocate tokens dynamically based on priority weightings.
2. **Crash-Resilient State Persistence**: Store execution progress parameters externally. If a process errors or restarts, it must be able to restore context and resume.
3. **Semantic Anchoring**: Maintain a constant semantic anchor to the initial goal text. Actively prune conversational drift.
4. **On-Demand Context Loading**: Do not load documents statically. Query vector databases or status flags dynamically based on the current state.
5. **No Token Waste**: Strip comments, reduce whitespace, and format structural tables compactly.

---

## Agent Protocol

### Triggers
Use this skill when processing:
- Complex execution loops exceeding 10 turns.
- Prompts that contain large context payloads (codebases, database dumps, logs).
- Persistent state files like `progress.txt` or session data.
- Context pruning, dynamic injection, memory consolidation, sliding window buffers, pgvector database configurations, token counting, or semantic similarity scoring.

### Input Context Required
- **Raw Input Context**: Code fragments, history lists, or system logs.
- **Current Task Goal**: A clear text string representing the primary objective.
- **Available Token Budget ($B_t$)**: The maximum allowed tokens for the context payload.
- **Target Model Family**: e.g., GPT-4 (8k window), Claude 3.5 Sonnet (200k window), etc.

### Output Artifact
- **Engineered Prompt Payload**: A cleaned, token-optimized message sequence ready for the LLM.
- **Persistent State File**: Updated state variables stored in a database or `progress.txt`.
- **Drift Evaluation Matrix**: A log containing cosine similarities and optimization metrics.

### Response Formats
For programmatic compilation, the output must be delivered in this format:

```json
{
  "optimized_prompt": [
    { "role": "system", "content": "Instruction..." },
    { "role": "user", "content": "Context..." }
  ],
  "token_count": 1420,
  "drift_score": 0.05,
  "state_sync_completed": true
}
```

---

## Decision Matrix for Context Control

```
Context Size vs. Budget?
├── Context ≤ Budget
│   → Pass raw context through whitespace compressor.
│
└── Context > Budget
    ├── Conversational/Chat Loops
    │   → Apply Token-Based FIFO Sliding Window (evict oldest turns).
    │
    ├── Static Code/Relational Dumps
    │   → Execute Multi-Variable Priority Scoring (filter relevant chunks).
    │
    ├── Mass Documentation (e.g. Codebases)
    │   → Trigger On-Demand Vector retrieval + MMR diversity filters.
    │
    └── High-Divergence / Long Runs
        → Execute Semantic Drift Check.
        ├── Drift < Threshold → Keep current.
        └── Drift ≥ Threshold → Prune intermediate history + re-inject system guidelines.
```

---

## Detailed Architectural Overview

Context engineering bridges the gap between raw data stores and LLM context windows. Below is a comprehensive sequence chart mapping how queries trigger retrieval, scoring, compression, and compilation processes.

```
+------------+       +-------------+       +-------------------+       +-----------------+       +------------+
| User Query | ───►  | Router Loop | ───►  | Embeddings Search | ───►  | Priority Scorer | ───►  | Compressor |
+------------+       +-------------+       +-------------------+       +-----------------+       +------------+
                                                                                                       │
                                                                                                       ▼
+------------+                                                                                   +------------+
| Target LLM |  ◄──────────────────────────────────────────────────────────────────────────────  | Compiler   |
+------------+                                                                                   +------------+
```

### Context Orchestration Lifecycle
Below is the execution pipeline for context building:

```
[Raw Context Source]
       │
       ├──► (A) Budget Profiler ──► Computes $B_t = W_c - T_q - T_{out}$
       │
       ├──► (B) Dynamic Retrieval ──► Vector Query + Maximal Marginal Relevance (MMR)
       │
       ├──► (C) Priority Scorer ──► $Score = (w_{rec} \cdot S_{rec}) + (w_{sem} \cdot S_{sem}) - (w_{len} \cdot L_p)$
       │
       ├──► (D) Token Minifier ──► Inline comment removal & Whitespace compaction
       │
       └──► (E) State Tracker ──► Write back checkpoints to progress.txt
```

---

## Workflow Steps

### Phase 1: Context Budget Profiling
1. **Measure Input Lengths**: Evaluate target lengths of static systems prompts and dynamic payload vectors.
2. **Account for Output Buffer**: Reserve $T_{out}$ tokens (typically 2048 to 4096 tokens) to prevent target text truncation.
3. **Calculate Remaining Space**: Subtract the active query tokens and system prompt boundaries from the model limits.
4. **Establish Hard Stop Limits**: Set maximum API boundaries to prevent unexpected billing.

### Phase 2: Dynamic Context Retrieval
1. **Query Vector Store**: Issue query strings against PostgreSQL pgvector or Qdrant databases.
2. **Apply Similarity Filters**: Filter out context elements with cosine distance scores below a threshold $\tau$ (typically 0.65).
3. **Run MMR Diversity Loop**: Pick matching documents that maintain diverse domain concepts using MMR calculations.
4. **Sort Chunks**: Order selected fragments sequentially based on relevance scores.

### Phase 3: Priority Scoring & Filtering
1. **Apply Recency Weights**: Decays older records exponentially.
2. **Calculate Length Penalties**: Reduces scores for blocks exceeding the optimal target size.
3. **Sum Weighted Parameters**: Compute a single priority score for each candidate chunk.
4. **Prune Low-Scoring Elements**: Retain only elements that fit inside the remaining budget.

### Phase 4: Token Optimization & Minification
1. **Remove Boilerplate Content**: Delete comments, system greetings, and formatting markers.
2. **Reformat Complex Payloads**: Map raw JSON outputs into dense markdown tables.
3. **Inject Local Variables**: Hydrate templates with active parameters and runtime values.
4. **Minify Indentation**: Compress spacing down to single spacing configurations.

### Phase 5: State Synchronization
1. **Update Tracking Files**: Ensure `progress.txt` reflects current completion status and checkpoints.
2. **Ensure Atomic Writes**: Save files using temp-swap procedures to avoid file locks and data corruption.
3. **Log Run Contexts**: Write active session logs to external databases.

### Phase 6: Drift Mitigation & Execution Update
1. **Compute Context Drift**: Run cosine similarity analysis against the original project guidelines.
2. **Evaluate Reset Criteria**: Trigger compression/reset loops if drift exceeds limits.
3. **Re-Inject System Prompt**: Move system instructions back to the start of the context window.
4. **Send API Call**: Route the optimized, structured payload to the LLM.

---

## Extended Troubleshooting Guide

When implementing context engineering configurations, you may encounter the following common failure modes:

| Symptom | Primary Cause | Mitigation Action |
| :--- | :--- | :--- |
| **API Error 400 (Token Overflow)** | Incorrect estimation of ChatML template metadata overhead. | Add a safety buffer of 200 tokens to the budget calculation. |
| **Instruction Loss (Model Ignores Guidelines)** | System prompts are placed after user dialog sequences. | Move system prompts to the very top and wrap user queries in XML tags. |
| **Diverging Agent Behavior** | High semantic drift over many turn iterations. | Set drift threshold $\theta_{drift}$ to 0.30 and trigger history resets. |
| **Parsing Exceptions in Downstream Code** | Compression split sentences mid-way, breaking JSON boundaries. | Enforce JSON output format schema checking and prevent middle-sentence splits. |
| **Slow Execution / Latency Spikes** | Vector DB indexes are not using HNSW mappings, forcing full table scans. | Create HNSW indexes on vectors with cosine operations enabled. |
| **Corrupted State Files** | Concurrent write maneuvers occurred during agent restarts. | Use atomic write routines (temp file creation then OS replace). |

---

## Complete Multi-Turn Execution Scenario

Let's inspect how the pipeline behaves under a continuous multi-turn debugging cycle:

```
[Start Session] ──► Inject System Goal
                         │
[Turn 1] ──► User sends error trace ──► Scoring ranks logs high ──► LLM answers
                                                                          │
[Turn 2] ──► User asks general questions ──► Semantic search fetches docs ┘
                                                 │
[Turn 3] ──► Log size exceeds limit ──► Sliding Window evicts Turn 1 logs
                                                 │
[Turn 4] ──► User changes topic ──► Drift check triggers Reset ──► Clean history
```

---

## Rules and Guidelines
- **Rule 1**: The system instruction block must be placed at the absolute start of the context window.
- **Rule 2**: Never mix system instructions and user-provided inputs without distinct structural delimiters (such as XML tags or markdown fences).
- **Rule 3**: Do not run background loop timers or sleep commands. Use the system scheduler tool for time-based triggers.
- **Rule 4**: Apply context changes incrementally. Do not rewrite system prompts during conversational turns unless a drift trigger occurs.
- **Rule 5**: Store all state variables externally. The agent code must be stateless and capable of rebuilding context from the database or `progress.txt` at any point.

---

## Reference Guides
Below are links to the reference guides detailing the algorithms, data schemas, mathematical formulations, and Python implementations used in this context engineering framework:

- [context-compression-strategies.md](references/context-compression-strategies.md)
  Provides context compression strategies, hierarchical summarization loops, and a sentence-level semantic pruning engine.
- [dynamic-injection-patterns.md](references/dynamic-injection-patterns.md)
  Details dynamic on-demand context injection, vector store schemas (PostgreSQL pgvector, Qdrant), and cosine similarity and Maximal Marginal Relevance (MMR) formulations.
- [persistent-state-management.md](references/persistent-state-management.md)
  Defines `progress.txt` layout specifications, JSON state validation schemas, and crash-resilient Python state machine adapters.
- [priority-scoring-algorithms.md](references/priority-scoring-algorithms.md)
  Outlines priority ranking algorithms, exponential temporal decay formulas, token length penalties, and scoring engines.
- [sliding-window-implementations.md](references/sliding-window-implementations.md)
  Explains ChatML message structures, FIFO eviction mechanisms, sliding context window calculations, and token-aware queue classes.
- [prompt-token-optimization.md](references/prompt-token-optimization.md)
  Compares token footprints of JSON, XML, and Markdown formats, defines API cost estimation functions, and provides prompt minification tools.
- [memory-retrieval-architectures.md](references/memory-retrieval-architectures.md)
  Covers tiered memory architectures (working memory, episodic execution traces, semantic knowledge), memory consolidation equations, and retrieval systems.
- [context-drift-mitigation.md](references/context-drift-mitigation.md)
  Explores semantic drift, cosine distance calculations, conversation pruning techniques, and drift detection engines.

---

## Handoff
For projects requiring vector database management, hand off to `ai-vector-databases`. For systems implementing core orchestrator loops, hand off to `core-master-orchestrator`. For general prompt styling guidelines, hand off to `ai-prompt-engineering`.

## Implementation Patterns

### Token Budget Calculator

```python
import tiktoken
from typing import List, Dict

class TokenBudgetManager:
    def __init__(self, model: str = "gpt-4", max_tokens: int = 8192):
        self.encoder = tiktoken.encoding_for_model(model)
        self.max_tokens = max_tokens
        self.system_prompt_tokens = 0
        self.output_buffer = 2048

    def count_tokens(self, text: str) -> int:
        return len(self.encoder.encode(text))

    def calculate_budget(self, system_prompt: str, messages: List[Dict]) -> dict:
        system_cost = self.count_tokens(system_prompt)
        messages_cost = sum(self.count_tokens(m["content"]) for m in messages)
        overhead = len(messages) * 4
        total_input = system_cost + messages_cost + overhead
        available = self.max_tokens - total_input - self.output_buffer
        return {
            "total_input_tokens": total_input,
            "output_buffer": self.output_buffer,
            "available_context_tokens": max(0, available),
            "budget_exceeded": available <= 0,
            "overflow_tokens": abs(min(0, available)),
        }

    def prune_to_budget(self, context_chunks: List[str], budget: int) -> List[str]:
        pruned = []
        used = 0
        for chunk in context_chunks:
            chunk_tokens = self.count_tokens(chunk)
            if used + chunk_tokens <= budget:
                pruned.append(chunk)
                used += chunk_tokens
            else:
                break
        return pruned
```

### Priority Scoring Engine

```python
import numpy as np
from typing import List, Tuple
import math

class PriorityScorer:
    def __init__(self, recency_weight: float = 0.4, semantic_weight: float = 0.4,
                 length_penalty: float = 0.2, decay_rate: float = 0.1):
        self.recency_weight = recency_weight
        self.semantic_weight = semantic_weight
        self.length_penalty = length_penalty
        self.decay_rate = decay_rate

    def score_recency(self, age_turns: int) -> float:
        return math.exp(-self.decay_rate * age_turns)

    def score_semantic(self, similarity: float) -> float:
        return similarity

    def score_length(self, token_count: int, optimal: int = 500) -> float:
        ratio = token_count / optimal
        if ratio <= 1:
            return ratio
        return max(0, 1 - (ratio - 1) * 0.5)

    def compute(self, chunks: List[dict]) -> List[Tuple[int, float]]:
        scored = []
        for i, chunk in enumerate(chunks):
            recency = self.score_recency(chunk.get("age_turns", 0))
            semantic = self.score_semantic(chunk.get("similarity", 0))
            length = self.score_length(chunk.get("token_count", 0))
            final_score = (
                self.recency_weight * recency +
                self.semantic_weight * semantic +
                self.length_penalty * length
            )
            scored.append((i, final_score))
        return sorted(scored, key=lambda x: -x[1])
```

### Sliding Window with Token Awareness

```python
from collections import deque
from typing import List, Dict, Optional

class TokenAwareSlidingWindow:
    def __init__(self, max_tokens: int, encoder):
        self.max_tokens = max_tokens
        self.encoder = encoder
        self.window = deque()
        self.current_tokens = 0

    def add_message(self, message: Dict) -> bool:
        msg_tokens = len(self.encoder.encode(message["content"])) + 4
        if self.current_tokens + msg_tokens <= self.max_tokens:
            self.window.append(message)
            self.current_tokens += msg_tokens
            return True
        while self.window and self.current_tokens + msg_tokens > self.max_tokens:
            evicted = self.window.popleft()
            evicted_tokens = len(self.encoder.encode(evicted["content"])) + 4
            self.current_tokens -= evicted_tokens
        self.window.append(message)
        self.current_tokens += msg_tokens
        return True

    def get_context(self) -> List[Dict]:
        return list(self.window)

    def trim_to_budget(self, budget_tokens: int) -> List[Dict]:
        result = []
        used = 0
        for msg in reversed(list(self.window)):
            msg_tokens = len(self.encoder.encode(msg["content"])) + 4
            if used + msg_tokens <= budget_tokens:
                result.insert(0, msg)
                used += msg_tokens
        return result
```

### Semantic Drift Detector

```python
from sentence_transformers import SentenceTransformer
import numpy as np
from typing import List

class DriftDetector:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2", threshold: float = 0.3):
        self.model = SentenceTransformer(model_name)
        self.threshold = threshold
        self.anchor_embedding: np.ndarray = None

    def set_anchor(self, text: str):
        self.anchor_embedding = self.model.encode(text, normalize_embeddings=True)

    def detect_drift(self, current_text: str) -> dict:
        if self.anchor_embedding is None:
            return {"drift_score": 0.0, "drifted": False, "message": "No anchor set"}
        current_emb = self.model.encode(current_text, normalize_embeddings=True)
        similarity = float(np.dot(self.anchor_embedding, current_emb))
        drift = 1 - similarity
        return {
            "drift_score": round(drift, 4),
            "drifted": drift > self.threshold,
            "similarity": round(similarity, 4),
            "threshold": self.threshold,
        }

    def detect_drift_sequence(self, texts: List[str]) -> List[dict]:
        return [self.detect_drift(t) for t in texts]
```

## Architecture Decision Trees

### Context Loading Strategy

```
Agent is starting a task?
├── Task needs full codebase understanding
│   ├── Repo < 100 files → Load AGENTS.md + ARCHITECTURE.md
│   ├── Repo 100-500 files → Load AGENTS.md + module summaries
│   └── Repo > 500 files → Vector search for relevant files only
│
├── Task is a conversation follow-up
│   ├── < 10 turns → Keep full history with FIFO window
│   ├── 10-50 turns → Summarize early turns, keep recent verbatim
│   └── > 50 turns → Full history reset, inject summary only
│
└── Task involves large data (logs, traces)
    ├── Structured data → Extract schema + row count + sample
    ├── Unstructured text → Summarize key sections, truncate per token budget
    └── Code output → Keep only errors, truncate successful output
```

### Compression Strategy Selection

```
Context exceeds budget?
├── Chat history too long
│   ├── Recent turns relevant → Sliding window (FIFO evict oldest)
│   └── All turns relevant → Hierarchical summarization
│       ├── Summarize every 5 turns → Keep summaries + last 5 turns
│       └── Extremely long (>100 turns) → Multi-level summarization
│
├── Code/file content too large
│   ├── File is a dependency → Just path + interface signature
│   ├── File is being modified → Full content (must read/write)
│   └── File is reference → Import/export signatures only
│
├── Documentation too large
│   ├── Has table of contents → Load relevant sections only
│   ├── No TOC → Search for keywords, load matching paragraphs
│   └── API docs → Load function signatures + key examples only
│
└── Multiple large contexts → Use priority scoring, keep top-N
```

## Production Considerations

- **Context window monitoring**: Instrument every prompt to track token usage. Alert when context utilization exceeds 90% to prevent silent truncation.
- **Budget allocation per task type**: Reserve 60% of context for task input, 20% for instructions, 10% for examples, 10% for output buffer. Adjust based on task type.
- **Cache embeddings for static documents**: Pre-compute and cache embeddings for documentation, README files, and codebase structure. Reduces latency by 200-500ms per query.
- **Rate limit aware retrieval**: When using external vector DBs, implement circuit breakers and fallback to keyword search during outages.

## Security Considerations

- **Context injection prevention**: Sanitize user-provided content before injecting into context. Strip prompt injection patterns (e.g., "ignore previous instructions").
- **PII in context traces**: User messages may contain PII. Apply PII masking before writing context traces to persistent storage.
- **Context access control**: Restrict which agents can access which context stores. Use per-namespace vector DB collections for multi-tenant isolation.
- **Drift detection for safety**: Monitor semantic drift from safety instructions. Re-inject safety system prompts when drift exceeds threshold.

## Anti-Patterns

| Anti-Pattern | Why It Fails | Correct Approach |
|---|---|---|
| Shoving everything into context | Overflows budget, increases cost, degrades quality | Use selective retrieval + priority scoring |
| Never pruning conversation history | Model loses track of current task | Apply sliding window with token-aware eviction |
| Relying on model to remember state | LLMs have no inherent memory | Persist state externally between turns |
| Symmetric summarization of all turns | Recent turns are more important | Exponentially decay older content weight |
| Not accounting for overhead tokens | 4-8 tokens per message for ChatML format | Add safety buffer of 200 tokens |
| Using single embedding for all retrieval | Different query types need different strategies | Use MMR diversity for broad queries, similarity for specific |
| No output budget reservation | Response gets truncated mid-sentence | Reserve 1024-4096 tokens for output based on task |

## Performance Optimization

- **Chunk documents at semantic boundaries**: Split on paragraph breaks, not arbitrary token counts. Improves retrieval relevance by 25-40%.
- **Pre-compute summaries**: For long-running agents, pre-summarize common documents and cache results. Reduces per-turn latency by 30-50%.
- **Async embedding generation**: Generate embeddings for new content in background threads while the agent processes other tasks.
- **Use HNSW indexes**: For vector DB queries, use HNSW (Hierarchical Navigable Small World) indexes for 10-100x faster approximate nearest neighbor search.
- **Batch context requests**: When loading multiple documents, batch the read operations into a single tool call to reduce round trips.

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with OpenAPI, dynamic loops, and multi-agent coordination protocols.
-->
## Implementation Patterns

### Observer Pattern for Event Handling
`
interface EventObserver<T> {
  onEvent(event: T): Promise<void>;
}

class EventBus<T> {
  private observers: Set<EventObserver<T>> = new Set();
  subscribe(observer: EventObserver<T>): void {
    this.observers.add(observer);
  }
  unsubscribe(observer: EventObserver<T>): void {
    this.observers.delete(observer);
  }
  async emit(event: T): Promise<void> {
    const results = Array.from(this.observers).map(o => o.onEvent(event));
    await Promise.allSettled(results);
  }
}
`

### Configuration-Driven Approach
`
config:
  defaults:
    timeout: 30s
    retryCount: 3
  overrides:
    production:
      timeout: 60s
      retryCount: 5
    development:
      timeout: 300s
      retryCount: 1
`

## Production Considerations

### Deployment Checklist
- [ ] Configuration validated against schema before startup
- [ ] Health check endpoints registered and monitored
- [ ] Graceful shutdown with draining period (30s timeout)
- [ ] Resource limits configured (CPU, memory, file descriptors)
- [ ] Log level set appropriate for environment
- [ ] Metrics endpoint secured and exposed
- [ ] Rate limiting configured per-tier
- [ ] TLS certificates valid and auto-renewing
- [ ] Database migrations run as separate deployment step
- [ ] Feature flags ready for gradual rollout

### Monitoring and Alerting
| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| Error rate | > 1% over 5min | Critical | Page on-call |
| p99 latency | > 2s over 5min | Warning | Investigate |
| Throughput drop | > 50% over 1min | Critical | Check upstream |
| Queue depth | > 1000 over 1min | Warning | Scale consumers |
| Disk usage | > 85% | Warning | Clean or expand |
| Memory usage | > 90% heap | Critical | Restart or scale |

## Anti-Patterns

| Anti-Pattern | Symptom | Root Cause | Solution |
|-------------|---------|------------|----------|
| Premature optimization | Complex code for no measured benefit | Guessing instead of profiling | Measure first, optimize based on data |
| Copy-paste reuse | Duplicate code across codebase | Lack of abstraction | Extract shared logic into libraries |
| Gold-plating | Features with no current requirement | Over-engineering | YAGNI — build what's needed now |
| Magical thinking | Assumptions without validation | Skipping error handling | Handle all failure modes explicitly |

## Performance Optimization

### Caching Strategy
Cache hierarchy: L1 (in-memory local) → L2 (distributed Redis/Memcached) → L3 (CDN/Edge).
Cache invalidation: TTL-based (simple, stale), event-based (complex, fresh), write-through (consistent, higher write latency), write-behind (fast writes, eventual consistency).

### Resource Pooling
- Database connections: Pool of reusable connections (HikariCP, pgBouncer)
- HTTP connections: Keep-alive + connection pooling for external calls
- Thread pool: Bounded thread pools for async task execution

### Profiling Methodology
1. Establish baseline with production traffic profile
2. Profile CPU with sampling profiler (pprof, perf, async-profiler)
3. Profile memory with heap dumps and allocation tracking
4. Profile I/O with strace/perf trace for syscall analysis
5. Profile latency with distributed tracing (OpenTelemetry)
6. Identify bottleneck, formulate hypothesis, implement fix
7. Re-profile to verify improvement, repeat

## Security Considerations

### Threat Modeling (STRIDE)
- Spoofing: Identity validation, authentication
- Tampering: Integrity checks, digital signatures
- Repudiation: Audit logs, non-repudiation
- Information disclosure: Encryption, access control
- Denial of service: Rate limiting, resource quotas
- Elevation of privilege: Principle of least privilege

### Supply Chain Security
- Dependency scanning: Snyk, Dependabot, Trivy
- SBOM generation: CycloneDX or SPDX format
- Signed commits: GPG or SSH commit signing
- Artifact verification: Checksum validation, signature verification

### Secrets Management
- Secrets never in code — always in secrets manager (Vault, AWS Secrets Manager)
- Rotation policy: Rotate database credentials every 90 days
- Access audit: Log every secrets access, alert on anomalies
- Encryption at rest and in transit for all secrets
- Principle of least privilege: each service gets only its own secrets

## Rules
- Default-deny security posture — allow only explicitly required access.
- All inputs validated, all outputs encoded, all errors handled.
- Defend in depth — multiple layers of security controls.
- Fail securely — errors default to safe behavior.
- Log security-relevant events for audit and investigation.
- Keep dependencies updated — automate vulnerability scanning.
- Design for observability from day one, not as an afterthought.
- Document all architectural decisions with rationale.
- Review code for security, performance, and correctness before merging.