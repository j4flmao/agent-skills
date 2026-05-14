# Layer Boundaries

## Domain Layer (Core)
- **Dependencies**: None (stdlib only)
- **Contains**: Entities, Value Objects, Domain Events, Domain Services, Repository Interfaces
- **NestJS**: No decorators. Pure TypeScript classes.
- **Go**: No imports from infrastructure. Interfaces define ports.
- **Rust**: Separate crate with zero external dependencies.
- **Python**: Dataclasses only. No ORM models, no framework imports.
- **Spring**: POJOs. No Spring annotations.

## Application Layer (Use Cases)
- **Dependencies**: Domain only
- **Contains**: Use Cases, Application Services, DTOs, Command/Query Handlers
- **Rules**: Orchestrates domain logic. Owns transactions. Maps domain errors.
- **NestJS**: @Injectable() only (lightest NestJS coupling). @Transactional() here, not in controllers.

## Infrastructure Layer (Adapters)
- **Dependencies**: Domain + Application interfaces
- **Contains**: DB implementations, HTTP clients, Message producers/consumers, File system
- **Rules**: Implements interfaces defined in upper layers. Never called directly by upper layers.
- **All stacks**: Full framework integration lives here.

## Presentation Layer (Interfaces)
- **Dependencies**: Application DTOs only
- **Contains**: Controllers, Routes, GraphQL resolvers, CLI, Middleware
- **Rules**: Converts external input to Application DTOs. Never references Domain entities.
- **All stacks**: Thin layer — no business logic.

## Dependency Injection Rules
- Domain defines interfaces → Infrastructure implements → Application depends on interfaces
- Composition Root wires everything at the entry point
- DI is Infrastructure concern — Application just receives dependencies
