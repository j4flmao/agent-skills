---
name: oop-principles
description: >
  Use this skill when evaluating codebase design quality or refactoring — SOLID, GRASP, DRY, KISS, YAGNI, Law of Demeter, Composition over Inheritance, Encapsulation, Coupling & Cohesion. This skill enforces: principle violation detection heuristics, refactoring plans with ordered steps, actionable decision flow. Do NOT use for: language-specific idioms, framework patterns, infrastructure design.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, oop, phase-2, universal]
---

# OOP Principles

## Purpose
Apply and enforce language-agnostic OOP, SOLID, GRASP, and foundational software principles for robust backend design.

## Agent Protocol

### Trigger
User request includes: `oop`, `solid`, `grasp`, `principles`, `design principles`, `object-oriented`.

### Input Context
- Technology stack (language-agnostic)
- Current codebase design concerns (tight coupling, low cohesion, rigidity)
- Specific principle(s) to apply if requested

### Output Artifact
A markdown document containing:
- Explanation of relevant principle(s) with code examples
- Violation detection rules (static analysis / code review heuristics)
- Refactoring plan addressing identified violations
- Application-specific principle selection advice

### Response Format
Produce the artifact directly. No preamble, no postamble, no explanations. No filler, no hedging, no transitions. Strip articles a/an/the where unambiguous. Compress output — why use many token when few do trick. If no violations found, output `No violations detected.` and stop.

### Completion Criteria
- All applicable principles are covered
- Each principle includes: intent, applicability, violation heuristics, language-agnostic example
- Refactoring plan is actionable (ordered steps with file paths)

### Max Response Length
4096 tokens

## Workflow

### Step 1: Evaluate SOLID Principles

**Single Responsibility Principle (SRP)**
- A class/module should have one, and only one, reason to change.
- **Violation heuristics**: class name contains `And`, `Or`, `Manager`, `Util`, `Helper`; class has >4 public methods operating on different data domains.
- **Example**: `OrderService` that both validates orders and emails invoices → split into `OrderValidator` and `InvoiceNotifier`.

**Open-Closed Principle (OCP)**
- Software entities should be open for extension, closed for modification.
- Achieve via polymorphism, strategy pattern, template method, dependency injection.
- **Violation heuristics**: `switch`/`if-else` chains on type codes; frequent editing of existing classes to add new behavior.
- **Example**: Payment processor with `if(type == "credit")` → `CreditPayment : IPaymentMethod`.

**Liskov Substitution Principle (LSP)**
- Subtypes must be substitutable for their base types without altering correctness.
- **Violation heuristics**: derived class throws `NotImplementedException`; derived class strengthens preconditions or weakens postconditions; `is`/`as` checks before using base type.
- **Example**: `Rectangle` base with `Square` derived that overrides setter behavior → violates LSP.

**Interface Segregation Principle (ISP)**
- Clients should not be forced to depend on interfaces they do not use.
- **Violation heuristics**: interface has >3 methods where implementations throw `NotImplementedException` for some; fat interfaces with mixed responsibilities.
- **Example**: `IMultiFunctionPrinter` with `Print`, `Scan`, `Fax` → split into `IPrinter`, `IScanner`, `IFax`.

**Dependency Inversion Principle (DIP)**
- Depend on abstractions, not concretions. High-level modules should not depend on low-level modules.
- **Violation heuristics**: `new` keyword for services inside business logic; static method calls on concrete classes; direct file/system calls in domain code.
- **Example**: `OrderService` directly creates `SqlOrderRepository` → inject `IOrderRepository` instead.

### Step 2: Apply GRASP Patterns

| Pattern | Intent | Applies When |
|---|---|---|
| **Information Expert** | Assign responsibility to class with most data needed | Single class has all necessary info |
| **Creator** | Class A creates class B if A contains/composes/records B | Natural ownership exists |
| **Controller** | First object beyond UI that receives system events | Need to delegate from boundary to domain |
| **Low Coupling** | Assign responsibility to minimize dependencies | Two options exist, choose less coupled |
| **High Cohesion** | Assign responsibility keeping related operations together | Responsibilities span multiple unrelated areas |
| **Polymorphism** | Use polymorphic operations instead of type-based conditionals | Behavior varies by type |
| **Pure Fabrication** | Create artificial class when Expert pattern breaks SRP | No natural class fits responsibility |
| **Indirection** | Insert intermediary to decouple components | Direct coupling is too high |
| **Protected Variations** | Wrap unstable elements behind interface | External systems, third-party APIs, config |

### Step 3: Apply DRY / WET / AHA

- **DRY** (Don't Repeat Yourself): Every piece of knowledge must have a single, unambiguous representation. Violation = copy-paste code.
- **WET** (Write Everything Twice): Allowed temporarily during exploration. Must consolidate after stabilization.
- **AHA** (Avoid Hasty Abstractions): Prefer duplication over premature abstraction. Extract only after 3+ occurrences.

**Decision rule**: Duplicate once? Leave it. Duplicate twice? Extract. Duplicate same thing across bounded contexts? Keep separate — duplication may be accidental similarity.

### Step 4: Apply KISS / YAGNI

- **KISS** (Keep It Simple, Stupid): Simplest solution that passes all tests. No clever tricks, no premature optimization, no over-engineering.
- **YAGNI** (You Ain't Gonna Need It): Build only what is required now. Do not add hooks, extension points, or generalizations for speculated future needs.

**Query to apply before every implementation decision**: "What is the simplest possible thing that works right now?" If answer requires a new abstraction, reject it.

### Step 5: Apply Law of Demeter

- A unit should talk only to its immediate friends: itself, its fields, its method parameters, objects it creates.
- **Violation heuristics**: chained calls: `a.getB().getC().doSomething()`, train wrecks in general.
- **Exception**: builders, fluent APIs, streams, query objects — these are intentional DSLs.

### Step 6: Apply Composition over Inheritance

- **Rule**: Favor object composition over class inheritance.
- **When to use inheritance**: True `is-a` relationship, subclass does not override behavior negatively, no need to change behavior at runtime.
- **When to use composition**: Need runtime behavior swap, cross-cutting concerns, class hierarchy would be deep/complex.
- **Example**: `Duck` behaviors via `IFlyBehavior`/`IQuackBehavior` composition instead of `FlyingDuck`/`NonFlyingDuck` subclasses.

### Step 7: Apply Encapsulation / Information Hiding

- Hide internal state and implementation details. Expose only stable interfaces.
- **Rules**: All fields private by default. No getters/setters for internal collections without defensive copies. Mutable state must be contained within single aggregate.
- **Violation heuristics**: Public fields, protected fields in non-abstract classes, getter returning reference to mutable internal object.

### Step 8: Evaluate Coupling & Cohesion

| Metric | High | Low |
|---|---|---|
| **Cohesion** (within module) | Related operations grouped together | Unrelated operations in same class |
| **Coupling** (between modules) | Loose, depends on abstractions | Tight, depends on concrete implementations |

**Target**: High cohesion, loose coupling. Measure: a change in module A should affect at most 1-2 other modules on average.

### Step 9: Run Principles Application Decision Flow

1. **Does the codebase compile and pass tests?** → Proceed. Not yet? Fix that first.
2. **Is there a concrete pain point?** (hard to test, hard to change, hard to extend) → Identify which principle addresses it.
3. **Pain = tight coupling?** → DIP → extract abstractions → inject dependencies.
4. **Pain = change ripples everywhere?** → SRP + OCP → split responsibilities → extend via plugin.
5. **Pain = unexpected side effects?** → Encapsulation → hide state → defensive copies.
6. **Pain = type-based conditionals?** → Poly → strategy/state pattern.
7. **Pain = too many classes?** → YAGNI + AHA → collapse unnecessary abstractions.
8. **Pain = fragile base class?** → LSP check → composition over inheritance.

## Rules
- No `Manager`, `Util`, or `Helper` classes — they indicate SRP violations.
- No `switch`/`if-else` on type codes — use polymorphism instead.
- No chained calls violating Law of Demeter — use method delegation.
- All fields private by default.
- Prefer composition over inheritance in all new code.
- No premature abstractions — wait for 3+ duplications before extracting.
- No speculatively generic code — build only for current requirements.
- DRY within a bounded context; OK to duplicate across contexts.

## References
  - references/composition-vs-inheritance.md — Composition over Inheritance
  - references/grasp-patterns.md — GRASP Patterns
  - references/oop-solid.md — OOP SOLID Principles
  - references/principles-reference.md — Principles Reference
  - references/solid-deep-dive.md — SOLID Deep Dive
  - references/solid-examples.md — SOLID Code Examples
## Handoff
Hand off to `backend/universal/design-patterns/SKILL.md` if concrete pattern selection is required. Hand off to `backend/universal/clean-architecture/SKILL.md` if system architecture restructuring is needed.
