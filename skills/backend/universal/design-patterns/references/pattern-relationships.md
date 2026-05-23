# Pattern Relationships & Selection Reference

## Table of Contents

1. [Pattern Composition — Common Combinations](#section-1-pattern-composition--common-combinations)
2. [Pattern Comparison — Similar Patterns](#section-2-pattern-comparison--similar-patterns)
3. [SOLID Principles → Pattern Mapping](#section-3-solid-principles--pattern-mapping)
4. [Quick Selection Guide](#section-4-quick-selection-guide)
5. [Decision Flowchart](#section-5-decision-flowchart)
6. [Anti-Pattern Awareness](#section-6-anti-pattern-awareness)
7. [Pattern Interoperability Matrix](#section-7-pattern-interoperability-matrix)
8. [Layered Architecture Pattern Mapping](#section-8-layered-architecture-pattern-mapping)

---

## Section 1: Pattern Composition — Common Combinations

### 1. Strategy + Factory Method

**Purpose:** Select an algorithm at runtime and create the appropriate strategy object.

Use a Factory Method (or simple factory) inside a context class to instantiate the correct `Strategy` based on input parameters or configuration. The Context delegates to the strategy, and the factory encapsulates the creation logic so callers don't depend on concrete strategy classes.

```text
Context
  └─ factoryMethod(config) : IStrategy
       ├─ ConcreteStrategyA
       ├─ ConcreteStrategyB
       └─ ConcreteStrategyC
  └─ execute() → strategy.algorithm()
```

**Real-world:** Payment processing — a `PaymentContext` uses a factory to produce a `CreditCardStrategy`, `PayPalStrategy`, or `CryptoStrategy` based on the user's selected payment method.

### 2. Composite + Visitor

**Purpose:** Build a tree of objects and perform operations on them without cluttering their classes.

The `Composite` pattern gives you the tree structure (leaf + composite nodes sharing a common interface). The `Visitor` pattern lets you define new operations over that tree without modifying element classes. The visitor walks the tree, calling `accept(visitor)` on each node.

```text
Component
  ├─ Leaf : accept(visitor) → visitor.visitLeaf(this)
  └─ Composite : accept(visitor) → children.forEach(c → c.accept(visitor)); visitor.visitComposite(this)
```

**Real-world:** File system — directories contain files and subdirectories. A `SizeCalculatorVisitor` traverses the tree to compute total size, while an `ArchiveVisitor` creates a zip archive without adding archiving logic to every node.

### 3. Decorator + Proxy

**Purpose:** Wrap an object with behavior layers while also controlling access.

The `Decorator` adds cross-cutting behavior (logging, caching, metrics) through a chain of wrappers. The `Proxy` controls access to the real subject (lazy loading, access checks, remote communication). They share the same interface as the subject, so they can be composed.

```text
Client → Proxy(AccessCheck) → Decorator(Logging) → Decorator(Caching) → RealSubject
```

**Real-world:** API service client — a `Proxy` validates authentication tokens before requests reach the service, while `Decorator`s add request/response logging, response caching, and retry-on-failure behavior.

### 4. Command + Memento

**Purpose:** Execute operations and support undo/redo by capturing state snapshots.

The `Command` pattern encapsulates an operation as an object with `execute()` and `undo()` methods. The `Memento` pattern captures the internal state of a receiver without violating encapsulation. The command stores a memento before execution and restores it on undo.

```text
Invoker (history stack)
  ├─ execute(cmd) → cmd.saveMemento(); cmd.execute()
  └─ undo() → cmd.restoreMemento(); cmd.undo()
```

**Real-world:** Text editor — every "insert character" or "delete range" command stores a `TextMemento` (full document snapshot or delta) before mutating state. Undo pops the memento and restores it.

### 5. Observer + Mediator

**Purpose:** Combine event-driven notifications with centralized routing to avoid chaotic many-to-many wiring.

The `Observer` pattern lets subjects broadcast events to multiple subscribers. The `Mediator` encapsulates how objects interact. Together, the mediator sits between publishers and subscribers, routing events, applying filters, and managing lifecycle.

```text
Publisher → Mediator → SubscriberA
                   → SubscriberB
                   → SubscriberC
```

**Real-world:** Chat room — users (observers) send messages through a `ChatMediator` that routes messages, enforces profanity filters, and logs history, instead of users directly messaging each other.

### 6. Repository + Unit of Work

**Purpose:** Abstract data access and track changes for transactional commit.

The `Repository` provides a collection-like interface for querying and persisting domain objects. The `Unit of Work` tracks changes (new, dirty, removed) across multiple repositories and flushes them in a single transaction.

```text
Service Layer
  ├─ RepositoryA : findBy(), save()
  ├─ RepositoryB : findBy(), save()
  └─ UnitOfWork
       ├─ registerNew()
       ├─ registerDirty()
       ├─ registerRemoved()
       └─ commit() → transaction.begin(); repos.flush(); transaction.commit()
```

**Real-world:** E-commerce checkout — `OrderRepository` and `InventoryRepository` share a `UnitOfWork`. When checkout completes, the unit of work commits the new order and inventory deduction in a single database transaction.

### 7. CQRS + Event Sourcing

**Purpose:** Separate read and write models while maintaining a complete event log for auditing and replay.

CQRS splits commands (writes) and queries (reads) into separate models with possibly different storage. Event Sourcing stores state as a sequence of events rather than the current snapshot. Combining them means command-side appends events, and query-side projects from those events.

```text
Command Side                          Query Side
  ├─ Command → Aggregate → Event Store → Projection → Read Model
  └─ Event Bus delivers events ───────────────┘
```

**Real-world:** Order management — every order action (placed, shipped, cancelled) is stored as an event. A `OrderSummaryProjection` consumes events to build a denormalized read model for dashboards. Writes go through command handlers that validate and append.

### 8. Saga + Outbox

**Purpose:** Coordinate distributed transactions reliably across microservices.

The `Saga` pattern (choreography or orchestration) manages a sequence of local transactions across services, with compensating actions for rollback. The `Outbox` pattern ensures reliable message delivery by writing events to a database table as part of the local transaction, then a separate process publishes them.

```text
Service A                          Service B
  ├─ Saga Step 1                     ├─ Saga Step 2
  ├─ Write Event to Outbox           ├─ Write Event to Outbox
  └─ Outbox Publisher → Message Bus  └─ Outbox Publisher → Message Bus
```

**Real-world:** Order-to-shipping pipeline — `OrderService` executes the "Create Order" saga step, writes `OrderCreated` to the outbox table (same DB transaction). `OutboxPublisher` sends it to the message broker. `ShippingService` picks it up, creates a shipment, and if it fails, the saga triggers a compensating cancel-order event.

### 9. Specification + Repository

**Purpose:** Express business rules as composable objects and use them to query data.

The `Specification` pattern encapsulates a business rule in a class with an `isSatisfiedBy()` method and composable operators (`and`, `or`, `not`). The `Repository` accepts specifications to build queries, keeping domain logic out of query code.

```text
repo.find(spec.and(spec1).or(spec2))

repo.find(new AndSpec(
  new PremiumCustomerSpec(),
  new ActiveLastMonthSpec()
))
```

**Real-world:** Flight booking — `FlightRepository.find(new AndSpec(new AvailableSeatsSpec(2), new PriceUnderSpec(500), new NonStopSpec()))` queries the database using the specifications translated to WHERE clauses.

### 10. Hexagonal + DTO

**Purpose:** Isolate core logic from infrastructure and carry data across boundaries.

The `Hexagonal Architecture` (Ports & Adapters) defines inbound and outbound ports with adapters for different technologies. `DTO`s (Data Transfer Objects) are simple objects that carry data between layers without leaking domain internals.

```text
Inbound Adapter (Web) → Port → Application Core → Port → Outbound Adapter (DB)
         │                           │                         │
       DTO                         Domain                    DTO
```

**Real-world:** REST API — controller (inbound adapter) maps HTTP requests to DTOs, passes them through an input port to the application service, which uses domain objects internally and returns response DTOs through an output port implemented by a repository (outbound adapter).

### 11. Circuit Breaker + Retry + Timeout

**Purpose:** Build resilient external service calls with layered failure handling.

The `Timeout` pattern sets a maximum wait time. The `Retry` pattern automatically retries on transient failures. The `Circuit Breaker` pattern stops calls when the downstream service is likely down, preventing wasted retries.

```text
Client → TimeoutInterceptor → RetryHandler → CircuitBreaker → External Service
                                ↑                    │
                                └── max 3 attempts    │ (open → fail fast)
```

**Real-world:** Payment gateway integration — HTTP calls have a 5-second timeout. Transient network errors trigger up to 3 retries with exponential backoff. If 5 consecutive calls fail, the circuit breaker opens and subsequent calls fail immediately without hitting the gateway. After 30 seconds, a probe request tests if the service recovered.

### 12. Aggregate + Domain Event

**Purpose:** Maintain consistency boundaries in DDD and publish events when state changes.

The `Aggregate` is a cluster of domain objects treated as a single unit, with an invariant-enforcing root. Domain Events capture something meaningful that happened in the domain. The aggregate publishes events after command execution, which are then dispatched to handlers.

```text
Aggregate Root
  ├─ command(command)
  │    ├─ validate invariants
  │    ├─ mutate state
  │    └─ raiseEvents(new DomainEvent(...))
  │
  └─ pullDomainEvents() → [Event1, Event2, ...]
       │
       └─ Event Bus → Handler1, Handler2
```

**Real-world:** Order aggregate — `Order.cancel(cancelReason)` validates that the order is not already shipped, sets status to `Cancelled`, records the reason, and raises an `OrderCancelled` event. A handler sends a cancellation email, another handler restores inventory.

---

## Section 2: Pattern Comparison — Similar Patterns

| # | Patterns | Core Intent | Key Difference |
|---|----------|-------------|----------------|
| 1 | **Strategy** vs **State** | Strategy: interchangeable algorithms. State: behavior changes with internal state. | Strategy: the caller or context selects and swaps the algorithm. State: the object transitions between states automatically based on events. |
| 2 | **Decorator** vs **Proxy** | Decorator: dynamically adds responsibilities. Proxy: controls access or defers creation. | Decorator: composes behavior recursively through wrapping, transparent to the client. Proxy: creates a surrogate that controls access, often with different lifecycle semantics (lazy init, access check). |
| 3 | **Adapter** vs **Facade** | Adapter: makes one interface work as another. Facade: provides a simplified interface to a subsystem. | Adapter: converts an existing interface to the one the client expects (interface translation). Facade: reduces complexity by hiding multiple classes behind a single simplified API. |
| 4 | **Factory Method** vs **Abstract Factory** | FM: creates a single product. AF: creates families of related products. | FM: a method on a class that subclasses override to specify the product. AF: an interface with multiple factory methods, each producing a different product type; the family is guaranteed to be consistent. |
| 5 | **Mediator** vs **Observer** | Mediator: centralizes communication. Observer: distributes communication. | Mediator: a central object encapsulates how a set of objects interact; colleagues only know the mediator. Observer: one-to-many dependency where subjects broadcast directly to observers; no central router. |
| 6 | **Template Method** vs **Strategy** | TM: defines algorithm skeleton with overridable steps. Strategy: entire algorithm is pluggable. | TM: uses inheritance — subclasses override specific steps in the skeleton. Strategy: uses composition — the entire algorithm is passed in as an object. TM: "Hollywood principle" (don't call us, we'll call you). |
| 7 | **Composite** vs **Decorator** | Composite: represents part-whole hierarchies. Decorator: adds responsibilities to individual objects. | Composite: tree of objects sharing a common interface, clients treat leaves and composites uniformly. Decorator: typically a single chain of wrappers around one component. |
| 8 | **Command** vs **Strategy** | Command: encapsulates a request as an object. Strategy: encapsulates an algorithm. | Command: focused on action execution, supports queuing, logging, undo. Strategy: focused on algorithm selection, interchangeable at runtime. A command often uses a strategy internally. |
| 9 | **Bridge** vs **Adapter** | Bridge: decouples abstraction from implementation. Adapter: makes unrelated classes work together. | Bridge: designed upfront to allow abstraction and implementation to vary independently. Adapter: retrofitted to make existing incompatible interfaces work together. |
| 10 | **Repository** vs **DAO** | Repository: domain-focused collection abstraction. DAO: data-focused CRUD abstraction. | Repository: belongs to the domain layer, returns domain objects, uses specification objects for queries. DAO: belongs to the data layer, works closer to tables/entities, often exposed directly. Repository wraps DAO in many implementations. |
| 11 | **Observer** vs **Event Bus** | Observer: in-process, direct subscription. Event Bus: decoupled, often cross-process. | Observer: simple one-to-many notification within a process, tight coupling between subject and observer interface. Event Bus: more decoupled with message routing, often supports async delivery and serialization across process boundaries. |
| 12 | **Singleton** vs **Service Locator** | Singleton: single instance guarantee. Service Locator: provides service lookup. | Singleton: controls its own creation and lifecycle, globally accessible. Service Locator: a registry that can return different implementations, but creates hidden dependencies (anti-pattern in modern DI). |
| 13 | **Prototype** vs **Builder** | Prototype: clone existing objects. Builder: construct step by step. | Prototype: creates objects by copying a prototypical instance, useful when construction is expensive. Builder: separates construction from representation, useful when the same process can create different representations. |
| 14 | **Flyweight** vs **Singleton** | Flyweight: shares fine-grained objects. Singleton: ensures single instance. | Flyweight: multiple objects share intrinsic state, many instances exist but share data. Singleton: only one instance exists globally. Flyweight is about memory efficiency; Singleton is about controlled access. |
| 15 | **Chain of Responsibility** vs **Decorator** | CoR: passes request along a chain. Decorator: wraps with additional behavior. | CoR: each handler decides to process or pass to the next; request flows until handled. Decorator: all wrappers execute in sequence, each adding behavior around the core. CoR is conditional; Decorator is deterministic. |

---

## Section 3: SOLID Principles → Pattern Mapping

### S — Single Responsibility Principle
*A class should have one, and only one, reason to change.*

| Pattern | How It Supports SRP |
|---------|---------------------|
| **Command** | Separates each operation into its own class. Instead of a monolithic handler with switch/case, each command is a distinct object with a single responsibility: execute one operation. |
| **Visitor** | Keeps operations separate from the object structure. Adding a new operation means adding a new visitor class, not modifying every element class. |
| **Strategy** | Isolates each algorithm into its own class. The context class doesn't need to know about all algorithms — it delegates. |
| **Repository** | Isolates data access logic. Domain objects focus on business rules; repositories handle persistence. |
| **Service Layer** | Defines a clear boundary for application logic, keeping domain objects free of orchestration concerns. |
| **Observer** | Decouples notification logic. Subjects don't need to know how observers react — each observer handles its own concern. |
| **Decorator** | Each decorator adds exactly one responsibility (logging, caching, validation) without forcing the core class to own it. |

### O — Open/Closed Principle
*Classes should be open for extension but closed for modification.*

| Pattern | How It Supports OCP |
|---------|---------------------|
| **Decorator** | Add new behavior by writing a new decorator class, not by modifying the original component. Unbounded extensibility. |
| **Strategy** | Introduce new algorithms without touching existing strategies or the context — just implement the strategy interface. |
| **Template Method** | Define the invariant skeleton in the base class; subclasses extend specific steps without altering the overall algorithm. |
| **Specification** | Add new business rules by creating new specification classes that implement the specification interface — no existing code changes. |
| **Abstract Factory** | Add new product families by implementing the abstract factory interface — existing factories remain unchanged. |
| **Visitor** | Add new operations by defining a new visitor — existing element classes don't need modification. |
| **Chain of Responsibility** | Add new handlers without modifying existing handlers or the client — just add a handler to the chain. |
| **Bridge** | Add new abstractions or implementations independently — each hierarchy is closed to changes in the other. |
| **Command** | Add new commands by implementing the command interface — no changes to the invoker or existing commands. |

### L — Liskov Substitution Principle
*Subtypes must be substitutable for their base types.*

| Pattern | How It Supports LSP |
|---------|---------------------|
| **Factory Method** | Returns objects conforming to a common interface. Clients use the interface without knowing the concrete type — LSP is enforced contractually. |
| **Template Method** | Works correctly when subclasses follow the contract: preconditions are not strengthened, postconditions not weakened. (Can also violate LSP if subclasses break base class invariants.) |
| **Strategy** | Strategies are interchangeable, but they must properly implement the strategy contract — input/output constraints must be consistent. |
| **Command** | Every command implements `execute()` (and optionally `undo()`). The invoker treats all commands uniformly — LSP is naturally enforced. |
| **Composite** | Leaves and composites share the same interface. Clients work with any component polymorphically. True LSP requires both types to behave consistently (e.g., calling `add()` on a leaf is typically a runtime error, which is an LSP tension). |
| **Proxy** | Proxy impersonates the real subject — clients must not be able to tell the difference. This is a direct application of LSP. |
| **Decorator** | Decorators conform to the component interface and transparently wrap the subject — strict LSP compliance is expected. |

### I — Interface Segregation Principle
*Clients should not be forced to depend on interfaces they do not use.*

| Pattern | How It Supports ISP |
|---------|---------------------|
| **Adapter** | Adapts a coarse/different interface into one the client expects — effectively segregating the interface the client sees from the full API. |
| **Facade** | Provides a focused, simplified interface that only exposes what clients need, hiding the full subsystem complexity. |
| **Proxy** | Can implement a fine-grained proxy that only exposes specific operations, protecting clients from unnecessary interface surface. |
| **Command** | The command interface is minimal (`execute()`, optionally `undo()`). Clients only depend on what they need. |
| **Observer** | The subscriber interface is small — observers only need `update()` / `handle()`. Subjects and observers depend on minimal interfaces. |
| **Strategy** | The strategy interface exposes exactly the method(s) needed for the algorithm. No fat interfaces. |
| **Visitor** | The visitor interface can be designed per-visitor type, avoiding one giant interface with visit methods for every element type. |

### D — Dependency Inversion Principle
*Depend on abstractions, not concretions. High-level modules should not depend on low-level modules.*

| Pattern | How It Supports DIP |
|---------|---------------------|
| **Abstract Factory** | High-level code depends on the abstract factory interface, not concrete product classes. Concrete factories are injected or configured. |
| **Factory Method** | High-level code calls a factory method rather than directly instantiating concrete types — the decision of which concrete class is deferred to subclasses. |
| **Hexagonal Architecture** | Domain core defines ports (interfaces). Adapters implement those ports. Core never depends on infrastructure — infrastructure depends on core. |
| **Strategy** | Context depends on the abstract strategy interface. Concrete strategies are injected, not created by the context. |
| **Repository** | Domain code depends on repository interfaces. Concrete implementations (EF Core, Dapper, mock) implement these interfaces. |
| **Bridge** | Abstraction depends on the implementor interface. Both abstraction and implementation can vary independently. |
| **Service Locator** | The locator abstracts away concrete service creation — though often considered an anti-pattern compared to DI containers for DIP. |
| **Observer** | Subject depends on the abstract observer interface, not concrete observers. New observers can be added without modifying the subject. |

---

## Section 4: Quick Selection Guide

### By Problem Statement

| Situation | Recommended Pattern(s) | Also Consider |
|-----------|----------------------|---------------|
| Need undo/redo functionality | **Command + Memento** | State-based history with Memento snapshots |
| Need to swap algorithm at runtime | **Strategy + Factory Method** | Bridge if the algorithm is tied to a platform |
| Need to add behavior without modifying existing code | **Decorator** | Proxy if the behavior is access-related; AOP |
| Need to communicate between loosely coupled components | **Observer**, **Mediator**, **Event Bus** | Pub/sub message broker for cross-process |
| Need transaction coordination across microservices | **Saga**, **Outbox** | Two-Phase Commit (avoid in distributed systems) |
| Need to manage object creation | **Factory Method**, **Abstract Factory**, **DI Container** | Builder for complex multi-step construction |
| Need to handle tree structures | **Composite + Visitor** | Interpreter for expression trees |
| Need uniform data access abstraction | **Repository + Unit of Work** | DAO for simpler CRUD-only requirements |
| Need separate read and write models | **CQRS** | Read-only replicas if full CQRS is overkill |
| Need to recreate past state for audit/debug | **Event Sourcing** | Memento for in-memory snapshots |
| Need to prevent cascading failures | **Circuit Breaker** | Bulkhead, Timeout, Retry |
| Need to replace a legacy system incrementally | **Strangler Fig** | Anti-Corruption Layer, Adapter |
| Need thread-safe lazy initialization | **Double-Checked Locking**, **Lazy\<T\>** | Singleton (ensure thread safety) |
| Need async pipeline processing | **Pipeline**, **Chain of Responsibility**, **Fork-Join** | Reactive Extensions (Rx) for event streams |
| Need to ensure exactly-once message delivery | **Outbox + Idempotent Consumer** | Transactional Outbox, Idempotency Key |
| Need to validate business rules dynamically | **Specification** | Strategy (for single rules), Visitor (for rule evaluation across entities) |
| Need to decouple sender from receiver | **Command** | Observer (one-to-many), Mediator (many-to-many) |
| Need to provide a simplified interface to a subsystem | **Facade** | Mediator (if coordination is needed between subsystem components) |
| Need to support multiple incompatible formats | **Adapter** | Bridge (if designing for future formats upfront) |
| Need to iterate over a collection without exposing internals | **Iterator** | Visitor (if operations are diverse and need double dispatch) |
| Need to cache expensive operations | **Proxy (Virtual Proxy)** + **Decorator** | Flyweight (if many identical objects share state) |
| Need to maintain a consistent state across aggregates | **Domain Event + Eventual Consistency** | Saga (if compensating actions are needed) |
| Need to compose validation rules | **Specification** | Chain of Responsibility (each link validates one rule) |

### By Architecture Style

| Architecture | Core Patterns |
|-------------|---------------|
| **Layered (N-Tier)** | Service Layer, Repository, DTO, DAO, Unit of Work |
| **Hexagonal (Ports & Adapters)** | Port, Adapter, DTO, Repository (as output port), DI |
| **Onion / Clean Architecture** | Repository, Use Case / Interactor, DTO, Presenter, Entity |
| **CQRS / Event Sourcing** | Command, Query, Event, Aggregate, Projection, Saga |
| **Microservices** | Saga, Outbox, API Gateway, Circuit Breaker, Service Discovery |
| **Event-Driven** | Event Bus, Observer, Pub/Sub, Event Sourcing, CQRS |
| **Domain-Driven Design** | Aggregate, Value Object, Domain Event, Repository, Factory, Service |
| **Reactive** | Observer, Iterator (Rx streams), Circuit Breaker, Scheduler |

### By Quality Attribute

| Quality Attribute | Supporting Patterns |
|-------------------|---------------------|
| **Performance** | Flyweight (memory), Proxy/Lazy Loading (deferred init), Object Pool (reuse) |
| **Scalability** | CQRS (read replicas), Event Sourcing (async projections), Queue-based Load Leveling |
| **Availability** | Circuit Breaker, Bulkhead, Health Endpoint, Retry with Backoff |
| **Maintainability** | Strategy, Decorator, Visitor, Specification, Service Layer |
| **Testability** | Repository (mockable), DI, Strategy, Command, Hexagonal Architecture |
| **Security** | Proxy (access control), Strategy (auth algorithms), Facade (narrowed API) |
| **Reliability** | Retry, Circuit Breaker, Outbox, Saga, Idempotent Consumer |
| **Extensibility** | Decorator, Strategy, Visitor, Observer, Plugin architecture |

---

## Section 5: Decision Flowchart

```
Start: What's the primary concern?
│
├── Creating objects?
│   ├── Single product, defer class choice → Factory Method
│   ├── Families of related products → Abstract Factory
│   ├── Complex step-by-step construction → Builder
│   ├── Cloning prototypical instances → Prototype
│   ├── Single shared instance → Singleton
│   └── Reusing expensive objects → Object Pool
│
├── Structuring classes/objects?
│   ├── Adding responsibilities dynamically → Decorator
│   ├── Controlling access / lazy init → Proxy
│   ├── Making incompatible interfaces work → Adapter
│   ├── Simplifying a subsystem → Facade
│   ├── Representing part-whole hierarchies → Composite
│   ├── Decoupling abstraction from implementation → Bridge
│   ├── Sharing fine-grained objects → Flyweight
│   └── Providing a simple, uniform interface to a set of components → Facade
│
├── Managing behavior / algorithms?
│   ├── Swapping entire algorithms → Strategy
│   ├── Defining algorithm skeleton with overridable steps → Template Method
│   ├── Encapsulating a request as an object → Command
│   ├── Changing behavior based on internal state → State
│   ├── Iterating over a collection without exposing internals → Iterator
│   ├── Adding new operations to a hierarchy without modifying it → Visitor
│   ├── Defining a grammar and interpreting it → Interpreter
│   ├── Passing a request along a dynamic chain → Chain of Responsibility
│   ├── Notifying multiple objects when state changes → Observer
│   └── Centralizing complex communication between objects → Mediator
│
├── Organizing business logic?
│   ├── Abstracting data access → Repository
│   ├── Tracking changes for transactions → Unit of Work
│   ├── Expressing composable business rules → Specification
│   ├── Maintaining consistent cluster of domain objects → Aggregate
│   ├── Publishing meaningful domain occurrences → Domain Event
│   ├── Separating read from write models → CQRS
│   ├── Storing state as event sequence → Event Sourcing
│   ├── Defining a clear application boundary → Service Layer
│   └── Transferring data across layers without exposing internals → DTO
│
├── Coordinating service communication?
│   ├── Coordinating distributed transactions → Saga
│   ├── Reliable message publication → Outbox
│   ├── Preventing repeated processing → Idempotent Consumer
│   ├── Handling events reliably → Dead Letter Queue, Retry
│   ├── Routing requests to multiple services → API Gateway
│   └── Aggregating responses from multiple services → Aggregator / Gateway
│
├── Ensuring resilience / fault tolerance?
│   ├── Preventing cascading failures → Circuit Breaker
│   ├── Isolating resources → Bulkhead
│   ├── Handling transient failures → Retry
│   ├── Ensuring responsiveness → Timeout
│   ├── Handling graceful degradation → Fallback
│   └── Monitoring health → Health Endpoint
│
└── Managing concurrency / performance?
    ├── Thread-safe single instance → Singleton (Double-Checked Locking)
    ├── Reusing expensive objects across threads → Object Pool
    ├── Sharing intrinsic state → Flyweight
    ├── Asynchronous processing pipeline → Pipeline, Fork-Join
    ├── Read/write lock for infrequent writes → Read-Write Lock
    └── Thread confinement → Thread-Local Storage
```

---

## Section 6: Anti-Pattern Awareness

Recognize when a pattern is being misapplied — these are common misuse scenarios:

| Misuse | Why It Fails | Better Approach |
|--------|-------------|-----------------|
| Overusing Singleton as a global variable | Creates hidden dependencies, impedes testing, violates DIP | Use DI container with scoped lifetime |
| Repository pattern without a real abstraction need | Adds unnecessary indirection for simple CRUD over a single table | Use a lightweight DAO or direct ORM |
| CQRS without a split reason | Doubles complexity for no benefit — queries and writes use the same model | Only split when read/write models genuinely differ |
| Event Sourcing without audit requirement | Adds massive storage and replay complexity | Use simple auditing tables |
| Decorator chain too deep | Debugging becomes difficult, stack traces are incomprehensible | Limit to 3-4 decorators; consider AOP |
| Strategy pattern for a single algorithm | Unnecessary indirection, class explosion | Use a simple function/delegate or conditional |
| Factory for everything | Obscures simple construction, adds ceremony | Use `new` directly or a DI container |
| Abstract Factory for a single product family | Over-engineering — AF is for multiple related families | Use Factory Method |
| Mediator becomes a god object | All logic migrates to mediator, defeating decoupling | Split into domain-specific mediators or use an event bus |
| Composite with many leaf types | Interface becomes bloated to accommodate all leaf operations | Use Visitor to separate operations |

---

## Section 7: Pattern Interoperability Matrix

Patterns typically used together (✓ = natural fit, — = common combination, ○ = possible but uncommon):

| Pattern | Works Well With | Avoid With |
|---------|----------------|------------|
| Strategy | Factory Method, Command, Template Method | Singleton (rarely needed) |
| Decorator | Proxy, Command, Strategy | Composite (different goals) |
| Composite | Visitor, Decorator, Interpreter | Singleton |
| Command | Memento, Composite (macro commands), Strategy | State |
| Observer | Mediator, Event Sourcing, MVC | Singleton |
| Mediator | Observer, Command, Facade | Chain of Responsibility |
| Repository | Unit of Work, Specification, Service Layer | Active Record |
| Factory Method | Strategy, Abstract Factory, Template Method | Singleton |
| Abstract Factory | Factory Method, Singleton, Strategy | Prototype |
| Proxy | Decorator, Lazy Loading, AOP | Template Method |
| Adapter | Hexagonal Architecture, Anti-Corruption Layer | Bridge (different intent) |
| Facade | Mediator, Service Layer | Adapter |
| Bridge | Abstract Factory, Strategy | Adapter |
| Template Method | Factory Method, Strategy | Strategy (competing solutions) |
| State | Strategy (implementation similarity) | Command |
| Visitor | Composite, Interpreter | Decorator |
| Specification | Repository, Builder, Strategy | Active Record |
| Saga | Outbox, CQRS, Event Sourcing | Two-Phase Commit |
| Outbox | Saga, Idempotent Consumer, Event Bus | Direct publish |
| Aggregate | Domain Event, Repository, Factory | Singleton |
| Circuit Breaker | Retry, Timeout, Bulkhead | None |
| CQRS | Event Sourcing, Command, Query | Simple CRUD |
| DTO | Hexagonal, Service Layer, Facade | Domain Model (leaking) |

---

## Section 8: Layered Architecture Pattern Mapping

How patterns map to typical application layers:

### Presentation Layer
- **MVC / MVVM** — UI architecture
- **DTO** — data transfer to/from client
- **Presenter / ViewModel** — view state management
- **Controller** — request handling (in MVC)
- **Facade** — simplified front-end API

### Application / Service Layer
- **Service Layer / Application Service** — orchestrates use cases
- **Command / Query** — use case objects (CQRS)
- **DTO Assembler** — maps domain ↔ DTO
- **Mediator / Event Bus** — in-process messaging
- **Validator** — input validation (often FluentValidation)
- **Pipeline / Middleware** — cross-cutting behavior (logging, auth)

### Domain Layer
- **Entity** — object with identity and lifecycle
- **Value Object** — immutable, equality-by-value
- **Aggregate** — consistency boundary
- **Domain Event** — meaningful domain occurrence
- **Domain Service** — stateless domain operations
- **Specification** — composable business rules
- **Repository (interface)** — domain-level data contract
- **Factory** — complex domain object creation

### Infrastructure / Persistence Layer
- **Repository (implementation)** — concrete data access
- **Unit of Work** — transaction management
- **DAO** — low-level data access
- **ORM Mapping** — entity/table mapping (EF Core, Hibernate)
- **Outbox** — reliable message publication
- **Event Store** — event persistence (Event Sourcing)
- **Migration** — schema evolution

### Cross-Cutting / Shared
- **Dependency Injection** — wiring everything together
- **Logging Decorator** — cross-cutting logging
- **Caching Decorator / Proxy** — response caching
- **Circuit Breaker** — resilience
- **Retry** — transient fault handling
- **Audit Trail** — change tracking
- **Security Proxy** — authorization enforcement
- **Exception Handling Middleware** — global error handling

---

## References

- Gamma et al., *Design Patterns: Elements of Reusable Object-Oriented Software* (GoF)
- Martin Fowler, *Patterns of Enterprise Application Architecture*
- Eric Evans, *Domain-Driven Design*
- Vaughn Vernon, *Implementing Domain-Driven Design*
- Sam Newman, *Building Microservices*
- Chris Richardson, *Microservices Patterns*
- Microsoft, *Cloud Design Patterns*
