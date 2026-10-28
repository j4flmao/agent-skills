---
name: swarm-architectures
description: >
  Use this skill when the user says 'agent swarm', 'multi-agent debate', 'actor model agents', 'context routing to specialist agents', 'judge agent', 'mixture of agents', 'decentralized agents prototype'. Prototypes R&D swarm designs: actor-style isolated agents exchanging messages, a cheap router that dispatches to specialists, debate rounds with a judge, and the measurement needed to prove the swarm beats a single model. Do NOT use for: production multi-agent runtimes (ai/multi-agent-systems), choosing a topology for a product (ai/ai-agents/multi-agent-topology), or ToT search (prompt-engineering/tree-of-thoughts).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [rnd, ai-agents, swarm-architectures, actor-model, debate, routing]
---

# Agent Swarms: Debate & Context Routing (PoC)

## Purpose
Explore whether several cooperating model instances outperform one: a router sends work to specialists, specialists run in isolation like actors, and debate/judging rounds aggregate their outputs. Research results are mixed and often explained by extra compute rather than collaboration, so every swarm PoC must be compared against equal-budget single-model baselines (self-consistency, a stronger model, a larger reasoning budget).

## Agent Protocol

### Trigger
"swarm", "agent debate", "judge agent", "actor model", "router + specialists", "mixture of agents", "society of minds".

### Input Context
- Task set with ground truth or a reliable grader.
- Models available (sizes/costs) and latency budget.
- Hypothesis being tested (diversity helps? specialization helps?).

### Output Artifact
PoC design: actors, messages, routing policy, debate protocol, budget, and an experiment table vs baselines.

### Response Format
```
Hypothesis: {what the swarm should improve}
Actors: {name: model, prompt role, tools}
Router: {classifier/model} -> {specialists}
Debate: {n agents} × {r rounds}; aggregation {judge|majority}
Budget: {tokens/calls per task}
Baselines (same budget): {single model, self-consistency n, bigger model}
Metric: {accuracy, cost, latency}
```

### Completion Criteria
- [ ] Equal-budget baselines included.
- [ ] Rounds and messages bounded.
- [ ] Results reported with variance across seeds.
- [ ] Failure analysis: where debate converged on wrong answers.

## Actor Model for Agents
- Each actor owns its state (system prompt, memory) and processes one message at a time from its mailbox.
- Actors communicate only by immutable messages; no shared mutable state, so concurrency bugs are limited to message protocol bugs.
- Supervisors restart failed actors (Erlang/Akka "let it crash") with backoff.

```python
from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Awaitable, Callable


@dataclass(frozen=True)
class Msg:
    task_id: str
    sender: str
    content: str
    round: int = 0


class Actor:
    def __init__(self, name: str, think: Callable[[Msg], Awaitable[str]]) -> None:
        self.name, self.think = name, think
        self.inbox: asyncio.Queue[tuple[Msg, asyncio.Future[Msg]]] = asyncio.Queue()

    async def run(self) -> None:
        while True:
            msg, reply = await self.inbox.get()
            try:
                out = await asyncio.wait_for(self.think(msg), timeout=60)
                reply.set_result(Msg(msg.task_id, self.name, out, msg.round))
            except Exception as exc:          # surface failures to the caller
                reply.set_exception(RuntimeError(f"{self.name} failed on {msg.task_id}: {exc}"))

    async def ask(self, msg: Msg) -> Msg:
        fut: asyncio.Future[Msg] = asyncio.get_running_loop().create_future()
        await self.inbox.put((msg, fut))
        return await fut


async def debate(task: Msg, debaters: list[Actor], judge: Actor, rounds: int = 2) -> Msg:
    answers = await asyncio.gather(*(d.ask(task) for d in debaters))
    for r in range(1, rounds):
        others = "\n\n".join(f"[{a.sender}] {a.content}" for a in answers)
        prompt = (f"{task.content}\n\nOther agents answered:\n{others}\n\n"
                  "Point out specific errors with evidence, then give your updated answer.")
        answers = await asyncio.gather(*(d.ask(Msg(task.task_id, "moderator", prompt, r)) for d in debaters))
    transcript = "\n\n".join(f"[{a.sender}] {a.content}" for a in answers)
    return await judge.ask(Msg(task.task_id, "moderator",
                               f"{task.content}\n\nCandidate answers:\n{transcript}\n\n"
                               "Choose the best-supported answer; explain the deciding evidence.", rounds))
```

Start actors with `asyncio.create_task(actor.run())` and cancel them at shutdown; `think` wraps the model call.

## Context Routing
- A small, fast model or an embedding classifier maps the request to a specialist (code, math, retrieval-heavy) and selects only the context that specialist needs.
- Measure router accuracy separately; a misroute caps end-to-end accuracy.
- Always include a generalist fallback for low-confidence routes.

## Debate Findings to Respect
- Multi-agent debate improved factuality and math reasoning in Du et al. (2023), but later analyses found gains often shrink against self-consistency at matched compute, and agents can converge on a confident wrong answer (conformity).
- Diversity matters: different models or prompts reduce correlated errors more than identical copies.
- Judges have position and verbosity biases; randomize order and require evidence.

## Experiment Design
| Arm | Description |
|---|---|
| A | Single model, one call |
| B | Self-consistency, n samples (match swarm token budget) |
| C | Stronger single model / higher reasoning budget |
| D | Swarm: router + specialists |
| E | Swarm: debate n×r + judge |

Report accuracy ± std over ≥ 3 seeds, tokens and latency per task, and per-category breakdown.

## Anti-Patterns
- No matched-budget baseline.
- Unbounded rounds or free-form group chat.
- Shared mutable memory between "isolated" actors.
- Judge identical to debaters (same blind spots).

## Checklist
- [ ] Hypothesis and metric written before building.
- [ ] Actors isolated; messages immutable; timeouts per call.
- [ ] Router accuracy measured.
- [ ] Rounds/budget capped.
- [ ] Baselines A-C run at matched cost.

## References
- Du et al., "Improving Factuality and Reasoning in Language Models through Multiagent Debate" (2023).
- Wang et al., "Mixture-of-Agents Enhances Large Language Model Capabilities" (2024).
- Hewitt, Bishop & Steiger, "A Universal Modular ACTOR Formalism for Artificial Intelligence" (IJCAI 1973).
