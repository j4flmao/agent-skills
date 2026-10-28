# State Sharing Mechanisms for Multi-Agent Systems

How agents share information: message passing, a typed shared state (blackboard), external stores (databases, files, vector memory), and artifacts with references. Covers schemas, concurrency control, persistence/checkpointing, context-size management and security of shared state.

## Options

| Mechanism | How | Strengths | Weaknesses |
|---|---|---|---|
| Message passing (handoff payloads) | Agent A returns a typed result to the orchestrator, which passes it to B | Explicit, easy to validate and trace | Payloads can grow; needs careful schema |
| Shared typed state (blackboard) | Graph state object read/written by nodes (e.g. LangGraph `StateGraph`) | Routing on fields, checkpointable | Write conflicts if many writers |
| Conversation history | Agents read the shared message list | Simple | Grows without bound; prose is hard to route on; injection spreads |
| External store | DB rows, key-value, object storage, files in a workspace | Large data, durable, queryable | Consistency and access control needed |
| Long-term memory | Vector/semantic memory, user profiles | Cross-session recall | Retrieval errors, stale or poisoned memories |
| Artifacts by reference | Store big outputs (files, datasets) and pass IDs/paths | Keeps context small | Requires artifact store and permissions |

Most robust systems combine a **small typed state** for control flow with **references to artifacts** in external storage.

## Typed Shared State

Keep variables the workflow depends on as typed fields next to messages, so routing reads fields, not prose.

```python
from __future__ import annotations

import operator
from typing import Annotated, Literal, TypedDict

from langchain_core.messages import AnyMessage
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages


class Finding(TypedDict):
    file: str
    line: int
    severity: Literal["low", "medium", "high"]
    message: str


class ReviewState(TypedDict):
    messages: Annotated[list[AnyMessage], add_messages]
    diff_ref: str                                        # path/ID of the diff artifact, not the diff text
    findings: Annotated[list[Finding], operator.add]     # reducer: parallel reviewers append
    tests_passed: bool | None
    approval_status: Literal["pending", "approved", "rejected"]
    step: int


def route_after_review(state: ReviewState) -> str:
    if any(f["severity"] == "high" for f in state["findings"]):
        return "request_changes"
    return "run_tests" if state["tests_passed"] is None else "summarize"
```
- **Reducers** define how concurrent updates merge (`operator.add` appends lists; default replaces).
- Each node returns only the keys it changes.
- Keep the state small: IDs, flags, short summaries, structured findings.

## Persistence and Checkpointing
```python
from langgraph.checkpoint.postgres import PostgresSaver

with PostgresSaver.from_conn_string(os.environ["CHECKPOINT_DB_URL"]) as saver:
    saver.setup()
    graph = builder.compile(checkpointer=saver, interrupt_before=["apply_changes"])
    graph.invoke(initial, config={"configurable": {"thread_id": run_id}, "recursion_limit": 30})
```
Benefits: resume after crashes, human-in-the-loop pauses, time travel for debugging. Use an in-memory saver only for tests.

## Concurrency Control

| Problem | Mitigation |
|---|---|
| Two agents write the same field | Single-writer ownership per field; or reducers that merge deterministically |
| Lost updates in external DB | Optimistic concurrency (version column, compare-and-set) |
| Conflicting file edits | One writer per file; others submit patches; or separate branches/worktrees per agent then merge |
| Read-your-writes across agents | Pass version/ETag with references |

```sql
UPDATE task_state
SET payload = $1, version = version + 1
WHERE task_id = $2 AND version = $3;     -- 0 rows updated -> reload and retry
```

## Managing Context Size
- Pass **summaries plus references**, not full transcripts, between agents.
- Trim or summarize message history per agent; keep the system prompt and task spec stable.
- Store large tool outputs in the artifact store; put a short excerpt and a pointer in state.
- Give each agent only the fields it needs (projection of state per node).

## Long-Term Memory
- Separate memory types: user preferences/profile, episodic (past runs), semantic knowledge.
- Write to memory only from validated outputs; record source and timestamp.
- Apply retention and deletion policies; allow users to inspect and delete their memories.
- Retrieval results are untrusted data: an attacker who can write to memory can inject instructions later.

## Security of Shared State
- Treat all content that came from tools, web pages, files or other agents as data, not instructions.
- Tag fields with provenance (`source: tool:web_fetch`) so downstream agents and guards can treat them differently.
- Access control per agent: read-only agents get read-only views; secrets never stored in shared state or messages.
- Redact personal data before logging state; encrypt checkpoints at rest.
- Do not let untrusted content set control fields (e.g. `approval_status`); only designated nodes or humans may write them.

## Observability
Log state diffs per node (field names changed, sizes), not full payloads, plus run/thread IDs. This makes it possible to see which agent introduced a wrong value.

## Choosing a Mechanism

```
Is the data needed for routing decisions?      -> typed state field
Is it large (code, documents, datasets)?       -> artifact store + reference in state
Must it survive the run / be shared across runs? -> database or long-term memory
Is it a one-off result for the next agent?     -> typed handoff payload
```

## Checklist
- [ ] Typed state schema with explicit reducers for concurrent fields
- [ ] Large outputs stored externally and referenced
- [ ] Checkpointer configured for production runs
- [ ] Single-writer or versioned updates for shared resources
- [ ] Control fields writable only by designated nodes/humans
- [ ] Provenance tags and untrusted-data handling
- [ ] State diffs logged with run IDs; PII redacted
