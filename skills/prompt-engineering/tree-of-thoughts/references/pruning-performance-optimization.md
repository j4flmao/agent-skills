# Pruning and Cost/Latency Optimization for Tree-of-Thoughts

ToT cost grows with depth × breadth × candidates. This file covers pruning rules, batching, caching, concurrency and early stopping that cut calls and latency without losing accuracy. Measure every change against the evaluation set described in `heuristic-evaluation-testing.md`.

## Where Calls Go

For beam search with depth T, beam b, k proposals per node, one evaluation per candidate:

```
generation calls  = T · b            (propose mode: one call returns k thoughts)
evaluation calls  = T · b · k        (one call per candidate)
                  = T                (if all candidates of a level are scored in one batched call)
```

Example: T=4, b=3, k=4 → 12 generation calls + 48 per-candidate evaluations, or 12 + 4 with batched evaluation per level.

## Pruning Rules (cheapest first)

| Rule | Cost | Effect |
|---|---|---|
| Programmatic validity check | none | Drop invalid steps before any LLM evaluation |
| Exact / normalized dedupe | none | Remove duplicate states (normalize whitespace, ordering of commutative terms) |
| Semantic dedupe (embeddings) | small | Merge near-duplicates above a similarity threshold |
| Evaluator threshold | 1 eval | Drop states rated "impossible" |
| Beam cap | none | Keep top-b per level |
| Per-parent cap | none | Avoid one parent dominating the beam |
| Depth limit / node budget | none | Bound worst case |

```python
from __future__ import annotations


def normalize(steps: list[str]) -> str:
    return "|".join(" ".join(s.lower().split()) for s in steps)


def prune(candidates: list[list[str]], is_invalid, seen: set[str]) -> list[list[str]]:
    kept = []
    for path in candidates:
        key = normalize(path)
        if key in seen or is_invalid(path):
            continue
        seen.add(key)
        kept.append(path)
    return kept
```

## Early Stopping

- Return as soon as a validated solution appears (do not finish the level).
- Stop when the best beam score has not improved for m levels.
- Stop when remaining budget cannot complete another level.
- For "best answer" tasks without a checker, stop when top candidates agree (self-consistency over leaves).

## Batching

- Evaluate all candidates of a level in one call (shuffle order to reduce position bias; ask for JSON array of ratings).
- Use "propose" generation: one call returns k distinct thoughts.
- Provider batch APIs (asynchronous, discounted) suit offline ToT workloads where latency does not matter.

## Caching

| Cache | Key | Notes |
|---|---|---|
| Evaluation cache | hash(model, prompt version, problem, normalized state) | Same state reached via different paths reuses the score |
| Generation cache | hash(model, prompt version, state, k, temperature) | Only for deterministic settings or offline replays |
| Provider prompt caching | Stable prefix (system prompt, problem, few-shot examples) first | Reduces input cost and latency on repeated prefixes |

```python
import hashlib
import json


def cache_key(model: str, prompt_version: str, problem: str, state: str) -> str:
    payload = json.dumps([model, prompt_version, problem, state], ensure_ascii=False)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()
```

Include tenant ID in keys for multi-tenant systems.

## Concurrency

```python
import asyncio


async def gather_bounded(coros, limit: int):
    sem = asyncio.Semaphore(limit)

    async def run(c):
        async with sem:
            return await c

    return await asyncio.gather(*(run(c) for c in coros))
```

- Expand all beam nodes of a level concurrently; set the limit from provider rate limits (requests and tokens per minute).
- Latency per level ≈ slowest call; per-call timeouts keep stragglers from stalling the level (treat timed-out candidates as unevaluated).

## Model Tiering

- Cheaper/faster model for generation of many candidates, stronger model for evaluation of the pruned set (or vice versa, measured).
- Programmatic evaluators first; LLM evaluator only for survivors.
- Consider whether a reasoning model in a single call matches ToT accuracy at lower total cost; measure both.

## Token Reduction

- Pass only what the next step needs: problem + compact state, not the full history of rejected branches.
- Summarize long partial solutions into a canonical state representation (e.g. remaining numbers in Game of 24 instead of all equations).
- Limit output tokens per call (`max_tokens`) to the expected size of a thought or rating.

## Budget Allocation

| Knob | Increase when | Decrease when |
|---|---|---|
| k (proposals) | Generator lacks diversity, solutions missed | Many duplicates / invalid proposals |
| b (beam) | Evaluator ranking is noisy | Evaluator AUC high |
| T (depth) | Problems need more steps | Most solutions found early |
| Eval samples | Single evaluations inconsistent | Programmatic checks available |

Tune on a validation set with a fixed total call budget, comparing accuracy per dollar.

## Metrics to Track

- Calls, input/output tokens and cost per problem.
- Fraction of candidates pruned by each rule.
- Cache hit rate.
- Latency per level and end to end (p50/p95).
- Accuracy at fixed budget.

## Pitfalls
- Aggressive thresholds that prune viable branches (check false prune rate).
- Caching generations at temperature > 0 for online use: removes intended diversity.
- Unbounded concurrency triggering rate limits and retries that cost more than sequential calls.
- Optimizing tokens while accuracy silently drops.

## Checklist
- [ ] Programmatic validation and dedupe before LLM evaluation
- [ ] Batched evaluation per level; propose-mode generation
- [ ] Evaluation cache keyed by model, prompt version, normalized state
- [ ] Bounded concurrency and per-call timeouts
- [ ] Early stopping rules
- [ ] Accuracy-per-cost compared after every optimization
