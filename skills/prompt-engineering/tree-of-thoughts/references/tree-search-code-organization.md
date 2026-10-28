# Code Organization for Tree-of-Thoughts Implementations

How to structure a ToT codebase so search algorithms, task definitions, LLM clients and evaluators are independent, testable and swappable.

## Module Layout

```
tot/
  pyproject.toml
  src/tot/
    core/
      types.py          # Node, SearchState, SearchLimits, results (pure dataclasses)
      budget.py         # call/token/time accounting, BudgetExceeded
      protocols.py      # Task, Generator, Evaluator, LLMClient protocols
    search/
      beam.py           # beam/BFS
      dfs.py            # DFS with backtracking
      best_first.py
    tasks/
      game24.py         # task: canonical state, validity, solution check, prompts
      planning.py
    llm/
      client.py         # provider adapter: retries, timeouts, structured output
      cache.py
    evaluators/
      llm_value.py
      llm_vote.py
      programmatic.py
    eval/
      run_eval.py       # offline evaluation harness
      gate.py
    prompts/
      game24/propose.v4.txt
      game24/value.v3.txt
  tests/
    unit/               # search algorithms with fake generators/evaluators
    integration/        # real provider calls on a tiny fixture (opt-in)
  configs/
```

## Core Protocols

```python
from __future__ import annotations

from collections.abc import Sequence
from typing import Protocol


class Task(Protocol):
    def initial_state(self, problem: str) -> str: ...
    def apply(self, state: str, thought: str) -> str | None: ...   # None = invalid thought
    def is_solution(self, state: str) -> bool: ...
    def render_state(self, state: str) -> str: ...                 # text for prompts


class Generator(Protocol):
    def propose(self, problem: str, state: str, k: int) -> Sequence[str]: ...


class Evaluator(Protocol):
    def score(self, problem: str, states: Sequence[str]) -> Sequence[float]: ...


class LLMClient(Protocol):
    def complete_json(self, system: str, user: str, schema: dict, max_tokens: int) -> dict: ...
```

Rules:
- Search algorithms depend only on `Task`, `Generator`, `Evaluator` and `Budget` — never on a provider SDK.
- Tasks own domain logic (validity, canonical state); they contain no LLM calls.
- LLM-backed generators/evaluators depend on `LLMClient`, which wraps one provider SDK and handles retries, timeouts and structured output.

## Search Function Shape

```python
def beam_search(
    problem: str,
    task: Task,
    generator: Generator,
    evaluator: Evaluator,
    *,
    depth: int,
    breadth: int,
    k: int,
    budget: Budget,
) -> SearchResult:
    states = [task.initial_state(problem)]
    for level in range(depth):
        children: list[str] = []
        for s in states:
            budget.spend_call()
            for thought in generator.propose(problem, s, k):
                nxt = task.apply(s, thought)
                if nxt is None:
                    continue
                if task.is_solution(nxt):
                    return SearchResult.solved(nxt, budget)
                children.append(nxt)
        children = list(dict.fromkeys(children))       # dedupe, keep order
        if not children:
            return SearchResult.failed("no_valid_children", budget)
        budget.spend_call()
        scores = evaluator.score(problem, children)
        ranked = sorted(zip(children, scores), key=lambda p: p[1], reverse=True)
        states = [c for c, v in ranked[:breadth] if v > 0]
        if not states:
            return SearchResult.failed("all_pruned", budget)
    return SearchResult.failed("depth_exhausted", budget)
```

`SearchResult` carries status, solution, calls and tokens used, so callers and evaluation code read structured outcomes rather than `None`.

## Fakes for Tests

```python
class ScriptedGenerator:
    def __init__(self, script: dict[str, list[str]]) -> None:
        self.script = script

    def propose(self, problem: str, state: str, k: int) -> list[str]:
        return self.script.get(state, [])[:k]


class TableEvaluator:
    def __init__(self, table: dict[str, float], default: float = 0.0) -> None:
        self.table, self.default = table, default

    def score(self, problem: str, states):
        return [self.table.get(s, self.default) for s in states]
```

These make search behavior fully deterministic in unit tests: dead ends, ties, empty proposals, budget exhaustion.

## Prompts as Data

- Prompt templates live in files with explicit versions; code loads them by `(task, name, version)`.
- Templates use named template variables; rendering escapes content (see security practices).
- A prompt change is a new version, evaluated before the config points to it.

## Configuration

- Pydantic or dataclass config objects loaded from YAML; validated at startup (types, ranges, known prompt versions).
- No API keys in configs; read from environment/secret manager in the LLM client.

## Dependency Direction

```
tasks  ─┐
core   ─┼─>  search  ─>  eval / service
llm    ─┴─>  evaluators, generators
```

`core` imports nothing from other packages; `search` imports `core` only; provider SDK imports appear only in `llm/`.

## Pitfalls
- Search code calling the provider SDK directly: impossible to unit test, provider lock-in.
- Domain checks embedded in prompts only, not in code.
- Prompts as inline f-strings scattered across modules.
- Returning `None` for every failure mode, hiding why the search stopped.

## Checklist
- [ ] Protocols separate task, generator, evaluator and LLM client
- [ ] Search algorithms provider-agnostic and unit-tested with fakes
- [ ] Prompts versioned as files
- [ ] Structured `SearchResult` with termination reason and cost
- [ ] Config validated at startup; secrets from environment
