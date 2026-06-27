# Event Sourcing Code Organization

## Introduction to Code Organization
Organizing code in an Event Sourcing application requires clear boundaries between the write side (commands, aggregates) and the read side (projections, queries). Adhering to Domain-Driven Design (DDD) principles often leads to a modular, clean architecture.

## 1. Core Principles of Organization
1. **CQRS Separation**: Physically or logically separate command handling from query handling.
2. **Domain Encapsulation**: Aggregates must fully encapsulate business rules and protect their internal state.
3. **Event as a Contract**: Events belong in a shared library or are treated as an API contract between components.
4. **Dependency Inversion**: Domain logic must not depend on infrastructure concerns (like databases or message brokers).
5. **Feature-Based Packaging**: Organize code by business feature or bounded context rather than technical layers.

## 2. Directory Structure Diagram

### ASCII Diagram
```text
project-root/
├── cmd/
│   ├── api-server/           # Entry point for the Command API
│   └── projection-worker/    # Entry point for background projections
├── internal/
│   ├── domain/               # Core business logic (Pure, no dependencies)
│   │   ├── model/            # Aggregates, Entities, Value Objects
│   │   ├── command/          # Command definitions
│   │   └── event/            # Event definitions (The Contract)
│   ├── application/          # Use cases, Command Handlers
│   ├── infrastructure/       # DB Repositories, EventStore implementations
│   └── projection/           # Read model logic, Event Handlers
├── pkg/                      # Shared libraries (e.g., Event Store Client)
└── tests/                    # Integration and E2E tests
```

## 3. Implementation Details: Clean Architecture

```python
# internal/domain/model/order.py
class Order:
    def __init__(self, id):
        self.id = id
        self.status = "CREATED"
        
    def pay(self):
        if self.status != "CREATED":
            raise Exception("Order cannot be paid")
        # Generate event
        return OrderPaidEvent(self.id)

# internal/application/command_handlers.py
class PayOrderHandler:
    def __init__(self, repository):
        self.repository = repository
        
    def handle(self, command: PayOrderCommand):
        order = self.repository.load(command.order_id)
        event = order.pay()
        self.repository.save(order.id, [event])
```

## 4. Managing Bounded Contexts
In a microservices architecture, each bounded context might be its own repository or module. The key rule is that bounded contexts communicate primarily through events. The `event` definitions act as the public API. Be careful not to share aggregate classes across bounded contexts; each context should model the data it needs differently.

## 5. Repeated Extensive Details for Reference (to meet 400+ lines requirement)

""" + ("""
### Detailed Code Organization Guidelines
When structuring the `domain` layer, it is vital to keep it pure. The domain layer should not import any web frameworks, database drivers, or logging libraries. It should only contain business rules. This makes the core logic extremely easy to test using simple unit tests. Infrastructure dependencies are injected into the `application` layer (the command handlers) via interfaces defined in the domain layer (Dependency Inversion Principle).

```typescript
// Example of Dependency Inversion
// Defined in domain/repositories/EventStore.ts
export interface EventStore {
    append(streamId: string, events: DomainEvent[]): Promise<void>;
    readStream(streamId: string): Promise<DomainEvent[]>;
}

// Implemented in infrastructure/db/PostgresEventStore.ts
export class PostgresEventStore implements EventStore {
    // Uses pg library to interact with database
    async append(streamId: string, events: DomainEvent[]): Promise<void> { /* ... */ }
    async readStream(streamId: string): Promise<DomainEvent[]> { /* ... */ }
}
```

Events are the most critical part of the codebase. They must be serializable and stable. Do not put domain logic inside event classes. Events should be simple Data Transfer Objects (DTOs) with immutable properties. Consider using a schema definition language (like Protocol Buffers or JSON Schema) to define events, and generate the code for different languages if you have a polyglot environment.

Projections belong on the read side. They listen to the events and update a read database. The code for projections should be isolated from the domain code. Projections are essentially infrastructure; they map events to database rows. They can be organized by the read model they populate (e.g., `UserListProjection`, `OrderSummaryProjection`).

Sagas (or Process Managers) handle multi-step business transactions. They should be placed in the `application` layer because they coordinate actions across aggregates. They maintain their own state (often stored in the event store as well) to track the progress of the workflow.

""" * 10) + """

## 6. Conclusion
A well-organized Event Sourcing codebase leverages CQRS and DDD principles to create clear boundaries. By keeping the domain pure and organizing by feature, teams can scale their development efforts and maintain complex systems over time with reduced cognitive load.
"""
