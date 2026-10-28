# Thought Node State Management

How to represent thought nodes and search state so that the tree is reproducible, resumable, debuggable and cheap to pass into prompts. Covers the node schema, canonical state, persistence and trace export.

## Node Schema

```python
from __future__ import annotations

import hashlib
import json
from dataclasses import asdict, dataclass, field
from enum import Enum


class NodeStatus(str, Enum):
    OPEN = "open"            # generated, not yet expanded
    EXPANDED = "expanded"
    PRUNED = "pruned"
    SOLUTION = "solution"
    FAILED = "failed"        # generation/evaluation error


@dataclass(frozen=True, slots=True)
class Thought:
    text: str
    generator_model: str
    prompt_version: str


@dataclass(slots=True)
class Node:
    node_id: str
    parent_id: str | None
    depth: int
    thoughts: tuple[Thought, ...]          # full path from root, immutable
    state: str                             # canonical problem state after these thoughts
    value: float | None = None
    status: NodeStatus = NodeStatus.OPEN
    eval_reason: str | None = None
    meta: dict[str, str] = field(default_factory=dict)

    @staticmethod
    def make_id(parent_id: str | None, thought_text: str) -> str:
        raw = json.dumps([parent_id, thought_text], ensure_ascii=False)
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]

    def to_json(self) -> str:
        d = asdict(self)
        d["status"] = self.status.value
        return json.dumps(d, ensure_ascii=False)
```

Design choices:
- Immutable path (`tuple`): children never mutate parents; safe for concurrent expansion.
- Deterministic IDs from parent + thought text: the same expansion yields the same ID, enabling dedupe and resume.
- `state` separate from `thoughts`: prompts use the compact canonical state, logs keep the full path.

## Canonical State

A canonical state is the minimal description of "where the problem stands", independent of how it was reached.

| Task | Thoughts | Canonical state |
|---|---|---|
| Game of 24 | `4 * 6 = 24`, ... | remaining numbers, sorted: `[1, 24]` |
| Crossword | filled words | grid with letters |
| Plan generation | plan steps | list of completed steps + open constraints |
| Code synthesis | functions written | current source + failing tests |

Benefits: dedupe across paths (transpositions), smaller prompts, cache keys for evaluation.

```python
def game24_state(numbers: list[float]) -> str:
    return json.dumps(sorted(round(n, 6) for n in numbers))
```

## Search State (Frontier)

```python
@dataclass(slots=True)
class SearchState:
    run_id: str
    problem: str
    config: dict[str, int | float | str]   # depth, breadth, k, thresholds, model ids
    frontier: list[str]                    # node ids to expand next
    nodes: dict[str, Node]
    seen_states: set[str]
    calls_used: int = 0
    tokens_used: int = 0
    best_node_id: str | None = None
```

Keep `config` with the run so results are reproducible and comparable.

## Persistence and Resume

| Storage | Use |
|---|---|
| In-memory | Short interactive runs |
| Append-only JSONL per run | Offline batches; easy replay and analysis |
| Key-value / document DB (Redis, Postgres JSONB) | Long runs, multi-worker search, resume after crash |

Checkpoint after each level (beam) or every N expansions (DFS/best-first). Write atomically: write to a temp file/row then swap, so a crash never leaves a half-written frontier.

```python
import os
import tempfile


def checkpoint(state: SearchState, path: str) -> None:
    payload = {
        "run_id": state.run_id, "problem": state.problem, "config": state.config,
        "frontier": state.frontier, "seen_states": sorted(state.seen_states),
        "calls_used": state.calls_used, "tokens_used": state.tokens_used,
        "best_node_id": state.best_node_id,
        "nodes": [json.loads(n.to_json()) for n in state.nodes.values()],
    }
    directory = os.path.dirname(path) or "."
    fd, tmp = tempfile.mkstemp(dir=directory, suffix=".tmp")
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False)
    os.replace(tmp, path)
```

On resume, restore budgets as well as the frontier so a restart cannot reset spending.

## Memory Bounds

- Large searches: keep only frontier nodes and ancestors of frontier nodes in memory; spill closed nodes to storage.
- Store full LLM responses outside the node (by reference) if they are large; nodes keep the parsed thought.
- Cap `seen_states` with a size limit or bloom filter for very large spaces.

## Trace Export for Debugging

Each node logged as one JSON line: `run_id, node_id, parent_id, depth, thought, state, value, status, eval_reason, latency_ms, tokens`. From this you can:
- Render the tree (Graphviz/Mermaid) for a failed run.
- Find where the correct branch was pruned (compare against a known solution path).
- Compute pruning statistics per rule.

Integrate with LLM tracing tools (OpenTelemetry GenAI semantic conventions, LangSmith, Langfuse, Phoenix) by emitting one span per generation/evaluation call with node ID attributes.

## Determinism

- Record model IDs, prompt versions, temperatures and seeds (where supported) in `config`.
- LLM outputs are not fully deterministic even at temperature 0; reproducibility comes from replaying logged outputs, not re-calling the model.

## Pitfalls
- Mutable shared path lists between parent and child (aliasing bugs under concurrency).
- Prompts built from the full path instead of a canonical state: token growth with depth.
- Random UUIDs for node IDs: duplicates across paths cannot be detected.
- Checkpoints without budgets: resumed runs overspend.

## Checklist
- [ ] Immutable node paths and deterministic node IDs
- [ ] Canonical state defined for the task and used for dedupe and prompts
- [ ] Run config stored with results
- [ ] Atomic checkpoints including budgets
- [ ] Per-node trace logging for debugging
