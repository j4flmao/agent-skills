# Clean Architecture Fundamentals

## What is Clean Architecture?

Clean Architecture (also known as Hexagonal Architecture or Ports & Adapters) is a software design philosophy that organizes code into concentric layers with strict dependency rules. The core principle: **outer layers depend on inner layers, never the reverse**. The innermost layer (Domain) has zero knowledge of frameworks, databases, or external concerns.

## The Four Layers

### Domain Layer
- **Purpose**: Encapsulate enterprise-wide business rules
- **Contents**: Entities, Value Objects, Domain Events, Domain Services, Repository Interfaces
- **Dependencies**: None (stdlib only)
- **Test**: Pure unit tests, zero mocks
- **Key rule**: No framework annotations, no database imports, no HTTP references

### Application Layer  
- **Purpose**: Define application-specific business rules and orchestration
- **Contents**: Use Cases/Interactors, Command/Query Handlers, DTOs, Port Interfaces
- **Dependencies**: Domain layer only
- **Test**: Integration tests with mocked ports

### Infrastructure Layer
- **Purpose**: Implement interfaces that connect to external systems
- **Contents**: Database repositories, HTTP clients, message producers/consumers, file system, DI container
- **Dependencies**: Domain interfaces, Application interfaces
- **Test**: Integration tests with test containers

### Presentation Layer
- **Purpose**: Receive external input and format responses
- **Contents**: Controllers, Routes, GraphQL Resolvers, CLI Commands, Middleware
- **Dependencies**: Application DTOs only (never Domain entities)
- **Test**: E2E tests with mock use cases

## Core Principles

### Dependency Inversion Principle (DIP)
High-level modules should not depend on low-level modules. Both should depend on abstractions.

```
BAD:  UseCase --> ConcretePostgresRepository
GOOD: UseCase --> RepositoryInterface <-- PostgresRepository
```

The interface is defined in the Domain or Application layer. The implementation lives in Infrastructure.

### Ports and Adapters
```
Port (interface) = defined in inner layer
Adapter (implementation) = provided by outer layer
```

### Composition Root
The single location in the application where all dependencies are wired. Located in Infrastructure. Application code never calls the DI container directly.

## Decision Framework

### Does this code belong in Domain?
Ask: "Would this code change if we switched from Postgres to MongoDB?"  
- Yes → Infrastructure  
- No → "Would this code change if we added a REST API?"  
  - Yes → Presentation  
  - No → "Does it orchestrate business operations?"  
    - Yes → Application  
    - No → Domain

### Does this import violate the dependency rule?
Check: `import X from Y` where Y is a layer
- Domain importing anything outside Domain → VIOLATION
- Application importing Infrastructure → VIOLATION
- Presentation importing Domain → VIOLATION (use DTOs)
- Infrastructure importing Application → OK (implements ports)

## Stack-Specific Guidelines

### TypeScript/NestJS
- Valid Domain: `class Email { ... }` — pure TypeScript
- Invalid Domain: `@Entity() class User { ... }` — belongs in Infrastructure
- Application may use `@Injectable()` only (lightest NestJS coupling)
- Infrastructure uses all framework decorators freely

### Python
- Valid Domain: `@dataclass class Order { ... }` — pure Python
- Valid Domain: `class OrderRepository(ABC): @abstractmethod` — abstract interface
- Invalid Domain: `class Order(Base): ...` — SQLAlchemy model, move to Infrastructure
- Invalid Domain: `from pydantic import BaseModel` — Pydantic in Application, not Domain

### Go
- Valid Domain: `type UserRepository interface { ... }` — in domain package
- Infrastructure: `type PostgresUserRepository struct { ... }` — in infrastructure/postgres
- No imports from infrastructure packages in domain package

### Java/Spring
- Valid Domain: `public class Product { ... }` — POJO, no annotations
- Invalid Domain: `@Entity public class Product { ... }` — JPA annotation
- Invalid Domain: `@Component`, `@Service`, `@Repository` — Infrastructure annotations

## Common Violations and Fixes

| Violation | File | Fix |
|-----------|------|-----|
| `import { Entity } from 'typeorm'` in Domain entity | `domain/user.entity.ts` | Move ORM entity to infrastructure, keep pure class in domain |
| `@Controller` calling `this.userRepo.findById()` | `presentation/user.controller.ts` | Inject and call use case, not repo |
| `@Service` class with business logic in Infrastructure | `infrastructure/services/order.service.ts` | Move business logic to Domain, keep orchestration in Application |
| Domain entity with `@JsonProperty` or `@SerializedName` | `domain/order.ts` | Remove — serialization is Presentation concern |
| Use case throwing `HttpException` | `application/create-order.handler.ts` | Return Result type, let Presentation map to HTTP errors |
