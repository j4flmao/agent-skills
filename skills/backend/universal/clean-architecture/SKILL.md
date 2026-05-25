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

## Layer Structure

### Domain Layer (Core)
The Domain layer is the innermost layer. It contains entities, value objects, domain events, domain services, and repository interfaces (ports). This layer has zero dependencies on anything external — no frameworks, no databases, no HTTP libraries, no ORM annotations. It uses only standard library types. Domain entities encapsulate business rules and invariants. Value objects are immutable and compared by value. Domain events represent something meaningful that happened in the domain. Repository interfaces define the contract for data access without specifying the implementation. Domain services orchestrate domain logic that doesn't naturally belong to a single entity.

### Application Layer (Use Cases)
The Application layer contains use case interactors, application services, command/query handlers, DTOs, and port interfaces. It depends only on the Domain layer. Use cases orchestrate the flow of data to and from the Domain layer. Each use case has a single responsibility: execute a specific business operation. Application services coordinate multiple use cases or handle cross-cutting concerns. DTOs (Data Transfer Objects) carry data between layers without exposing domain entities. Port interfaces are defined as abstract contracts in this layer and implemented in the Infrastructure layer.

### Interface Adapters Layer (Presentation)
The Interface Adapters layer contains controllers, routes, GraphQL resolvers, CLI commands, middleware, guards, and interceptors. It depends on Application DTOs only — never on Domain entities directly. Controllers receive external input (HTTP requests, CLI arguments, message events), convert them to Application DTOs, call the appropriate use case, and format the response. This layer handles serialization, deserialization, and input validation. It is a thin layer that contains no business logic.

### Frameworks and Drivers Layer (Infrastructure)
The Infrastructure layer contains database implementations (ORM models, repositories), HTTP clients, message queue producers/consumers, file system access, and external service integrations. It implements interfaces defined in the Domain and Application layers. The Infrastructure layer depends on Domain interfaces and Application interfaces — never the other way around. This is where all external frameworks and libraries live. The database ORM, HTTP client library, message queue SDK — all framework-specific code goes here.

### Layer Dependency Diagram
```
Presentation → Application → Domain ← Infrastructure
                 ↓               ↑
            Application ←── Infrastructure (implements interfaces)
```

The critical rule: Domain has NO outgoing dependencies. Infrastructure depends on Domain (through interfaces). Application depends on Domain. Presentation depends on Application DTOs. Infrastructure implements Domain and Application interfaces.

## Dependency Inversion

### The Dependency Inversion Principle
High-level modules (Domain, Application) should not depend on low-level modules (Infrastructure). Both should depend on abstractions (interfaces). Abstractions should not depend on details. Details should depend on abstractions.

In practice: the Domain layer defines a `UserRepository` interface. The Infrastructure layer implements `PostgresUserRepository` that fulfills the interface. The Application layer depends on the `UserRepository` interface. The concrete implementation is injected at runtime via the Dependency Injection container.

### Port and Adapter Pattern
```
Port: interface UserRepository { findById(id): User }
Adapter: class PostgresUserRepository implements UserRepository
```

Ports are interfaces defined in the Domain or Application layer. Adapters are concrete implementations in the Infrastructure layer. The pattern ensures that the core business logic (Domain + Application) never directly depends on infrastructure code.

### Composition Root
The Composition Root is the entry point of the application where all dependencies are wired together. It is located in the Infrastructure layer (or at the application's bootstrap point). The Composition Root creates concrete implementations and injects them into the Application layer. It configures the DI container, registers all services, and wires up middleware. The Composition Root should be as close to the entry point as possible (Program.cs, main.go, index.ts, Application.java).

## Use Case Isolation

### Single Responsibility per Use Case
Each use case handles exactly one business operation: `CreateOrder`, `ProcessPayment`, `UpdateUserProfile`. Use cases are not services with many methods — they are individual classes or functions. A use case receives typed input (a command or query DTO), executes the business logic using Domain entities and Application services, and returns typed output. Use cases are independently testable because all dependencies are injected.

### Command and Query Separation
Commands change state (mutations). Queries return data (no side effects). Use the CQRS pattern to separate command handlers from query handlers. Commands return result/error types. Queries return data transfer objects. This separation simplifies reasoning about each handler's responsibilities and makes it clear which operations have side effects.

### Use Case Transaction Boundaries
Transactions belong in Application layer use cases — not in controllers, not in repositories. Each use case is a transaction boundary: it either succeeds fully or fails fully. Use the Unit of Work pattern to coordinate multiple repository operations within a single transaction. The Application layer opens the transaction, executes domain logic, persists changes, and commits or rolls back.

## Boundary Interfaces

### Repository Interface Definition
```typescript
// Domain layer
interface UserRepository {
  findById(id: UserId): Promise<User | null>;
  findByEmail(email: Email): Promise<User | null>;
  save(user: User): Promise<void>;
  delete(id: UserId): Promise<void>;
}
```

### Application Port Definition
```typescript
// Application layer
interface EmailService {
  sendWelcomeEmail(user: User): Promise<void>;
}

interface PaymentGateway {
  charge(amount: Money, paymentMethod: PaymentMethod): Promise<PaymentResult>;
}
```

### Boundary Crossing Rules
- Domain to Application: Domain defines interfaces → Application uses them
- Application to Infrastructure: Application defines ports → Infrastructure implements them
- Presentation to Application: Presentation calls Application through DTOs
- Infrastructure to Domain: Infrastructure implements Domain interfaces
- Infrastructure to Application: Infrastructure implements Application ports

## DTO and Mapper Patterns

### DTO Design
DTOs are simple data containers with no behavior. They exist at the Presentation boundary. They are serialized to/from JSON, protobuf, or XML. DTOs should not reference Domain entities. Map between Domain entities and DTOs in the Presentation layer using dedicated mapper functions or classes.

### Mapping Strategy
```typescript
// Presentation layer mapper
function userToResponse(user: User): UserResponse {
  return {
    id: user.id.toString(),
    name: user.name.full,
    email: user.email.value,
    createdAt: user.createdAt.toISOString(),
  };
}
```

Mappers live in the same layer as the code they map to. Presentation mappers convert Domain → DTO. Application mappers convert Domain → Application models. Infrastructure mappers convert database models → Domain entities.

## Cross-Cutting Concerns

### Logging, Validation, and Caching
Logging: define an interface in Application (`interface Logger { info, error, warn }`) and implement in Infrastructure. Validation: input validation at the Presentation boundary using DTO decorators or schema validation. Business rule validation in the Domain or Application layer. Caching: define a cache interface in Application and implement in Redis, Memcached, or in-memory in Infrastructure. Authentication and authorization: middleware in Presentation, authorization checks in Application, policy definitions in Domain.

## Validation

### Validation Layer Assignment
| Validation Type | Layer | Why |
|---|---|---|
| Input format (email format, required fields) | Presentation | Framework-level input validation |
| Business rules (duplicate email, insufficient balance) | Domain | Core business logic |
| Authorization (user can edit this resource) | Application | Use case precondition |
| Data integrity (foreign key exists) | Infrastructure | Database-level constraint |

## Testing Strategy

### Per-Layer Testing
| Layer | Test Type | What to Test | Mock |
|---|---|---|---|
| Domain | Unit | Entities, value objects, domain services, invariants | Nothing — pure logic |
| Application | Integration | Use cases, command/query handlers, orchestrations | Repository interfaces, service ports |
| Infrastructure | Integration | Database queries, API client, message queues | Real DB (test container), mock server |
| Presentation | E2E | Controllers, GraphQL resolvers, middleware, request/response | Test server instance |

### Test Isolation
Domain tests require no setup — they test pure business logic. Application tests mock only the interfaces (ports), not concrete implementations. Infrastructure tests use real infrastructure via test containers (Docker for PostgreSQL, Redis). Presentation tests use a lightweight test server (supertest for Express, TestRequest for NestJS).

## Rules
- Domain has ZERO imports from infrastructure. This is non-negotiable. If you find an import from infrastructure in domain, it is a bug.
- All external dependencies enter through interfaces (ports) defined in Domain.
- DTOs exist at the Presentation boundary. Domain entities are never serialized directly.
- Repository interfaces (ports) live in Domain. Repository implementations live in Infrastructure.
- Application owns the business flow. Domain owns the business rules.
- Controllers never call repositories directly. They always go through Application use cases.
- If you cannot classify code into one of the four layers, the architecture is wrong.

## References
- `references/layer-structure.md` — detailed layer boundary rules with examples per stack
- `references/testing-strategy.md` — testing patterns per layer, test isolation, mock strategies
- `references/clean-arch-layers.md` — Clean architecture layer responsibilities and dependency rules
- `references/clean-arch-testing.md` — Testing pyramid by layer with test containers and fakes

## Handoff
No artifact produced.
Next skill: backend-api-design — after layers are defined, design API contracts that respect layer boundaries.
Carry forward: stack, layer decisions, interface definitions.
