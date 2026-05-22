---
name: design-patterns
description: >
  Use this skill when selecting or reviewing GoF and enterprise design patterns — creational, structural, behavioral. This skill enforces: pattern selection decision framework, trade-off analysis, anti-pattern rejection, and explicit elimination criteria for rejected candidates. Do NOT use for: framework-specific patterns, language-specific idioms, infrastructure patterns.
version: "1.0.0"
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
Guide pattern selection with decision trees, applicability rules, and trade-off analysis.

## Agent Protocol

### Trigger
User request includes: `design pattern`, `gof`, `gang of four`, `pattern catalog`, `creational`, `structural`, `behavioral`, `pattern selection`.

### Input Context
- Problem statement (what needs to be solved)
- Constraints (performance, memory, team size, tech stack)
- Current architecture description
- Existing patterns already in use

### Output Artifact
A markdown document containing:
- Selected pattern(s) with rationale
- Selection criteria checklist showing why other candidates were rejected
- Implementation sketch with key interfaces/classes
- Trade-off table (pros/cons/context)

### Response Format
Produce the artifact directly. No preamble, no postamble, no explanations. No filler, no hedging, no transitions. Strip articles a/an/the where unambiguous. Compress output — why use many token when few do trick. If no pattern fits, output `No matching pattern. Consider: [alternative approach].` and stop.

### Completion Criteria
- Selection decision tree is traversed and documented
- Rejected candidates include explicit elimination reason
- Implementation sketch covers pattern structure only (not full business logic)
- Trade-offs documented for the selected pattern

### Max Response Length
4096 tokens

## Workflow

### Step 1: Apply Pattern Selection Decision Framework
Before selecting any pattern, answer three questions:

1. **What is changing?** (identify the axis of change) → patterns encapsulate change
2. **What is the binding time?** (compile-time vs runtime) → determines which patterns apply
3. **What is the scope?** (class-level vs object-level) → narrows candidate set

```
PROBLEM → Identify axis of change → Categorize (creational/structural/behavioral) →
Filter by binding time → Filter by scope → Apply trade-off matrix → Select
```

### Step 2: Evaluate Creational Patterns

| Pattern | Intent | Binding | Selection Trigger |
|---|---|---|---|
| **Singleton** | Ensure one instance, global access | Runtime | Exactly one instance required, shared resource pool |
| **Factory Method** | Delegate instantiation to subclasses | Compile-time | Class cannot anticipate concrete class to create |
| **Abstract Factory** | Create families of related objects | Runtime | System must be independent of how products are created |
| **Builder** | Construct complex objects step-by-step | Runtime | Object has many optional parameters, construction process should produce different representations |
| **Prototype** | Clone existing instances | Runtime | Cost of creating new instance > cloning; object state is similar |

**Selection Rules**:
- **Singleton**: Apply ONLY when you need controlled access to a single instance AND cannot use dependency injection to manage lifecycle. Never use for database connections in DI containers — let the container manage singletons.
- **Factory Method**: Apply when a class cannot anticipate the type of objects it must create. Prefer over `Abstract Factory` when only one product family exists.
- **Abstract Factory**: Apply when system must be configured with multiple families of products. Replace with simple factory + DI if product families do not grow.
- **Builder**: Apply when object requires >4 constructor parameters OR when the same construction process can create different representations. Prefer over telescoping constructors.
- **Prototype**: Apply when instantiation is expensive (database lookup, network call) and object state varies little between instances. Prefer `Factory Method` if object creation is not expensive.

### Step 3: Evaluate Structural Patterns

| Pattern | Intent | Selection Trigger |
|---|---|---|
| **Adapter** | Convert interface to another | Existing class has wrong interface |
| **Bridge** | Decouple abstraction from implementation | Abstraction and implementation should vary independently |
| **Composite** | Treat individual and composite objects uniformly | Tree structure of part-whole hierarchies |
| **Decorator** | Attach responsibilities dynamically | Need to add behavior without subclassing, at runtime |
| **Facade** | Unified interface to subsystem | Need simplified interface to complex subsystem |
| **Flyweight** | Share fine-grained objects efficiently | Many similar objects, memory is concern |
| **Proxy** | Surrogate controls access to another object | Need lazy loading, access control, logging, or remote access |

**Selection Rules**:
- **Adapter**: Apply when integrating third-party library or legacy code. Distinguish class adapter (inheritance) vs object adapter (composition) — prefer object adapter.
- **Bridge** vs **Strategy**: Bridge works at structure level (abstraction/implementation separation), Strategy at behavior level (algorithm selection). Bridge is broader.
- **Composite**: Apply when client code treats leaf and container uniformly AND the structure is hierarchical. Violation = adding child management methods to leaf classes.
- **Decorator** vs **Proxy**: Decorator adds behavior, Proxy controls access. Both share structure but differ in intent. Use Decorator when client should not know about decoration layer.
- **Facade**: Apply when subsystem is complex, tightly coupled, or poorly documented. Facade is NOT a mediator — subsystems can still be accessed directly when needed.
- **Flyweight**: ONLY apply when profiler confirms memory pressure from object count. The complexity cost is high. Premature flyweight is a known anti-pattern.
- **Proxy**: Four variants — Virtual (lazy loading), Protection (access control), Remote (network proxy), Logging (audit). Choose variant based on cross-cutting concern.

### Step 4: Evaluate Behavioral Patterns

| Pattern | Intent | Selection Trigger |
|---|---|---|
| **Chain of Responsibility** | Pass request along handler chain | Multiple handlers may process request; handler unknown upfront |
| **Command** | Encapsulate request as object | Need parameterize, queue, log, or undo operations |
| **Interpreter** | Define grammar and interpret sentences | Simple grammar, performance not critical |
| **Iterator** | Access elements sequentially | Need uniform traversal over different collections |
| **Mediator** | Centralize complex communication | Many objects communicate in chaotic web |
| **Memento** | Capture and restore object state | Undo/rollback needed without violating encapsulation |
| **Observer** | Notify dependents of state changes | One-to-many dependency, state changes should propagate |
| **State** | Alter behavior when internal state changes | Object behavior depends on its state, state transitions are complex |
| **Strategy** | Select algorithm at runtime | Family of algorithms, interchangeable, vary independently |
| **Template Method** | Define skeleton, let subclasses fill steps | Algorithm invariant steps, subclasses override variant steps |
| **Visitor** | Separate algorithm from object structure | Many unrelated operations on stable object structure |

**Selection Rules**:
- **Chain of Responsibility**: Apply when handler is unknown upfront AND there are 3+ handlers. Prefer over massive `if-else` chain. Set a chain length limit.
- **Command**: Apply when you need undo/redo, operation queuing, or transactional behavior. Each command must expose `execute()`, `undo()` and a `CanExecute()` guard.
- **Mediator** vs **Observer**: Mediator centralizes communication, Observer distributes it. Use Mediator when many-to-many relationships exist; use Observer for one-to-many.
- **State** vs **Strategy**: State changes behavior automatically when internal state changes. Strategy requires client to swap algorithm. Both use composition but State has state transition logic.
- **Template Method**: Apply when algorithm invariant steps are known and variant steps are few. Prefer Strategy when entire algorithm varies.
- **Visitor**: Apply when object structure is stable (rarely changes) but operations on it change frequently. If structure changes often, Visitor becomes unmaintainable.

### Step 5: Reject Anti-Patterns

| Anti-Pattern | Why | Replacement |
|---|---|---|
| **God Class** | Violates SRP, impossible to test | Split by responsibility |
| **Singleton Abuse** | Global state, hidden dependencies | DI container singleton scope |
| **Spaghetti Code** | No structure, GOTO-like logic | Decompose, apply patterns |
| **Golden Hammer** | Pattern applied everywhere | Select pattern per problem |
| **Premature Optimization** | Complex patterns before evidence | YAGNI, refactor when needed |

## Rules
- Always identify axis of change before selecting pattern.
- Prefer composition over inheritance for structural patterns.
- Singleton only when DI container cannot manage lifecycle.
- Flyweight only when profiler confirms memory pressure.
- Every pattern selection must document rejected alternatives with reasons.
- No pattern is universally applicable — context determines fitness.

## References

### Reference Files
- `references/pattern-catalog.md` — Full pattern catalog with code examples
- `references/selection-decision-tree.md` — Decision tree for pattern selection

### Related Skills
- `backend/universal/oop-principles/SKILL.md` — Foundational design principles
- `backend/universal/clean-architecture/SKILL.md` — Architectural pattern application
- `backend/universal/microservices/SKILL.md` — Microservices-specific patterns

## Handoff
Hand off to `backend/universal/microservices/SKILL.md` if distributed system patterns (saga, CQRS, event sourcing) are needed. Hand off to `backend/universal/oop-principles/SKILL.md` if foundational refactoring is required first.
