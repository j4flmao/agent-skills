---
name: design-patterns
description: >
  Use this skill when selecting or reviewing any design pattern — GoF creational/structural/behavioral, enterprise, integration, concurrency, architectural, or anti-pattern avoidance. This skill enforces: pattern selection decision framework, trade-off analysis, anti-pattern rejection, explicit elimination criteria for rejected candidates, and pattern composition rules. Do NOT use for: framework-specific patterns (e.g. Angular DI), language-specific idioms (e.g. Rust ownership), infrastructure patterns (e.g. Kubernetes operators).
version: "1.1.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, design-patterns, phase-2, universal]
---

# Design Patterns

## Purpose
Guide pattern selection across all categories — GoF, enterprise, integration, concurrency, architectural — with decision trees, applicability rules, trade-off analysis, and composition guidance.

## Agent Protocol

### Trigger
User request includes: `design pattern`, `gof`, `gang of four`, `pattern catalog`, `creational`, `structural`, `behavioral`, `pattern selection`, `enterprise pattern`, `integration pattern`, `concurrency pattern`, `architectural pattern`, `anti-pattern`, `pattern composition`, `CQRS`, `event sourcing`, `saga`, `repository`, `unit of work`, `messaging pattern`, `circuit breaker`, `strangler fig`, `saga pattern`, `hexagonal architecture`, `clean architecture`.

### Input Context
- Problem statement with constraints (performance, memory, team size, tech stack)
- Current architecture description
- Existing patterns already in use
- Pattern category preference or openness

### Output
Selected pattern(s) with rationale, rejected candidates with explicit elimination reasons, implementation sketch, trade-off table, and composition rules if multiple patterns are needed.

### Response Format
No preamble. No postamble. No explanations. No filler/hedging/transitions. Strip articles a/an/the where unambiguous. Compress output — why use many token when few do trick. If no pattern fits, output `No matching pattern. Consider: [alternative approach].` and stop. For multi-pattern solutions, show composition order.

### Completion Criteria
- Decision tree traversed and documented
- Rejected candidates include explicit elimination reason
- Implementation sketch covers pattern structure (not full business logic)
- Trade-offs documented for each selected pattern
- Pattern composition rules applied if multiple patterns

## Workflow

### Step 1: Classify the Problem
Determine which pattern category applies:

| Problem | Category | Reference |
|---|---|---|
| Object creation, instance management | Creational | `gof-patterns.md` |
| Class/object composition, interfaces | Structural | `gof-patterns.md` |
| Object communication, algorithms | Behavioral | `gof-patterns.md` |
| Business logic organization, persistence | Enterprise | `enterprise-patterns.md` |
| Service-to-service communication | Integration | `integration-patterns.md` |
| Thread safety, async coordination | Concurrency | `concurrency-patterns.md` |
| High-level system structure | Architectural | `enterprise-patterns.md` |
| Code smells needing refactoring | Anti-patterns | `anti-patterns.md` |

### Step 2: Apply Selection Decision Framework
1. **What is changing?** (axis of change) — patterns encapsulate change
2. **What is binding time?** (compile-time vs runtime)
3. **What is scope?** (class-level vs object-level)

### Step 3: Evaluate Candidates Within Category
Consult the relevant reference file. For each candidate pattern, evaluate:
- **Intent match**: Does the pattern's intent solve the stated problem?
- **Applicability**: Are the conditions for using this pattern met?
- **Trade-offs**: What does the pattern cost (complexity, indirection, performance)?
- **Composition**: Does this pattern combine well with others?

### Step 4: Reject Anti-Patterns
Explicitly check that the selected pattern does not lead to known anti-patterns (see `anti-patterns.md`).

### Step 5: Document Selection
For each selected pattern:
| Field | Value |
|---|---|
| Pattern | Name and category |
| Intent match | Why this pattern fits |
| Rejected alternatives | Patterns considered but eliminated, with reasons |
| Composition | How this interacts with existing patterns |
| Trade-offs | Pros and cons in current context |
| Sketch | Key interfaces, classes, and relationships |

## Rules
- Identify axis of change before selecting pattern.
- Prefer composition over inheritance.
- Singleton only when DI cannot manage lifecycle.
- Flyweight only when profiler confirms memory pressure.
- No pattern is universally applicable — context determines fitness.
- Enterprise patterns solve business logic organization — do not mix with GoF concerns.
- Integration patterns solve service communication — do not apply where in-process patterns suffice.
- Concurrency patterns add complexity — use only when profiler confirms race conditions or contention.
- Architectural patterns constrain the entire system — apply early, refactor reluctantly.
- Every pattern selection must document rejected alternatives with reasons.

## References
  - references/anti-patterns.md — Anti-Patterns Reference
  - references/concurrency-patterns.md — Concurrency Patterns
  - references/domain-driven-design-patterns.md — Domain-Driven Design Patterns
  - references/enterprise-patterns.md — Enterprise & Architectural Patterns
  - references/gof-patterns.md — GoF (Gang of Four) Design Patterns Reference
  - references/integration-patterns.md — Enterprise Integration Patterns (EIP) Reference
  - references/pattern-catalog.md — Pattern Catalog
  - references/pattern-relationships.md — Pattern Relationships & Selection Reference
  - references/selection-decision-tree.md — Pattern Selection Decision Tree
  - references/testing-patterns.md — Testing Design Patterns
## Handoff
Hand off to `backend/universal/microservices/SKILL.md` if distributed system patterns (saga, CQRS, event sourcing) need implementation details. Hand off to `backend/universal/clean-architecture/SKILL.md` if structuring the entire application. Hand off to `backend/universal/event-driven/SKILL.md` if event-driven patterns need elaboration.
