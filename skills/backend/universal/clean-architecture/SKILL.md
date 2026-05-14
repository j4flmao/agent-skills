---
name: backend-clean-architecture
description: >
  Use this skill when the user asks 'where does this code go', 'what layer', 'clean architecture', 'hexagonal', 'ports and adapters', 'domain layer', 'application layer', 'infrastructure layer', 'should this be in service or repository', or when designing or reviewing backend code organization. This skill enforces strict Clean/Hexagonal Architecture layer rules — Domain has ZERO dependencies on infrastructure. Applies to NestJS, Go, Rust, Python, Spring Boot. Do NOT use for: database optimization, API endpoint design, or frontend code organization.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, architecture, phase-2, universal]
---

# Backend Clean Architecture

## Purpose
Enforce strict layer separation in backend code. Domain layer has zero dependencies on frameworks, databases, or external libraries. Every piece of code must belong to exactly one layer.

## Agent Protocol

### Trigger
Exact user phrases: "where does this code go", "what layer", "clean architecture", "hexagonal", "ports and adapters", "domain layer", "application layer", "infrastructure layer", "should this be in service or repository", "layer violation", "architecture rule".

### Input Context
Before activating, verify:
- The stack is known (NestJS, Go, Rust, Python, Spring Boot).
- The user has described a specific piece of code or asked about a specific location.
- The project's folder structure is visible or has been described.

### Output Artifact
No file output. This skill produces text guidance.

### Response Format
Answer exactly:
```
{code piece} -> {Layer}: {one-sentence justification}
File: {suggested file path}
```

If there is a violation:
```
VIOLATION: {file}:{line}
Layer {X} imports Layer {Y} which is NOT allowed.
Fix: {specific refactor instruction}
Direction: {layer name} -> {layer name} is the correct direction.
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick. No explanations of what Clean Architecture is.

### Completion Criteria
This skill is complete when:
- [ ] The layer for the code has been identified.
- [ ] If a violation exists, it has been identified with specific file/line.
- [ ] The fix direction has been specified.
- [ ] No layer rules have been explained — only applied.

### Max Response Length
Layer assignment: 3 lines. Violation: 5 lines.

## Workflow

### Step 1: Classify the Code
Use the layer table to classify:

| Layer | Also Called | Contains | Allowed Dependencies |
|-------|-------------|----------|---------------------|
| Domain | Core | Entities, Value Objects, Domain Events, Repository Interfaces (ports), Domain Services | Nothing external. Standard library only. |
| Application | Use Cases | Use Case Interactors, Application Services, Command/Query Handlers, DTOs, Port interfaces | Domain only |
| Infrastructure | Adapters | DB implementations (ORM models, repositories), HTTP clients, Message queue producers/consumers, File system | Domain + Application interfaces |
| Presentation | Interface | Controllers, Routes, GraphQL resolvers, CLI commands, Middleware, Guards/Interceptors | Application DTOs only |

### Step 2: Validate Dependencies
Check each import/require/use statement.

Rule 1: Domain must import NOTHING from outside Domain. No framework decorators. No ORM annotations. No HTTP libraries.

Rule 2: Application imports Domain only. Never infrastructure, never presentation.

Rule 3: Infrastructure imports Domain interfaces and Application interfaces. Infrastructure implements interfaces defined in upper layers.

Rule 4: Presentation imports Application DTOs only. Never Domain entities directly.

### Step 3: Apply Interface (Port) Adapter Pattern
```
Domain defines:    interface UserRepository { findById(id): User }
Infrastructure:    class PostgresUserRepository implements UserRepository
Application uses:  constructor(userRepo: UserRepository)  // depends on abstraction
DI Container:      Provides PostgresUserRepository where UserRepository is needed
```

### Step 4: Check Transaction Boundaries
- Transactions belong in Application layer use cases — not in controllers, not in repositories.
- A use case either succeeds fully or fails fully.
- Repository implementations handle the actual transaction mechanism.

## Rules
- Domain has ZERO imports from infrastructure. This is non-negotiable. If you find an import from infrastructure in domain, it is a bug.
- All external dependencies enter through interfaces (ports) defined in Domain.
- DTOs exist at the Presentation boundary. Domain entities are never serialized directly.
- Repository interfaces (ports) live in Domain. Repository implementations live in Infrastructure.
- Application owns the business flow. Domain owns the business rules.
- Controllers never call repositories directly. They always go through Application use cases.
- If you cannot classify code into one of the four layers, the architecture is wrong.

## References
- `references/layer-rules.md` — detailed layer boundary rules with examples
- `references/naming-conventions.md` — naming rules per language

## Handoff
No artifact produced.
Next skill: backend-api-design — after layers are defined, design API contracts that respect layer boundaries.
Carry forward: stack, layer decisions, interface definitions.
