---
name: ai-multi-agent-systems
description: >
  Use this skill when the user says 'multi-agent system', 'LangGraph multi-agent', 'AutoGen', 'CrewAI', 'OpenAI Agents SDK handoffs', 'agents sharing state', 'blackboard', 'human approval in agent graph', 'A2A protocol'. Builds the runtime for several cooperating agents: orchestration style (deterministic graph vs dynamic conversation), shared state, inter-agent protocols, checkpointing and human-in-the-loop, budgets, and observability. Do NOT use for: choosing the topology shape itself (ai/ai-agents/multi-agent-topology), a single agent's loop (ai/ai-agents/core-architectures), or experimental swarm/debate research (rnd/ai-agents/swarm-architectures).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [ai, agents, multi-agent, langgraph, orchestration, blackboard, hitl]
---

# Multi-Agent Systems

## Purpose
Implement and operate systems where several specialized agents cooperate. The engineering problems are classic distributed-systems problems wearing an LLM costume: shared state, message contracts, termination, retries, durability across human waits, and tracing. Prefer deterministic orchestration (explicit graph) for production; use dynamic conversational orchestration only where flexibility is worth the unpredictability.

## Agent Protocol

### Trigger
"multi-agent", "LangGraph supervisor", "AutoGen", "CrewAI", "agent handoff", "shared state between agents", "blackboard", "agent approval step", "A2A", "agents talking to each other".

### Input Context
- Roles already decided (or the topology skill output).
- Framework constraints and language.
- Which nodes touch production state; approval owners.
- Durability needs (can a run wait hours/days for a human?).

### Output Artifact
Runtime design and code skeleton: state schema, nodes, routing, checkpointer, interrupts, budgets, tracing.

### Response Format
```
Orchestration: {graph|conversation|handoff}  Framework: {name@version}
State schema: {TypedDict/Pydantic fields + reducers}
Nodes: {agent/tool nodes}  Routing: {conditional edges}
Durability: checkpointer={postgres|sqlite|memory}, thread_id={key}
HITL: interrupt before {nodes}
Budgets: recursion_limit={n}, tokens={n}, timeout={s}
Tracing: {backend}
```

### Completion Criteria
- [ ] Typed shared state with explicit fields routing reads (repo rule: not transcript-only).
- [ ] Every cycle bounded (recursion limit / round cap).
- [ ] Durable checkpointer for any run that can pause.
- [ ] Interrupt before production-mutating nodes.
- [ ] Tool outputs treated as untrusted data.

## Orchestration Styles

| Style | Examples | Pros | Cons | Use when |
|---|---|---|---|---|
| Deterministic graph | LangGraph `StateGraph` | Predictable, testable, resumable | Must model flows up front | Business processes, production |
| Dynamic conversation | AutoGen/AG2 group chat, CrewAI hierarchical | Flexible on novel tasks | Loops, hard to debug, costly | Research, exploration |
| Handoffs | OpenAI Agents SDK handoffs, LangGraph `Command(goto=...)` | Natural for triage | Ping-pong risk | Customer-service routing |

Ecosystem churn is high (e.g. OpenAI's experimental Swarm was superseded by the Agents SDK; Microsoft is consolidating AutoGen and Semantic Kernel into its Agent Framework). Check current docs and isolate framework code behind your own interfaces.

## Shared State (Blackboard)
Agents read and write fields of a typed state object instead of forwarding transcripts. In LangGraph, each field can declare a reducer that defines how concurrent updates merge.

```python
from __future__ import annotations

import operator
from typing import Annotated, Literal, TypedDict

from langgraph.checkpoint.postgres import PostgresSaver
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages


class TeamState(TypedDict):
    messages: Annotated[list, add_messages]          # audit trail, not the routing source
    spec: str
    code: str
    lint_errors: list[str]
    test_report: str
    review_notes: Annotated[list[str], operator.add]  # parallel writers append
    approval_status: Literal["pending", "approved", "rejected"]
    iterations: int


def supervisor(state: TeamState) -> Literal["coder", "reviewer", "deploy", "escalate"]:
    if state["iterations"] >= 4:
        return "escalate"
    if not state["code"] or state["lint_errors"] or "FAILED" in state["test_report"]:
        return "coder"
    if not state["review_notes"]:
        return "reviewer"
    return "deploy"


builder = StateGraph(TeamState)
builder.add_node("coder", coder_agent)          # write access to workspace only
builder.add_node("checks", run_lint_and_tests)  # deterministic node, no LLM
builder.add_node("reviewer", reviewer_agent)    # read-only tools
builder.add_node("deploy", deploy_node)         # production-mutating
builder.add_node("escalate", notify_human)
builder.add_edge(START, "coder")
builder.add_edge("coder", "checks")
builder.add_conditional_edges("checks", supervisor)
builder.add_conditional_edges("reviewer", supervisor)
builder.add_edge("deploy", END)
builder.add_edge("escalate", END)

with PostgresSaver.from_conn_string(DB_URI) as saver:   # durable checkpoints
    saver.setup()
    graph = builder.compile(checkpointer=saver, interrupt_before=["deploy"])
    cfg = {"configurable": {"thread_id": "ticket-1234"}, "recursion_limit": 25}
    graph.invoke(initial_state, cfg)
    # ...later, after a human approves in the UI:
    graph.update_state(cfg, {"approval_status": "approved"})
    graph.invoke(None, cfg)
```

`coder_agent`, `run_lint_and_tests`, `reviewer_agent`, `deploy_node`, `notify_human`, `DB_URI`, and `initial_state` are application-defined. `deploy_node` must itself refuse to run unless `approval_status == "approved"` (defense in depth). Inside a node you can also call `langgraph.types.interrupt(payload)` and resume with `Command(resume=value)`.

## Communication Protocols
| Mechanism | Description | Use |
|---|---|---|
| Shared state / blackboard | Typed fields in one store | In-process graphs |
| Message passing (actor) | Agents own state, exchange typed messages via queues | Distributed agents, isolation |
| MCP | Standard protocol for exposing tools/resources to agents | Tool interoperability |
| A2A (Agent2Agent) | Open protocol for agent-to-agent task delegation across vendors | Cross-organization agents |

See `references/communication-protocols.md` for blackboard vs actor details.

## Human-in-the-Loop
Pausing must not hold a process or thread: serialize state to the checkpointer, release compute, resume by `thread_id` when the human answers. Show the reviewer exactly what will happen (diff, SQL, deploy target), record who approved, and expire stale approvals. Details: `references/human-in-the-loop.md`.

## Failure Handling
| Failure | Handling |
|---|---|
| Agent output fails schema | Retry once with the validation error, then fail the node |
| Tool transient error | Bounded retries with backoff inside the tool, not by re-running the agent |
| Cycle without progress | Recursion limit + iteration counter in state → escalate |
| Process crash | Resume from last checkpoint (nodes must be idempotent) |
| Prompt injection via tool output | Treat as data; no tool output can change permissions or trigger approvals |

## Observability
One trace per run, one span per node and per LLM/tool call, tagged with `thread_id`, agent name, tokens, and cost. Store state snapshots per step (checkpointers already do) for replay and debugging.

## Anti-Patterns
- Group chat with no termination condition other than a magic word.
- Routing by asking an LLM to read the whole transcript when a state field would do.
- In-memory checkpointer in production with human approvals.
- Every agent holding every tool; reviewer with write access.
- Re-running an entire multi-agent workflow on a single tool timeout.

## Checklist
- [ ] Orchestration style justified; framework version pinned.
- [ ] Typed state with reducers for concurrent writes.
- [ ] Deterministic nodes for checks (lint, tests, validation).
- [ ] Recursion limit, iteration counters, token/time budgets.
- [ ] Durable checkpointer; interrupts before mutating nodes; approval audit.
- [ ] Per-node tracing and cost attribution.
- [ ] End-to-end eval on representative tasks vs single-agent baseline.

## References
- [Communication Protocols](references/communication-protocols.md) — blackboard vs actor model.
- [Human-in-the-Loop](references/human-in-the-loop.md) — checkpoint-based approval flows.
- LangGraph docs (persistence, human-in-the-loop, multi-agent); Model Context Protocol and A2A specifications.
