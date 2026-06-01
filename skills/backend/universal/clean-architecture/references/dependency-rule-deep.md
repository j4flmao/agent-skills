# Dependency Rule Deep Dive

## The Core Rule

Source code dependencies must point **inward**, toward the Domain layer. Nothing in an inner layer can know anything about an outer layer.

```
Outer (Infrastructure) → knows about → Inner (Domain, Application)
Inner (Domain)        → knows nothing about → Outer (Infrastructure, Presentation)
```

## Visual Dependency Flow

```
┌─────────────────────────────────────────────────────────────┐
│  PRESENTATION (Controllers, Resolvers)                      │
│  Depends on: Application (DTOs only)                        │
│  Does NOT know: Domain entities, Infrastructure             │
├─────────────────────────────────────────────────────────────┤
│  APPLICATION (Use Cases, Ports)                             │
│  Depends on: Domain (entities, interfaces)                  │
│  Does NOT know: Infrastructure, Presentation                │
├─────────────────────────────────────────────────────────────┤
│  DOMAIN (Entities, Value Objects, Interfaces)               │
│  Depends on: Nothing (stdlib only)                          │
│  Does NOT know: Application, Infrastructure, Presentation   │
├─────────────────────────────────────────────────────────────┤
│  INFRASTRUCTURE (DB, HTTP, Queue, DI)                       │
│  Depends on: Domain, Application (interfaces)               │
│  Does NOT know: Presentation (unless wiring DI)             │
└─────────────────────────────────────────────────────────────┘
```

## Strict Layer Enforcement

### What Each Layer Can Import

| Layer | Can Import From | Cannot Import From |
|-------|-----------------|-------------------|
| Domain | Domain, stdlib | Application, Infrastructure, Presentation |
| Application | Domain, Application | Infrastructure, Presentation |
| Infrastructure | Domain, Application, Infrastructure | Presentation |
| Presentation | Application (DTOs), stdlib | Domain (entities), Infrastructure |

### TypeScript Example: Correct vs Incorrect

```typescript
// ✅ CORRECT — Repository interface in Domain
// src/domain/repositories/user-repository.ts
export interface UserRepository {
  findById(id: UserId): Promise<User | null>;
}

// ✅ CORRECT — Infrastructure implements Domain interface
// src/infrastructure/repositories/postgres-user-repository.ts
import { UserRepository } from '../../domain/repositories/user-repository'; // OK: inward
import { User } from '../../domain/entities/user';                        // OK: inward
import { Pool } from 'pg';                                                // OK: infrastructure concerns

export class PostgresUserRepository implements UserRepository { ... }

// ❌ VIOLATION — Domain imports Infrastructure
// src/domain/entities/user.ts
import { Pool } from 'pg';                              // WRONG: Domain importing infra
import { IsEmail } from 'class-validator';               // WRONG: framework in domain

// ❌ VIOLATION — Application imports Infrastructure
// src/application/use-cases/create-user.ts
import { PostgresUserRepository } from '../../infrastructure/...'; // WRONG
```

## Transitive Dependencies

A subtle violation: Layer A depends on Layer B, Layer B depends on Layer C. Layer A should NOT transitively depend on Layer C.

```typescript
// ❌ TRANSITIVE VIOLATION
// Application calls Repository.findById() which returns an ORM entity
// The ORM type leaks through the interface
interface UserRepository {
  findById(id: string): OrmUserEntity;  // WRONG: OrmEntity is Infrastructure concern
}

// ✅ CORRECT
interface UserRepository {
  findById(id: UserId): Promise<User | null>;  // Domain type, no leak
}
```

## Practical Enforcement

### Automated Checks (Tooling)

#### TypeScript: ESLint with import guards
```json
{
  "rules": {
    "import/no-restricted-paths": [{
      "zones": [
        { "target": "./src/domain", "from": "./src/infrastructure", "message": "Domain must not import Infrastructure" },
        { "target": "./src/domain", "from": "./src/application", "message": "Domain must not import Application" },
        { "target": "./src/domain", "from": "./src/presentation", "message": "Domain must not import Presentation" },
        { "target": "./src/application", "from": "./src/infrastructure", "message": "Application must not import Infrastructure" }
      ]
    }]
  }
}
```

#### Python: Import-linter
```ini
[import_linter]
root_package = myapp

[import_linter:contracts]
contract_name = layer_rules

[import_linter:type:layer]
containers =
    domain
    application
    infrastructure
    presentation
layers =
    domain
    application
    infrastructure
    presentation
dependencies =
    application -> domain
    infrastructure -> domain
    infrastructure -> application
    presentation -> application
```

## Exceptions to the Rule

### Cross-Cutting Concerns
Logging, metrics, and tracing are cross-cutting. They are defined as interfaces in the Application layer and implemented in Infrastructure.

```typescript
// Application — defines port
interface ILogger {
  info(msg: string, ctx?: object): void;
}

// Infrastructure — implements
class PinoLogger implements ILogger { ... }
```

### Configuration
Configuration is loaded in Infrastructure and passed through to Application as typed objects. Application never reads config files directly.

```typescript
// Application — typed config interface
interface EmailConfig {
  fromAddress: string;
  smtpHost: string;
  smtpPort: number;
}

// Infrastructure — loads from env/file, passes to Application
class SmtpEmailService implements IEmailService {
  constructor(config: EmailConfig) { ... }
}
```

## Common Layer Boundary Violations

### 1. ORM Annotations in Domain Entities
```typescript
// ❌ VIOLATION
@Entity()
class User {
  @PrimaryGeneratedColumn()
  id: number;
}
// Fix: Move ORM entity to Infrastructure, keep pure domain entity
```

### 2. Use Case Throwing HTTP Exceptions
```typescript
// ❌ VIOLATION
async execute(command: CreateOrder): Promise<void> {
  throw new NotFoundException('Order not found');  // NestJS HTTP exception
}
// Fix: Return Result type, let Presentation map to HTTP
```

### 3. Controller Calling Repository Directly
```typescript
// ❌ VIOLATION
@Get('/orders/:id')
async getOrder(@Param('id') id: string) {
  return this.orderRepo.findById(id);  // bypasses Application
}
// Fix: Inject use case and delegate
```

### 4. Domain Entity with Serialization Logic
```typescript
// ❌ VIOLATION
class Order {
  toJSON(): object { ... }  // Serialization is Presentation concern
}
// Fix: Mapper in Presentation layer
```

### 5. Infrastructure Importing from Presentation
```typescript
// ❌ VIOLATION
// infrastructure/persistence/order-repository.ts
import { OrderDTO } from '../../presentation/dto/order.dto';
// Fix: Infrastructure should not know about Presentation
```

## Package Structure by Layer

### NestJS Example
```
src/
├── domain/
│   ├── order/
│   │   ├── order.entity.ts
│   │   ├── order-item.value-object.ts
│   │   ├── order.repository.interface.ts
│   │   └── order.service.ts
│   └── shared/
│       ├── money.value-object.ts
│       └── order-id.value-object.ts
├── application/
│   ├── use-cases/
│   │   ├── create-order.handler.ts
│   │   └── cancel-order.handler.ts
│   └── ports/
│       ├── email-service.port.ts
│       └── payment-gateway.port.ts
├── infrastructure/
│   ├── persistence/
│   │   ├── postgres-order.repository.ts
│   │   └── orm-order.entity.ts
│   └── di/
│       └── container.ts
└── presentation/
    ├── controllers/
    │   └── order.controller.ts
    ├── dto/
    │   ├── create-order.request.ts
    │   └── order.response.ts
    └── middleware/
        └── auth.middleware.ts
```

### Python Example
```
src/
├── domain/
│   ├── __init__.py
│   ├── models/
│   │   ├── order.py          # @dataclass Order
│   │   └── order_item.py     # @dataclass OrderItem
│   └── interfaces/
│       └── order_repository.py   # ABC
├── application/
│   ├── __init__.py
│   ├── use_cases/
│   │   ├── create_order.py
│   │   └── cancel_order.py
│   └── ports/
│       ├── email_service.py
│       └── payment_gateway.py
├── infrastructure/
│   ├── __init__.py
│   ├── persistence/
│   │   ├── postgres_order_repository.py
│   │   └── sqlalchemy_models.py
│   └── di/
│       └── container.py
└── presentation/
    ├── __init__.py
    ├── api/
    │   ├── routes.py
    │   └── schemas.py        # Pydantic models
    └── middleware.py
```

## Rule Summary
- Domain has zero imports from Infrastructure, Application, or Presentation
- Application may only import Domain and Application modules
- Infrastructure may import Domain and Application (to implement interfaces)
- Presentation may only import Application DTOs
- Cross-cutting concerns (logging, metrics, tracing) are defined as ports in Application, implemented in Infrastructure
- Configuration is loaded in Infrastructure, passed as typed objects to Application
- No transitive dependency leaks — Interfaces must return Domain types, not Infrastructure types
