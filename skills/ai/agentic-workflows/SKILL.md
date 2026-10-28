---
name: ai-agentic-workflows
description: >
  Use this skill when the user says 'agentic workflow', 'agent loop', 'ReAct', 'plan and execute', 'planner executor', 'reflection loop', 'evaluator-optimizer', 'prompt chaining', 'LangGraph workflow'. Designs the control flow around an LLM: which workflow pattern to pick (chain, router, parallel, orchestrator-workers, evaluator-optimizer, autonomous agent), how to bound loops, and where to put human checkpoints. Do NOT use for: multi-agent topology choices (ai/multi-agent-systems), the internals of a single agent loop (ai/ai-agents/core-architectures), or tool schema design (ai/ai-agents/tool-calling-principles).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [ai, agents, agentic-workflows, react, planning, langgraph, orchestration]
---

# Agentic Workflows

## Purpose
Choose and implement the simplest control flow that solves the task reliably. Most production "agents" are workflows: predefined code paths that call an LLM at specific steps. Reserve open-ended autonomous loops for tasks whose number of steps cannot be known in advance, and always bound them with step limits, budgets, and checkpoints.

## Agent Protocol

### Trigger
"agentic workflow", "agent loop", "ReAct", "plan-and-execute", "planner/executor", "reflection", "evaluator-optimizer", "prompt chaining", "routing", "orchestrator-workers", "LangGraph".

### Input Context
- The task, its success criterion, and whether the step sequence is known up front.
- Available tools and which ones mutate state (writes, payments, deploys).
- Latency and cost budget per run; acceptable failure rate.
- Framework constraints (plain SDK, LangGraph, other).

### Output Artifact
A workflow design: pattern choice with rationale, state schema, node/step list, loop bounds, HITL points, and eval plan. Code only if requested.

### Response Format
```
Pattern: {chain|router|parallel|orchestrator-workers|evaluator-optimizer|autonomous}
Why not simpler: {one line}
State: {typed fields}
Steps: {step -> step (condition)}
Bounds: max_steps={n}, max_cost={usd}, timeout={s}
Human checkpoints: {before which actions}
Eval: {dataset + metric}
```

### Completion Criteria
- [ ] Simplest viable pattern chosen and justified.
- [ ] Every loop has a hard iteration cap and a budget.
- [ ] State-mutating tools gated by approval or dry-run.
- [ ] Typed state schema, not raw message history only.
- [ ] Offline eval set defined before tuning prompts.

## Pattern Decision Tree

```
Is the sequence of steps known in advance?
├── Yes → Is it a single fixed sequence?
│   ├── Yes → Prompt chain (step N output feeds step N+1, with code checks between)
│   └── No, input type decides the path → Router (classify, then dedicated prompt/tool)
├── Partly: subtasks are independent → Parallelization (sectioning or voting), then aggregate
├── Subtasks only known after reading the input → Orchestrator-workers
├── Quality improves with critique and clear criteria exist → Evaluator-optimizer loop
└── Open-ended, many steps, environment feedback needed → Autonomous agent (ReAct-style loop)
```

| Pattern | Latency | Cost | Predictability | Typical use |
|---|---|---|---|---|
| Prompt chain | Sum of steps | Low | High | Draft → translate → format |
| Router | 1 extra call | Low | High | Support ticket triage |
| Parallel (voting) | Max of branches | N× | High | Moderation with majority vote |
| Orchestrator-workers | Variable | Medium | Medium | Multi-file code change |
| Evaluator-optimizer | k × (gen + eval) | Medium | Medium | Translation, constrained writing |
| Autonomous agent | Unbounded unless capped | High | Low | Coding agents, research |

## Core Loops

### ReAct
Interleave reasoning and tool use: the model decides an action, the harness executes it, the observation is appended, repeat until the model returns a final answer. With native tool calling, "Thought/Action/Observation" text parsing is unnecessary: the API returns structured tool-call blocks.

### Plan-and-Execute
A planner produces an explicit step list; an executor runs each step (often a small ReAct loop); a re-planner revises the remaining plan after each step. Better on long tasks because the plan is persisted state, not something the model must remember. Re-planning is mandatory: a static plan breaks on the first surprise.

### Evaluator-Optimizer (Reflection)
Generator produces output; evaluator scores it against explicit criteria and returns actionable feedback; loop until pass or cap. Reflection without an external signal (tests, schema validation, retrieval check) often just rephrases the same mistake, so prefer evaluators grounded in execution results.

## Implementation (LangGraph)

```python
from __future__ import annotations

from typing import Literal, TypedDict

from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, StateGraph


class State(TypedDict):
    task: str
    draft: str
    feedback: str
    passed: bool
    attempts: int


MAX_ATTEMPTS = 3


def generate(state: State) -> dict:
    draft = call_llm(f"Task: {state['task']}\nPrevious feedback: {state['feedback']}")
    return {"draft": draft, "attempts": state["attempts"] + 1}


def evaluate(state: State) -> dict:
    errors = run_checks(state["draft"])  # deterministic checks first: tests, schema, linters
    return {"passed": not errors, "feedback": "\n".join(errors)}


def route(state: State) -> Literal["generate", "publish", "give_up"]:
    if state["passed"]:
        return "publish"
    return "give_up" if state["attempts"] >= MAX_ATTEMPTS else "generate"


builder = StateGraph(State)
builder.add_node("generate", generate)
builder.add_node("evaluate", evaluate)
builder.add_node("publish", publish)    # state-mutating: guarded by interrupt below
builder.add_node("give_up", escalate_to_human)
builder.add_edge(START, "generate")
builder.add_edge("generate", "evaluate")
builder.add_conditional_edges("evaluate", route)
builder.add_edge("publish", END)
builder.add_edge("give_up", END)

graph = builder.compile(checkpointer=MemorySaver(), interrupt_before=["publish"])
config = {"configurable": {"thread_id": "job-42"}}
graph.invoke({"task": "...", "draft": "", "feedback": "", "passed": False, "attempts": 0}, config)
# Human reviews graph.get_state(config); resume with graph.invoke(None, config)
```

`call_llm`, `run_checks`, `publish`, and `escalate_to_human` are your application functions. Use a durable checkpointer (Postgres/SQLite saver) in production so interrupted runs survive restarts.

## Bounding Autonomous Loops
- **Hard caps**: max steps, max tokens, max wall-clock, max USD per run. Abort with a clear error, never silently truncate.
- **Loop detection**: hash (tool, args) pairs; if the same call repeats with the same result, inject "this failed before, change strategy" or stop.
- **Progress signal**: require each iteration to change state (new file, new fact, test count); stop on N iterations without progress.
- **Context management**: summarize or drop stale observations; keep the plan, constraints, and latest results verbatim.
- **Idempotent tools**: retries after timeouts must not double-apply side effects.

## Anti-Patterns
| Anti-pattern | Symptom | Fix |
|---|---|---|
| Agent where a chain suffices | Slow, flaky, expensive | Hard-code the known steps |
| Unbounded loop | Runaway cost, repeated identical calls | Caps + loop detection |
| Self-critique with no ground truth | "Improved" output with the same bug | Evaluate with tests/validators |
| Plan never revised | Executor follows obsolete steps | Re-plan after every step |
| All state in chat history | Lost constraints after summarization | Typed state fields |
| Destructive tool without checkpoint | Irreversible mistakes | `interrupt_before` / approval step |

## Checklist
- [ ] Pattern chosen from the decision tree; simpler options ruled out explicitly.
- [ ] Typed state with the fields each step reads and writes.
- [ ] Caps: steps, tokens, time, cost.
- [ ] Deterministic validators run before any LLM judge.
- [ ] HITL before irreversible actions; durable checkpointer.
- [ ] Traces captured per step (inputs, outputs, tool calls, cost).
- [ ] Offline eval set with pass/fail metric, run on every prompt change.

## References
- Yao et al., "ReAct: Synergizing Reasoning and Acting in Language Models" (ICLR 2023).
- Wang et al., "Plan-and-Solve Prompting" (ACL 2023).
- Anthropic, "Building effective agents" (Dec 2024) — workflow vs agent taxonomy.
- LangGraph documentation: StateGraph, checkpointers, interrupts.
