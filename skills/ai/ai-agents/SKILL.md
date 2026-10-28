---
name: ai-agent-architectures
description: >
  Use this skill when the user says 'build an AI agent', 'agent architecture', 'design an autonomous agent', 'agent system prompt', 'agent with tools and memory', 'which agent framework'. Entry point for single-agent design: decomposes the request into loop, tools, memory, planning, and evaluation, then routes depth to the child skills. Do NOT use for: workflow pattern selection (ai/agentic-workflows), multi-agent orchestration (ai/multi-agent-systems), or harness concerns like sandboxing and tracing (harness-engineering/*).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [ai, agents, architecture, tool-use, memory, planning]
---

# AI Agent Architectures

## Purpose
Design a single LLM agent end to end: the control loop, the tool surface, memory, planning strategy, guardrails, and how it is evaluated. This parent skill makes the top-level decisions and hands detail to its children: `core-architectures` (loop mechanics), `tool-calling-principles` (tool contracts), `memory-systems` (state and recall), and `multi-agent-topology` (when one agent is not enough).

## Agent Protocol

### Trigger
"build an agent", "agent architecture", "autonomous agent", "agent design review", "agent framework choice", "agent system prompt".

### Input Context
- Task domain, success criteria, and expected task length (steps, minutes).
- Tools/APIs available and their side effects.
- Model/provider constraints, latency and cost budget.
- Data the agent must remember across turns or sessions.
- Risk profile: what is the worst action the agent could take?

### Output Artifact
Architecture brief: component table, loop diagram (Mermaid sequence), tool list with schemas, memory plan, guardrails, eval plan.

### Response Format
```
Loop: {react|plan-execute|workflow}  Model: {tier}  Max steps: {n}
Tools ({count}; split past ~10-15 or on eval evidence): {name: side-effect level}
Memory: working={strategy} | long-term={store} | episodic={yes/no}
Guardrails: {input, output, action approvals}
Eval: {dataset, metric, pass threshold}
Children to consult: {skill paths}
```

### Completion Criteria
- [ ] Each component (loop, tools, memory, planning, guardrails, eval) has an explicit decision.
- [ ] Small, cohesive toolset per agent; split only when evals show tool or domain confusion (repo heuristic: ~10-15 tools).
- [ ] Destructive tools have human approval or dry-run.
- [ ] Eval dataset exists before prompt iteration starts.

## Component Map

| Component | Decision | Default | Child skill |
|---|---|---|---|
| Control loop | ReAct vs plan-and-execute vs fixed workflow | Fixed workflow if steps known | core-architectures, ../agentic-workflows |
| Tools | Granularity, schemas, error contract | Few coarse tools with strict schemas | tool-calling-principles |
| Working memory | What stays in context | System prompt + plan + recent turns | memory-systems |
| Long-term memory | Retrieval store, write policy | Explicit "remember" writes, hybrid retrieval | memory-systems |
| Planning | Explicit plan object or implicit | Explicit plan for > ~5 steps | references/planning-strategies.md |
| Guardrails | Input/output filters, approvals | Approval on irreversible actions | ../../harness-engineering/sandbox-execution |
| Observability | Traces, cost | One span per LLM/tool call | ../../harness-engineering/agent-observability |

## Minimal Agent Loop (Anthropic Messages API)

```python
from __future__ import annotations

import json
import os

import anthropic

client = anthropic.Anthropic()          # reads ANTHROPIC_API_KEY
MODEL = os.environ["AGENT_MODEL"]        # pin the model id in config, not in code
MAX_STEPS = 12

TOOLS = [{
    "name": "search_orders",
    "description": "Look up orders by customer email. Read-only. Returns at most 20 orders.",
    "input_schema": {
        "type": "object",
        "properties": {"email": {"type": "string", "format": "email"}},
        "required": ["email"],
    },
}]


def run_tool(name: str, args: dict) -> str:
    if name == "search_orders":
        return json.dumps(search_orders(args["email"]))   # your implementation
    raise ValueError(f"unknown tool {name}")


def run_agent(user_msg: str) -> str:
    messages = [{"role": "user", "content": user_msg}]
    for _ in range(MAX_STEPS):
        resp = client.messages.create(
            model=MODEL, max_tokens=2048, system=SYSTEM_PROMPT, tools=TOOLS, messages=messages
        )
        messages.append({"role": "assistant", "content": resp.content})
        if resp.stop_reason != "tool_use":
            return "".join(b.text for b in resp.content if b.type == "text")
        results = []
        for block in resp.content:
            if block.type != "tool_use":
                continue
            try:
                out, is_error = run_tool(block.name, block.input), False
            except Exception as exc:  # report to the model so it can recover
                out, is_error = f"{type(exc).__name__}: {exc}", True
            results.append({"type": "tool_result", "tool_use_id": block.id,
                            "content": out, "is_error": is_error})
        messages.append({"role": "user", "content": results})
    raise RuntimeError(f"agent exceeded {MAX_STEPS} steps without finishing")
```

The OpenAI-style equivalent uses `tools=[{"type": "function", "function": {...}}]` and returns `tool_calls` on the assistant message; answers go back as `role: "tool"` messages with `tool_call_id`.

## System Prompt Skeleton
```
Role and goal: one paragraph, the outcome not the persona.
Constraints: what must never happen; which actions need confirmation.
Tools: when to use each (descriptions live in schemas; keep this short).
Process: plan first for multi-step tasks; verify results before answering.
Output: exact format of the final answer.
Stop condition: when to finish or ask the user.
```

## Framework Choice
| Need | Option |
|---|---|
| Full control, few tools | Provider SDK + your own loop (above) |
| Graph state, checkpoints, HITL | LangGraph |
| Agent features with managed tool loop | Provider agent SDKs (OpenAI Agents SDK, Claude Agent SDK) |
| Tool interoperability across hosts | Expose tools via MCP servers |

Frameworks change quickly; check the current docs before committing, and keep business logic out of framework-specific classes so you can switch.

## Anti-Patterns
- **God agent**: dozens of overlapping tools in one prompt; tool selection accuracy drops. Split by responsibility once evals show confusion.
- **Prompt-only safety**: "never delete files" in the prompt with a delete tool exposed. Remove the capability or gate it.
- **Silent tool failures**: returning empty strings on error; the model invents results. Return structured errors with `is_error`.
- **No step cap**: runaway loops and bills.
- **Vibes-based iteration**: tweaking prompts without a fixed eval set.

## Checklist
- [ ] Loop type chosen; step cap and timeout set.
- [ ] Cohesive, non-overlapping tools, each with strict JSON Schema and failure semantics.
- [ ] Memory plan: what is in context, what is retrieved, what is written and when.
- [ ] Approval gates on state-changing tools.
- [ ] Tracing and cost tracking from day one.
- [ ] Eval set with task success metric and regression gate.

## References
- [Planning Strategies](references/planning-strategies.md) — CoT, ToT, Plan-and-Solve, LLMCompiler.
- Child skills: `core-architectures/`, `tool-calling-principles/`, `memory-systems/`, `multi-agent-topology/`.
