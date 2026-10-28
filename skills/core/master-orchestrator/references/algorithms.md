# Routing Algorithms

The algorithms the orchestrator applies, written as deterministic procedures so routing is reproducible and testable: request normalization, trigger matching, stack detection, candidate scoring with tie-breaks, and template selection. A reference Python implementation is included for building routing evals.

## 1. Request Normalization

```text
normalize(text):
  lower-case
  replace punctuation except '-', '.', '/', '#', '+' with space
  collapse whitespace
  expand aliases: "k8s"→"kubernetes", "rn"→"react-native", "ts"→"typescript",
                  "gha"→"github-actions", "pg"/"postgres"→"postgresql"
  produce: tokens (single words) and bigrams joined by '-' ("feature flag" → "feature-flag")
```

Keeping `.`, `#`, `+` preserves names like `next.js`, `c#`, `c++`. Bigrams let routing-table keys such as `feature-flag` or `api-design` match natural phrasing.

## 2. Trigger Matching

The routing table maps trigger groups to skill IDs:

```text
idempotency/idempotent          → backend/universal/idempotency
gitops/argocd/flux              → devops/gitops
```

Matching rules:

| Rule | Detail |
|------|--------|
| Exact token | `fastify` matches `fastify` |
| Hyphen key | `feature-flag` matches bigram `feature-flag` or the two tokens adjacent |
| Prefix families | `{stack}` template variables resolve after stack detection (`backend/{stack}/`) |
| No substring | `go` must not match `google`; match whole tokens only |
| Negation | "not using Redux" removes `redux` from the match set |

## 3. Stack Detection

Stop at the first decisive signal, most specific first.

```text
detect_stack(root):
  if exists package.json:
      deps = dependencies ∪ devDependencies
      check in order: @nestjs/core, elysia, next, nuxt, @sveltejs/kit, @angular/core,
                      react-native, expo, electron, hono, fastify, express, vue, react
      return first hit
  if exists go.mod            → go
  if exists Cargo.toml        → tauri if "tauri" in deps else rust
  if exists pubspec.yaml      → flutter
  if exists pyproject.toml / requirements.txt → django | fastapi | flask by dependency
  if exists pom.xml / build.gradle(.kts) → quarkus | micronaut | spring-boot | kotlin
  if exists *.csproj / *.sln  → wpf | winforms | maui | dotnet by SDK/properties
  if exists Package.swift     → swift (vapor if dependency)
  if exists mix.exs           → elixir
  if exists Gemfile with rails → rails
  return UNKNOWN
```

Order matters: a Next.js app also depends on `react`; checking `next` first avoids routing to plain React. An Expo app depends on `react-native`; both route to `mobile/react-native`.

## 4. Candidate Scoring

```text
score(candidate) = 100 * explicit_mention
                 +  10 * matched_trigger_count
                 +   5 * specificity          (path depth: backend/nodejs/hono = 3)
                 +   8 * stack_agrees         (candidate path contains detected stack)
                 -  20 * stack_conflicts      (candidate for a different stack)
```

Then sort by `(score desc, phase_index asc, path asc)`. The final `path asc` key makes ties deterministic. Weights are a convention for this repo, chosen so an explicit mention always wins and a stack conflict outweighs one extra keyword; adjust them only together with the golden routing set.

Phase index: planning 0, backend 1, frontend 2, mobile 3, desktop 4, dev-loop 5, devops 6, management 7, game 8. Categories outside the list (ai, data, security, ...) take the phase of the work they serve, default 5.

## 5. State Override (planning gate)

Before scoring, apply the planning gate for open-ended requests:

```text
if intent == OPEN_ENDED:
    if no brief           → return A(planning/create-brief)
    if brief and no prd   → return A(planning/create-prd)
    if prd and no spec/adr → return A(planning/create-tech-spec)
```

Direct requests (bug, review, specific technology) skip the gate.

## 6. Template Selection

```text
if top is None or (stack required and stack == UNKNOWN):        → C
if len(top_ties) > 1 and scores equal and phases equal:          → C (options = ties)
if request lists dependent tasks and each maps to a distinct skill: → B (ordered by phase)
else                                                              → A
```

## 7. Reference Implementation

```python
from __future__ import annotations

import re
from dataclasses import dataclass

PHASES = ["planning", "backend", "frontend", "mobile", "desktop",
          "dev-loop", "devops", "management", "game"]
ALIASES = {"k8s": "kubernetes", "gha": "github-actions", "pg": "postgresql",
           "postgres": "postgresql", "rn": "react-native"}


@dataclass(frozen=True, slots=True)
class Route:
    triggers: frozenset[str]
    skill: str

    @property
    def phase_index(self) -> int:
        category = self.skill.split("/", 1)[0]
        return PHASES.index(category) if category in PHASES else 5

    @property
    def depth(self) -> int:
        return self.skill.count("/") + 1


def terms(text: str) -> set[str]:
    words = [ALIASES.get(w, w) for w in re.findall(r"[a-z0-9.#+]+", text.lower())]
    bigrams = {f"{a}-{b}" for a, b in zip(words, words[1:])}
    return set(words) | bigrams | {w for w in re.findall(r"[a-z0-9]+(?:-[a-z0-9]+)+", text.lower())}


def rank(request: str, routes: list[Route], stack: str | None) -> list[tuple[int, Route]]:
    found = terms(request)
    scored: list[tuple[int, Route]] = []
    for route in routes:
        hits = len(route.triggers & found)
        if hits == 0:
            continue
        score = 10 * hits + 5 * route.depth
        if stack:
            score += 8 if stack in route.skill else 0
        scored.append((score, route))
    scored.sort(key=lambda sr: (-sr[0], sr[1].phase_index, sr[1].skill))
    return scored


def parse_routing_table(markdown: str) -> list[Route]:
    routes = []
    for line in markdown.splitlines():
        m = re.match(r"^\s*([a-z0-9./#+\-]+(?:/[a-z0-9.#+\-]+)*)\s+→\s+(\S+)", line)
        if m:
            routes.append(Route(frozenset(m.group(1).split("/")), m.group(2).rstrip("/")))
    return routes
```

Usage in an eval: parse `.claude/rules/routing.md`, run `rank()` over the golden set, assert `rank(...)[0][1].skill == expected`. The parser splits a trigger group such as `gitops/argocd/flux` on `/`; it is a test harness, not the agent's runtime.

## 8. Complexity

With T trigger groups and R request terms, matching with a set intersection per route is O(T · min(|g|, R)); the full table (a few hundred rows) is trivial. The expensive part of routing is reading files for stack detection, so read only manifests, never source trees.

## Pitfalls

- Substring matching (`go` in `mongo`) causes false stack hits.
- Scoring without the phase tie-break produces order-dependent results.
- Applying the planning gate to direct bug reports blocks urgent fixes.
- Letting dependency names override an explicit user statement ("we're migrating off Express to Hono" → Hono).

## Checklist

- [ ] Whole-token matching with aliases and bigrams
- [ ] Stack detection ordered most-specific first
- [ ] Deterministic tie-break `(score, phase, path)`
- [ ] Planning gate only for open-ended intent
- [ ] Golden-set test uses the same parser and ranker
