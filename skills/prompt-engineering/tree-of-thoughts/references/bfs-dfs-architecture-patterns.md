# Search Strategies for Tree-of-Thoughts: BFS/Beam, DFS, Best-First and MCTS

Which search algorithm to run over thoughts, how each uses the generator and evaluator, and their cost profiles. The SKILL.md shows a beam implementation; this file compares alternatives and gives compact reference implementations.

## Comparison

| Strategy | Frontier | Strength | Weakness | Calls (rough) |
|---|---|---|---|---|
| BFS / beam | Top-b states per depth | Robust when evaluator is noisy; easy to batch per level | Explores every level fully; fixed depth | T · b · (gen + eval) |
| DFS with pruning | Stack | Finds a solution fast when good branches score high; low memory | Can sink budget into one deep subtree | data-dependent; node budget |
| Best-first (A*-like) | Priority queue across depths | Spends budget where scores are highest | Needs scores comparable across depths | node budget |
| MCTS (e.g. LATS for agents) | Tree with visit statistics | Balances exploration/exploitation; uses rollouts/feedback | More calls per decision; complex | iterations × (select+expand+simulate) |
| Self-consistency (baseline) | none | Cheap, parallel | No partial evaluation | n |

Yao et al. (2023) used BFS for Game of 24 and creative writing, and DFS for mini crosswords.

## Choosing

```
Can partial states be checked programmatically?
 ├─ yes → DFS or best-first with the checker as pruning (cheap, exact)
 └─ no  → LLM evaluator only
          ├─ fixed, shallow depth (≤ 4) → beam (b = 2-5), batch evals per level
          ├─ deep, clear dead ends      → DFS with threshold + node budget
          └─ environment feedback (agents, code execution) → MCTS-style
```

## Best-First Search

```python
from __future__ import annotations

import heapq
import itertools
from dataclasses import dataclass
from typing import Callable


@dataclass(frozen=True)
class State:
    steps: tuple[str, ...]


def best_first(
    root: State,
    expand: Callable[[State], list[tuple[State, float]]],   # returns (child, value in [0,1])
    is_solution: Callable[[State], bool],
    max_nodes: int,
    max_depth: int,
) -> State | None:
    counter = itertools.count()                 # tiebreaker keeps heap ordering stable
    heap: list[tuple[float, int, State]] = [(-1.0, next(counter), root)]
    seen: set[tuple[str, ...]] = set()
    expanded = 0
    while heap and expanded < max_nodes:
        neg_value, _, state = heapq.heappop(heap)
        if state.steps in seen:
            continue
        seen.add(state.steps)
        if is_solution(state):
            return state
        if len(state.steps) >= max_depth:
            continue
        expanded += 1
        for child, value in expand(state):
            if value > 0.0:
                heapq.heappush(heap, (-value, next(counter), child))
    return None
```

To make values comparable across depths, combine evaluator score with a depth term, e.g. `priority = value + λ · depth / max_depth`, tuned on a validation set.

## Beam with Diversity

Plain beams collapse onto near-duplicate states. Keep diversity by deduplicating normalized states and capping children per parent:

```python
def select_beam(cands: list[tuple[State, float, int]], b: int, per_parent: int = 2) -> list[State]:
    """cands: (state, value, parent_index)."""
    chosen: list[State] = []
    used: dict[int, int] = {}
    norm_seen: set[str] = set()
    for state, value, parent in sorted(cands, key=lambda c: c[1], reverse=True):
        key = " ".join(s.strip().lower() for s in state.steps)
        if key in norm_seen or used.get(parent, 0) >= per_parent:
            continue
        chosen.append(state)
        norm_seen.add(key)
        used[parent] = used.get(parent, 0) + 1
        if len(chosen) == b:
            break
    return chosen
```

## MCTS Outline (for agentic tasks)

1. Select: descend by UCT, `value/visits + c · sqrt(ln(parent_visits) / visits)`.
2. Expand: generate k children with the LLM.
3. Evaluate: LLM value and/or environment reward (test results, tool outcomes).
4. Backpropagate: update visits and values up the path.
5. Optionally reflect on failed trajectories and feed reflections into later prompts (LATS combines these).

Use MCTS when actions have real environment feedback; for pure text reasoning, beam or best-first is usually cheaper.

## Generator Modes

| Mode | Call pattern | Use |
|---|---|---|
| Sample | k independent calls (temperature > 0) | Open-ended thoughts (plans, paragraphs) |
| Propose | 1 call returning k distinct options | Constrained spaces; avoids duplicates; cheaper |

## Evaluator Modes

| Mode | Call pattern | Use |
|---|---|---|
| Value | Score each state independently (sure/likely/impossible or 1-10) | Beam, DFS thresholds, best-first |
| Vote | Show all candidates, ask which is most promising (repeat n times) | When absolute scores are unreliable but comparison works |
| Programmatic | Code check | Always prefer when available |

## Parallelism

- Beam: all generator calls in a level are independent → issue concurrently with a semaphore matching rate limits.
- Batch evaluation: one call scoring all candidates of a level (cheaper, but position bias; shuffle order).
- DFS is inherently sequential; parallelize by running a few independent DFS workers from different root proposals.

## Pitfalls
- Using DFS with an uncalibrated evaluator: early high scores lock the search into a bad subtree.
- Comparing raw values across depths in best-first.
- Beam without dedup: b copies of the same idea.
- MCTS for problems with no reliable reward signal.

## Checklist
- [ ] Strategy chosen from checker availability, depth and feedback type
- [ ] Node/call budgets enforced for every strategy
- [ ] Beam diversity (dedupe, per-parent cap) in place
- [ ] Evaluator mode matched to how reliable absolute scores are
- [ ] Concurrency bounded by provider rate limits
