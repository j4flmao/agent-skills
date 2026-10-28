# Backtracking and Error Handling in Tree-of-Thoughts Search

How a ToT search recovers from dead ends (backtracking) and from failures of the LLM calls themselves (timeouts, rate limits, malformed output), without losing the explored tree or overspending the budget.

## Two Kinds of Failure

| Kind | Example | Response |
|---|---|---|
| Search failure (logical) | Node judged impossible, validator rejects path, depth limit hit | Backtrack: pop next-best alternative |
| Call failure (operational) | HTTP 429/5xx, timeout, refusal, unparseable JSON | Retry bounded, then treat node as unevaluated/low score, never crash the search |

Keep them separate in code: logical dead ends are normal search events; operational errors are counted, logged and budgeted.

## DFS with Explicit Backtracking

```python
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Callable

log = logging.getLogger(__name__)


@dataclass
class Node:
    steps: list[str]
    value: float
    children: list["Node"] = field(default_factory=list)


def dfs_solve(
    root: Node,
    expand: Callable[[Node], list[Node]],     # generate + evaluate children (may raise CallFailed)
    is_solution: Callable[[Node], bool],
    threshold: float,
    max_depth: int,
    max_nodes: int,
) -> Node | None:
    stack: list[tuple[Node, int]] = [(root, 0)]
    visited = 0
    while stack:
        node, depth = stack.pop()
        visited += 1
        if visited > max_nodes:
            log.warning("node budget exhausted visited=%d", visited)
            return None
        if is_solution(node):
            return node
        if depth == max_depth:
            continue                                   # dead end by depth: backtrack
        try:
            children = expand(node)
        except CallFailed as exc:
            log.warning("expand failed depth=%d steps=%d error=%s", depth, len(node.steps), exc)
            continue                                   # treat as dead end, keep searching
        viable = [c for c in children if c.value >= threshold]
        if not viable:
            continue                                   # all children pruned: backtrack
        # push lowest first so the best child is popped next
        for child in sorted(viable, key=lambda c: c.value):
            stack.append((child, depth + 1))
    return None


class CallFailed(RuntimeError):
    pass
```

Backtracking is implicit: when a branch yields no viable children the loop pops the next pending sibling or ancestor alternative. Because the stack keeps unexpanded alternatives, no state is recomputed.

## Backtracking Policies

| Policy | Behavior | When |
|---|---|---|
| Chronological (stack) | Return to most recent alternative | Default DFS |
| Best-first (priority queue) | Return to globally best open node | Evaluator scores comparable across depths |
| Threshold relaxation | If whole tree fails, rerun with lower threshold | Evaluator is conservative |
| Restart with feedback | New root prompt includes summary of failed approaches | Failures share a cause the generator can avoid |

Restart with feedback example prompt fragment:

```
Previously tried approaches that failed:
- "multiply 4*6 first" -> remaining numbers cannot reach 0
- "subtract 13-9 first" -> invalid intermediate
Propose next steps that differ from these.
```

## Retrying LLM Calls

```python
import random
import time


RETRYABLE_STATUS = {408, 429, 500, 502, 503, 504}


def call_with_retry(call: Callable[[], str], attempts: int = 3, base: float = 1.0, cap: float = 20.0) -> str:
    for attempt in range(1, attempts + 1):
        try:
            return call()
        except ApiError as exc:
            if exc.status not in RETRYABLE_STATUS or attempt == attempts:
                raise CallFailed(f"status={exc.status} attempt={attempt}") from exc
            delay = exc.retry_after or random.uniform(0, min(cap, base * 2 ** attempt))
            time.sleep(delay)
    raise CallFailed("unreachable")


class ApiError(Exception):
    def __init__(self, status: int, retry_after: float | None = None) -> None:
        super().__init__(f"API error {status}")
        self.status, self.retry_after = status, retry_after
```

Map your SDK's exceptions to `ApiError`. Most provider SDKs already retry some errors; avoid stacking a second retry layer on top of the SDK's own retries without lowering one of them.

Every retry counts against the search's call budget.

## Malformed Output

Generators and evaluators should return structured output (JSON schema / tool call). On parse failure:

```python
import json


def parse_ratings(raw: str, n: int) -> list[float]:
    scale = {"sure": 1.0, "likely": 0.5, "impossible": 0.0}
    try:
        ratings = json.loads(raw)["ratings"]
    except (json.JSONDecodeError, KeyError, TypeError) as exc:
        log.warning("evaluator output unparseable error=%s", exc)
        return [0.0] * n                      # conservative: prune rather than trust garbage
    if len(ratings) != n:
        log.warning("evaluator returned %d ratings for %d candidates", len(ratings), n)
        ratings = (ratings + ["impossible"] * n)[:n]
    return [scale.get(str(r).lower(), 0.0) for r in ratings]
```

Options for parse failures: one repair attempt ("Return only valid JSON matching the schema"), then fall back to a conservative score. Prefer the provider's structured-output / tool-use features to reduce these failures.

## Preserving Progress

- Persist the frontier/stack and visited set after each level (see `thought-node-state-management.md`) so a crashed worker resumes instead of restarting.
- Record the best partial solution seen so far; when the budget runs out, return it flagged as incomplete instead of nothing, if the caller accepts partial answers.

## Termination Conditions

| Condition | Result |
|---|---|
| Solution validated | Return path |
| Node or call budget exhausted | Return best partial (flagged) or `None` |
| Wall-clock deadline | Same as budget |
| Too many consecutive call failures (e.g. 5) | Abort with error; provider is unhealthy |

## Pitfalls
- Catching all exceptions and treating them as dead ends: provider outages look like "no solution".
- Retrying without counting toward budget: cost runaway.
- Optimistic default score on parse failure: garbage nodes dominate the search.
- Unbounded restart-with-feedback loops.

## Checklist
- [ ] Logical dead ends and call failures handled separately
- [ ] Retries bounded, jittered, budgeted, single layer
- [ ] Structured outputs with conservative fallback on parse errors
- [ ] Frontier persisted for resume; best partial tracked
- [ ] Abort on sustained provider failures
