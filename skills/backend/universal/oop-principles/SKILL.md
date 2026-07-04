---
name: OOP Principles and Architecture
description: >
  Universal backend skill for applying Object-Oriented Programming principles,
  including SOLID, DRY, KISS, YAGNI, Encapsulation, Polymorphism, Inheritance,
  and Composition over Inheritance. Ensures robust and scalable system designs.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
type: skill
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags:
  - backend
  - oop
  - architecture
  - solid
  - universal
---

# OOP Principles and Architecture

## Purpose
This skill encapsulates deep structural and behavioral patterns of Object-Oriented Programming for backend systems. The purpose is to enforce rigorous architectural integrity by systematically applying SOLID principles, ensuring encapsulation boundary maintenance, optimizing inheritance chains, and favoring composition over inheritance where applicable. The skill evaluates system complexity, refactors deeply coupled classes, manages domain boundaries, and aligns state-management with modern software engineering disciplines to ensure maintainability, testability, and extensibility of the codebase.

## Core Principles
1. **Single Responsibility and Cohesion**: Every class, module, or function must have one and only one reason to change, maximizing cohesion and minimizing cross-domain dependencies.
2. **Open/Closed and Extensibility**: Software entities should be open for extension but closed for modification, leveraging interfaces, abstract classes, and polymorphism to introduce new behaviors without mutating existing, tested code.
3. **Liskov Substitution and Behavioral Subtyping**: Derived classes must be completely substitutable for their base classes, honoring the contract defined by the abstractions without introducing unexpected side effects or structural exceptions.
4. **Interface Segregation and Dependency Inversion**: Clients should not be forced to depend upon interfaces they do not use, and high-level modules must not depend on low-level modules; both should depend on abstractions to decouple the architecture.
5. **Composition over Inheritance**: Code reuse and behavioral expansion should be primarily achieved by composing objects together at runtime through interfaces, rather than building deep and rigid compile-time inheritance hierarchies.

## Agent Protocol

### Triggers
- When the user asks to review or refactor a backend class hierarchy.
- When there is a request to decouple tightly bound components.
- During code generation tasks requiring a robust domain model.
- When cyclomatic complexity flags are raised by static analysis tools.

### Input Context Required
- Target codebase or specific architectural modules to analyze.
- Current complexity metrics or static analysis reports (if available).
- Business requirements and domain boundaries for the affected components.

### Output Artifact
- Detailed Refactoring Plan outlining architectural shifts.
- Generated code stubs displaying decoupled interfaces and dependency injection.
- Updated complexity metrics reflecting the improvements.

### Response Formats
```json
{
  "analysis_result": {
    "module": "OrderProcessing",
    "violations": ["Single Responsibility Principle", "Dependency Inversion"],
    "proposed_refactor": "Extract interface IOrderProcessor, inject IInventoryService",
    "expected_complexity_reduction": 15
  },
  "status": "Ready for execution"
}
```

## Decision Matrix
```text
[Start Architectural Review]
       |
       v
+-----------------------------+
| Is the class deeply coupled |
| to concrete dependencies?   |
+-----------------------------+
       | (Yes)                  (No)
       v                          |
[Apply Dependency Inversion]      v
[Extract Interface]       +-------------------------------+
       |                  | Does the class have multiple  |
       v                  | reasons to change?            |
[Inject via Constructor]  +-------------------------------+
                                  | (Yes)                 (No)
                                  v                         |
                     [Apply Single Responsibility]          v
                     [Split Class into multiple]   +---------------------------+
                     [Domain specific services]    | Is inheritance deeper     |
                                  |                | than 2 levels?            |
                                  v                +---------------------------+
                                                     | (Yes)            (No)
                                                     v                   |
                                            [Refactor to Composition]    v
                                            [Use Strategy Pattern]    [Approve]
```

## Detailed Architectural Overview

### System Architecture
```text
+-------------------------------------------------------------+
|                     Application Layer                       |
|  +-------------------+               +-------------------+  |
|  |  Client Handler   |               |  Event Publisher  |  |
|  +-------------------+               +-------------------+  |
+------------|-----------------------------------|------------+
             | depends on                        | depends on
             v                                   v
+-------------------------------------------------------------+
|                     Domain / Core Layer                     |
|  +-------------------+               +-------------------+  |
|  |   <<Interface>>   |               |   <<Interface>>   |  |
|  |  IServiceCore     |               |  IRepositoryCore  |  |
|  +-------------------+               +-------------------+  |
|             ^                                   ^           |
|             | implements                        | implements|
|  +-------------------+               +-------------------+  |
|  | ServiceImpl (SRP) |               | RepositoryImpl    |  |
|  +-------------------+               +-------------------+  |
+-------------------------------------------------------------+
```

### Lifecycle Diagram
```text
[Initialization] ---> [Dependency Resolution] ---> [Container Construction]
        |                                                   |
        v                                                   v
[State Hydration] <--- [Business Logic Execution] <--- [Service Invocation]
        |
        v
[State Persistence] ---> [Event Emission] ---> [Destruction / Cleanup]
```

## Workflow Steps

### Phase 1: Contextual Discovery
1. Analyze the input source files to understand the current domain model.
2. Identify existing class structures, interfaces, and module boundaries.
3. Map out the inheritance chains and instance variable usage across classes.
4. Extract structural metrics like coupling and cohesion indices.

### Phase 2: Violation Detection
1. Scan for SOLID principle violations, prioritizing God Objects (SRP violation).
2. Check for hidden dependencies instantiated inside constructors (DIP violation).
3. Evaluate method overrides to ensure contract preservation (LSP violation).
4. Identify fat interfaces forcing redundant method implementations (ISP violation).

### Phase 3: Architectural Strategizing
1. Design isolated interfaces that accurately reflect cohesive domain behaviors.
2. Plan the extraction of behaviors into strategy classes to favor composition.
3. Formulate the dependency injection topology for the proposed refactor.
4. Prepare a transitional roadmap to avoid breaking dependent modules.

### Phase 4: Code Generation and Refactoring
1. Generate the foundational interfaces and abstract base classes.
2. Implement the concrete classes adhering to the newly defined interfaces.
3. Rewrite client code to instantiate objects via IoC containers or factories.
4. Strip out legacy tightly-coupled implementations.

### Phase 5: Verification and Testing
1. Generate unit tests validating the isolated behaviors of the new modules.
2. Ensure mocked dependencies are properly injected during test execution.
3. Verify that behavioral subtyping holds true under various test scenarios.
4. Validate complexity metrics have improved against the baseline.

### Phase 6: Handoff and Documentation
1. Compile the architectural changes into a final summary report artifact.
2. Update the README or inline comments reflecting the new design paradigms.
3. Ensure the newly decoupled modules have explicit architectural boundaries.
4. Prepare cross-references for related skills to continue pipeline operations.

## Extended Troubleshooting Guide

| Symptom | Primary Cause | Mitigation Action |
|---------|---------------|-------------------|
| "God Object" detected with 2000+ LOC | Violation of Single Responsibility Principle | Split class into multiple cohesive service objects; use facades if necessary. |
| Frequent `NotImplementedException` | Violation of Interface Segregation Principle | Break down the fat interface into smaller, client-specific interfaces. |
| Hard-to-mock classes in Unit Tests | Violation of Dependency Inversion Principle | Extract interfaces for dependencies and inject them via constructors. |
| Base class changes break derived classes | Fragile Base Class Problem (Inheritance misuse) | Refactor to use Composition over Inheritance; inject behaviors. |
| `instanceof` / `typeof` checks everywhere | Violation of Open/Closed Principle | Leverage polymorphism by introducing an abstract method or strategy interface. |
| Derived class throws unexpected errors | Violation of Liskov Substitution Principle | Realign the derived class to strictly honor the base class contract or rethink hierarchy. |

## Complete Execution Scenario

```text
User Request: "Refactor the monolithic OrderManager class"
  |
  v
[Phase 1: Contextual Discovery]
  |-- Parses OrderManager.java
  |-- Identifies 15 dependencies and 3000 LOC
  v
[Phase 2: Violation Detection]
  |-- Flags SRP, OCP, and DIP violations
  v
[Phase 3: Architectural Strategizing]
  |-- Proposes splitting into OrderValidator, OrderPersister, OrderNotifier
  v
[Phase 4: Code Generation and Refactoring]
  |-- Generates IOrderValidator, IOrderPersister, IOrderNotifier interfaces
  |-- Updates OrderManager to compose these interfaces via DI
  v
[Phase 5: Verification and Testing]
  |-- Generates unit tests with mocked interfaces
  v
[Phase 6: Handoff and Documentation]
  |-- Outputs artifact containing architectural changes
  |-- Handoff to deployment skill
```

## Rules and Guidelines
1. **Never use concrete classes as dependencies**: Always depend on abstractions (interfaces or abstract classes) to ensure maximum flexibility and testability.
2. **Restrict Inheritance Depth**: Do not exceed an inheritance depth of two levels. If deeper behavior sharing is required, utilize composition and strategy patterns.
3. **Enforce Constructor Injection**: Dependencies must be explicitly requested via constructors, never instantiated within the class itself using `new`.
4. **Maintain Pure Domain Models**: Keep external frameworks, UI concerns, and database annotations strictly out of the core domain entity classes.
5. **Optimize for Readability over Cleverness**: Adhere to KISS (Keep It Simple, Stupid) and YAGNI (You Aren't Gonna Need It) to avoid over-engineering solutions before business requirements dictate them.

## Reference Guides
- [Architecture Patterns Reference](references/architecture-patterns.md)
- [State Management Reference](references/state-management.md)
- [Performance Optimization Reference](references/performance-optimization.md)
- [Security Best Practices Reference](references/security-best-practices.md)
- [Testing Strategies Reference](references/testing-strategies.md)
- [Deployment Pipelines Reference](references/deployment-pipelines.md)
- [Error Handling Reference](references/error-handling.md)
- [Code Organization Reference](references/code-organization.md)

## Handoff
This skill works closely with the testing frameworks and architectural evaluation modules. Once the OOP principles are applied and the architecture is stabilized, hand off execution to:
- `backend/universal/testing-frameworks` for comprehensive unit and integration test generation.
- `backend/universal/code-quality` for automated linting and static analysis of the new structural boundaries.
- `devops/ci-cd` for incorporating the newly modularized components into the deployment pipeline.

<!-- Compression format: j4flmao/agent-skills/v2.0.0/compressed/base -->
