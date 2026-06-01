# Design Patterns Fundamentals

## What Are Design Patterns?

Design patterns are reusable solutions to common problems in software design. They are not code templates but conceptual solutions that must be adapted to context. Each pattern has:
- **Intent**: What problem it solves
- **Motivation**: Why it works
- **Applicability**: When to use it
- **Structure**: How the components relate
- **Consequences**: Trade-offs and costs

## Pattern Categories

### Creational Patterns
Control object creation mechanisms. They abstract the instantiation process, making a system independent of how its objects are created.

| Pattern | Intent | When to Use |
|---------|--------|-----------|
| Singleton | Ensure one instance with global access | Exactly one instance needed, DI cannot manage lifecycle |
| Factory Method | Delegate object creation to subclasses | Class can't anticipate the type of objects it needs |
| Abstract Factory | Create families of related objects | System needs to be configured with multiple product families |
| Builder | Construct complex objects step by step | Object creation involves many steps or configuration |
| Prototype | Create copies without depending on concrete classes | Object creation is expensive, similar instances needed |

### Structural Patterns
Concerned with object composition and structure. They ensure that if one part changes, the entire structure doesn't need to change.

| Pattern | Intent | When to Use |
|---------|--------|-----------|
| Adapter | Make incompatible interfaces work together | Need to integrate existing code with a different interface |
| Decorator | Add responsibilities dynamically | Need to add behavior without subclassing |
| Proxy | Control access to another object | Need lazy loading, access control, or logging |
| Facade | Simplify a complex subsystem | Need a simple interface to a complex system |
| Composite | Treat individual and composite objects uniformly | Tree structures, recursive composition |
| Flyweight | Share fine-grained objects | Memory pressure from many similar objects (profile first) |

### Behavioral Patterns
Concerned with algorithms, responsibility assignment, and communication between objects.

| Pattern | Intent | When to Use |
|---------|--------|-----------|
| Strategy | Select algorithm at runtime | Multiple algorithms for the same task, interchangeable |
| Observer | Notify multiple objects of state changes | One-to-many dependency, event broadcasting |
| Command | Encapsulate a request as an object | Parameterize operations, queue requests, support undo |
| State | Change behavior when state changes | Object behavior depends on its state, state transitions |
| Template Method | Define skeleton of an algorithm | Invariant algorithm steps with variant implementations |
| Iterator | Traverse a collection without exposing internals | Need to access elements sequentially |
| Visitor | Separate algorithm from object structure | Many unrelated operations on a stable object structure |
| Mediator | Reduce coupling between communicating objects | Complex communication between many objects |

## Pattern Selection Decision Framework

### The "Axis of Change" Principle
Identify what is likely to change in your system and select a pattern that encapsulates that change:

| What Changes | Pattern to Encapsulate It |
|---|---|
| How objects are created | Factory Method, Abstract Factory |
| How objects are composed | Decorator, Composite |
| How algorithms are selected | Strategy |
| How objects communicate | Observer, Mediator |
| How an object's state behaves | State |
| How requests are processed | Command, Chain of Responsibility |

### The "Cost of Change" Rule
Simplicity first. Add patterns only when the cost of change without them exceeds the cost of implementing them.

```
Is the change axis well-understood and stable?
  ├── Yes → Build with the pattern from the start
  └── No → Build simple first, refactor to pattern when changes emerge
```

### The "Pattern is a Tool" Rule
- No pattern is universally good or bad
- Context determines fitness
- The same problem might be solved by different patterns in different contexts
- Patterns add indirection — indirection adds complexity — complexity must be justified

## Enterprise Patterns

| Pattern | Purpose |
|---|---|
| Repository | Abstracts data access behind a collection-like interface |
| Unit of Work | Tracks changes during a transaction, commits atomically |
| Aggregate | Cluster of domain objects treated as a single unit |
| Domain Event | Something meaningful that happened in the domain |
| Service Layer | Defines application boundary and operations |
| Data Mapper | Moves data between objects and database without coupling them |
| Identity Map | Ensures each object is loaded only once per transaction |
| Lazy Load | Defers loading of related objects until needed |

## Integration Patterns

| Pattern | Purpose |
|---|---|
| Message Queue | Asynchronous communication via durable messages |
| Event Bus | Publish-subscribe event distribution |
| Circuit Breaker | Prevent cascading failures in distributed systems |
| Bulkhead | Isolate failures by partitioning resources |
| Saga | Coordinating transactions across services |
| Strangler Fig | Gradually replace a monolithic system |
| API Gateway | Single entry point for multiple microservices |
| Backend for Frontend | Separate API per client type |

## Pattern Relationship

### Common Compositions
```
Repository + Unit of Work: Data access with transaction support
Command + Mediator: CQRS command/query dispatch
Observer + Mediator: Event bus with pub/sub
Strategy + Factory: Pluggable behavior with automatic selection
Decorator + Proxy: Layered cross-cutting concerns
Aggregate + Repository: Domain-driven data access
```

### Incompatible Combinations
- Singleton + Stateless Service: Redundant (stateless services can be singletons naturally)
- Flyweight + Heavy Computation: Flyweight saves memory, not CPU
- Prototype + Complex Object Graphs: Deep copy is expensive and error-prone

## Rules
- Prefer composition over inheritance
- Program to an interface, not an implementation
- Encapsulate what varies
- Favor object delegation over class inheritance
- Single Responsibility: a pattern should solve exactly one problem
- Open/Closed: patterns should be open for extension, closed for modification
- The simplest solution that works is better than the most elegant pattern
- Document why you chose a pattern and what alternatives you rejected
