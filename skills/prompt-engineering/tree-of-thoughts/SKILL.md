---
name: prompt-tree-of-thoughts
description: >
  Use this skill when the user says 'tree of thoughts', 'ToT', 'search over reasoning paths', 'beam search with LLM', 'backtracking reasoning', 'LLM as evaluator of partial solutions', 'BFS/DFS over thoughts'. Implements deliberate search over partial solutions: thought decomposition, candidate generation, state evaluation (value or vote), BFS/beam and DFS with pruning and backtracking, with cost controls. Do NOT use for: single-path reasoning prompts (prompt-engineering/chain-of-thought), agent tool loops (ai/ai-agents/core-architectures), or multi-agent debate (ai/ai-agents/multi-agent-topology).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [prompt-engineering, tree-of-thoughts, search, bfs, dfs, beam-search, reasoning]
---

# Tree of Thoughts

## Purpose
Tree of Thoughts (ToT) treats problem solving as search: a thought is a coherent intermediate step, the LLM proposes several candidate next thoughts, an evaluator scores partial states, and a search algorithm (breadth-first/beam or depth-first with backtracking) explores promising branches. It helps on problems where early choices matter and dead ends are detectable (puzzles, constrained planning, some code synthesis), at a cost of many more model calls than a single chain.

## Agent Protocol

### Trigger
"tree of thoughts", "ToT", "branching reasoning", "explore multiple solutions", "backtracking", "beam search over LLM outputs", "evaluate partial solutions".

### Input Context
- Problem structure: can it be split into steps? can partial states be judged?
- Availability of a programmatic checker (tests, constraint validator).
- Budget: max LLM calls / tokens / latency.

### Output Artifact
ToT configuration (thought granularity, generator, evaluator, search algorithm, breadth/depth) and implementation, with cost estimate and comparison against CoT/self-consistency.

### Response Format
```
Thought unit: {one equation|one plan step|one function}
Generator: {sample k i.i.d.|propose k in one call}
Evaluator: {programmatic|LLM value (sure/likely/impossible)|LLM vote}
Search: {BFS/beam b={b}|DFS threshold={v}}  Depth: {T}
Calls ≈ {estimate}; baseline: CoT/self-consistency accuracy {x}
```

### Completion Criteria
- [ ] Partial states are evaluable (otherwise ToT degenerates to sampling).
- [ ] Programmatic checks used wherever possible.
- [ ] Call budget computed and enforced.
- [ ] Beats cheaper baselines on an eval set.

## Formulation (Yao et al., 2023)
1. **Thought decomposition**: choose the step size (too small → huge tree; too large → generator can't produce good candidates).
2. **Thought generator** G(s, k): sample k independent continuations (good for rich spaces like writing) or propose k distinct options in one prompt (good for constrained spaces, avoids duplicates).
3. **State evaluator** V(s): value each state independently (e.g. classify "sure / likely / impossible", map to scores) or vote across states.
4. **Search**: BFS keeping the best b states per level, or DFS that expands the best child first and backtracks when the value falls below a threshold.

In the paper's Game of 24 experiment with GPT-4, CoT prompting solved 4% of games while ToT with breadth 5 solved 74%; gains on less structured tasks were smaller. Reproduce on your own task before assuming similar gains.

## Cost Model
| Search | LLM calls (approx.) |
|---|---|
| BFS/beam, depth T, breadth b, k candidates, 1 eval per state | T · b · (1 generation call or k samples + k evaluations) |
| DFS with pruning | Data-dependent; bounded by a node budget |
| CoT | 1 |
| Self-consistency | n |

Batch evaluations into one call per level where possible, and cache evaluator results by state text.

## Implementation (beam/BFS with programmatic + LLM evaluation)

```python
from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Callable


@dataclass(order=True)
class Node:
    score: float
    steps: list[str] = field(compare=False)


class BudgetExceeded(RuntimeError):
    pass


class Budget:
    def __init__(self, max_calls: int) -> None:
        self.max_calls, self.calls = max_calls, 0

    def spend(self, n: int = 1) -> None:
        self.calls += n
        if self.calls > self.max_calls:
            raise BudgetExceeded(f"ToT exceeded {self.max_calls} LLM calls")


def tree_of_thoughts(
    problem: str,
    llm: Callable[[str], str],
    is_solution: Callable[[list[str]], bool],
    is_invalid: Callable[[list[str]], bool],   # cheap programmatic pruning
    depth: int = 4,
    breadth: int = 3,
    k: int = 4,
    max_calls: int = 60,
) -> list[str] | None:
    budget = Budget(max_calls)
    frontier = [Node(0.0, [])]
    for _ in range(depth):
        candidates: list[Node] = []
        for node in frontier:
            budget.spend()
            proposals = json.loads(llm(
                f"Problem: {problem}\nSteps so far: {node.steps}\n"
                f'Propose {k} distinct next steps. Reply JSON {{"steps": ["..."]}}.'
            ))["steps"][:k]
            for step in proposals:
                path = node.steps + [step]
                if is_invalid(path):
                    continue
                if is_solution(path):
                    return path
                candidates.append(Node(0.0, path))
        if not candidates:
            return None
        budget.spend()   # one batched evaluation call per level
        values = json.loads(llm(
            f"Problem: {problem}\nRate each partial solution as sure/likely/impossible to reach "
            f'a valid answer. Reply JSON {{"ratings": [...]}} in order.\n' +
            "\n".join(f"{i}: {c.steps}" for i, c in enumerate(candidates))
        ))["ratings"]
        scale = {"sure": 1.0, "likely": 0.5, "impossible": 0.0}
        for cand, rating in zip(candidates, values):
            cand.score = scale.get(rating, 0.0)
        frontier = sorted((c for c in candidates if c.score > 0), reverse=True)[:breadth]
        if not frontier:
            return None
    return None
```

`is_solution` and `is_invalid` are domain checks (e.g. evaluate the arithmetic, run unit tests, validate constraints). Parse LLM JSON with validation and handle malformed outputs as low scores in production.

## Choosing Parameters
| Situation | Setting |
|---|---|
| Strong programmatic checker | Larger k, rely on checker, LLM evaluator optional |
| Only LLM evaluator | Small b (2-5); use "propose" generator to avoid duplicates |
| Deep problems with clear dead ends | DFS with pruning threshold and node budget |
| Tight latency | Prefer self-consistency or a reasoning model |

## Alternatives
- Self-consistency (cheaper; no partial-state evaluation).
- Reasoning models with larger thinking budgets often match ToT-style gains with one call.
- MCTS-style search (e.g. LATS) for agentic tasks with environment feedback.

## Anti-Patterns
- ToT where partial states can't be judged (evaluator noise drives search).
- No call budget; exponential blow-up.
- Generator sampling duplicates of the same thought.
- Using the same prompt/model as both generator and only evaluator with no external check.

## Checklist
- [ ] Thought granularity chosen and tested.
- [ ] Programmatic validators wired in.
- [ ] Evaluator calibrated on labeled partial states.
- [ ] Budget enforced; evaluations batched and cached.
- [ ] Accuracy vs cost compared to CoT and self-consistency.

## References
- [BFS/DFS Architecture Patterns](references/bfs-dfs-architecture-patterns.md)
- [Backtracking & Error Handling](references/backtracking-error-handling.md)
- [Heuristic Evaluation & Testing](references/heuristic-evaluation-testing.md)
- [Pruning & Performance Optimization](references/pruning-performance-optimization.md)
- [Thought Node State Management](references/thought-node-state-management.md)
- [Tree Search Code Organization](references/tree-search-code-organization.md)
- [ToT Agent Deployment Pipelines](references/tot-agent-deployment-pipelines.md)
- [Prompt Injection & Security Practices](references/prompt-injection-security-practices.md)
- Yao et al., "Tree of Thoughts: Deliberate Problem Solving with Large Language Models" (NeurIPS 2023).
