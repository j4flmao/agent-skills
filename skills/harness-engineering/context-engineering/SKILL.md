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

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with OpenAPI, dynamic loops, and multi-agent coordination protocols.
-->
