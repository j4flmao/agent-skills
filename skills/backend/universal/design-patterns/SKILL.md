---
name: design-patterns
description: >
  Use this skill when selecting or reviewing any design pattern — GoF creational/structural/behavioral, enterprise, integration, concurrency, architectural, or anti-pattern avoidance. This skill enforces: pattern selection decision framework, trade-off analysis, anti-pattern rejection, explicit elimination criteria for rejected candidates, and pattern composition rules. Do NOT use for: framework-specific patterns (e.g. Angular DI), language-specific idioms (e.g. Rust ownership), infrastructure patterns (e.g. Kubernetes operators).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, design-patterns, phase-2, universal]
---

# Design Patterns

## Purpose
Guide pattern selection across all categories — GoF, enterprise, integration, concurrency, architectural — with decision trees, applicability rules, trade-off analysis, and composition guidance.

## Agent Protocol

### Trigger
User request includes: `design pattern`, `gof`, `gang of four`, `pattern catalog`, `creational`, `structural`, `behavioral`, `pattern selection`, `enterprise pattern`, `integration pattern`, `concurrency pattern`, `architectural pattern`, `anti-pattern`, `pattern composition`, `CQRS`, `event sourcing`, `saga`, `repository`, `unit of work`, `messaging pattern`, `circuit breaker`, `strangler fig`, `saga pattern`, `hexagonal architecture`, `clean architecture`.

### Input Context
- Problem statement with constraints (performance, memory, team size, tech stack)
- Current architecture description
- Existing patterns already in use
- Pattern category preference or openness

### Output
Selected pattern(s) with rationale, rejected candidates with explicit elimination reasons, implementation sketch, trade-off table, and composition rules if multiple patterns are needed.

### Response Format
No preamble. No postamble. No explanations. Strip articles a/an/the where unambiguous. Compress output. If no pattern fits, output `No matching pattern. Consider: [alternative approach].` and stop.

### Completion Criteria
- Decision tree traversed and documented
- Rejected candidates include explicit elimination reason
- Implementation sketch covers pattern structure (not full business logic)
- Trade-offs documented for each selected pattern
- Pattern composition rules applied if multiple patterns

## Architecture Decision Tree

### Which Pattern Category?

```
What kind of problem are you solving?
  ├── Object creation, instance management → Creational (Singleton, Factory, Builder, Prototype)
  ├── Class/object composition, interfaces → Structural (Adapter, Decorator, Proxy, Facade)
  ├── Object communication, algorithms → Behavioral (Observer, Strategy, Command, State)
  ├── Business logic organization, persistence → Enterprise (Repository, Unit of Work, Aggregate)
  ├── Service-to-service communication → Integration (Message Queue, Event Bus, API Gateway)
  ├── Thread safety, async coordination → Concurrency (Mutex, Semaphore, Actor, Fan-out/Fan-in)
  ├── High-level system structure → Architectural (Clean Architecture, Hexagonal, CQRS, Event Sourcing)
  └── Code smells affecting maintainability → Anti-Pattern to refactor (God Class, Spaghetti Code)
```

### GoF Pattern Selection Decision Tree

```
What is changing?
  ├── How objects are created → Creational
  │   ├── Need to ensure single instance → Singleton
  │   ├── Need to create families of related objects → Abstract Factory
  │   ├── Need to construct complex objects step by step → Builder
  │   ├── Need to create copies without knowing concrete types → Prototype
  │   └── Need to delegate creation to subclasses → Factory Method
  ├── How objects are composed → Structural
  │   ├── Need to make incompatible interfaces compatible → Adapter
  │   ├── Need to add responsibilities dynamically → Decorator
  │   ├── Need to control access to an object → Proxy
  │   ├── Need to simplify complex subsystem → Facade
  │   ├── Need to compose objects into tree structures → Composite
  │   └── Need to share fine-grained objects → Flyweight (only if profiler confirms memory pressure)
  └── How objects communicate and distribute work → Behavioral
      ├── Need to notify multiple objects of state changes → Observer
      ├── Need to select algorithm at runtime → Strategy
      ├── Need to encapsulate a request as an object → Command
      ├── Need to define skeleton of an algorithm → Template Method
      ├── Need to traverse a collection without exposing internals → Iterator
      ├── Need to represent a grammar → Interpreter
      ├── Need to capture and restore object state → Memento
      ├── Need to dispatch operations based on type → Visitor
      └── Need to manage state-dependent behavior → State
```

### Enterprise Pattern Selection

```
What enterprise problem are you solving?
  ├── Data access abstraction → Repository
  ├── Transaction coordination → Unit of Work
  ├── Business logic as transaction script → Transaction Script
  ├── Business logic as domain model → Domain Model
  ├── Object identity and caching → Identity Map
  ├── Lazy loading for related objects → Lazy Load
  ├── Mapping objects to database → Data Mapper
  └── Separating read/write models → CQRS
```

### Integration Pattern Selection

```
How do services communicate?
  ├── One-to-one, request-reply → RPC/HTTP + Circuit Breaker
  ├── One-to-many, fire-and-forget → Message Queue (Event Bus)
  ├── Guaranteed delivery, durability → Durable Message Queue
  ├── Bidirectional, low latency → WebSocket
  ├── Asynchronous, eventual consistency → Event-Driven + Transactional Outbox
  ├── Coordinating multiple services → Saga (Choreography or Orchestration)
  ├── Gradually migrating a monolith → Strangler Fig
  └── Protecting downstream services → Circuit Breaker + Retry + Bulkhead
```

### Concurrency Pattern Selection

```
What concurrency problem?
  ├── Protect shared resource → Mutex / Read-Write Lock
  ├── Coordinate multiple workers → Semaphore / Barrier
  ├── Pipeline processing → Pipeline / Fan-out/Fan-in
  ├── Thread-safe state management → Actor Model
  └── Parallel independent tasks → Fork-Join / Parallel Streams
```

## Workflow

### Step 1: Classify the Problem
| Problem | Category | Reference |
|---|---|---|
| Object creation, instance management | Creational | `gof-patterns.md` |
| Class/object composition, interfaces | Structural | `gof-patterns.md` |
| Object communication, algorithms | Behavioral | `gof-patterns.md` |
| Business logic organization, persistence | Enterprise | `enterprise-patterns.md` |
| Service-to-service communication | Integration | `integration-patterns.md` |
| Thread safety, async coordination | Concurrency | `concurrency-patterns.md` |
| High-level system structure | Architectural | `enterprise-patterns.md` |
| Code smells needing refactoring | Anti-patterns | `anti-patterns.md` |

### Step 2: Apply Selection Decision Framework
1. **What is changing?** (axis of change) — patterns encapsulate change
2. **What is binding time?** (compile-time vs runtime)
3. **What is scope?** (class-level vs object-level)

### Step 3: Evaluate Candidates Within Category
For each candidate pattern, evaluate:
- **Intent match**: Does the pattern's intent solve the stated problem?
- **Applicability**: Are the conditions for using this pattern met?
- **Trade-offs**: What does the pattern cost (complexity, indirection, performance)?
- **Composition**: Does this pattern combine well with others?

## Pattern Implementation Examples

### Factory Method (TypeScript)
```typescript
interface PaymentGateway {
  charge(amount: Money): Promise<PaymentResult>;
}

class StripeGateway implements PaymentGateway { ... }
class PayPalGateway implements PaymentGateway { ... }

abstract class PaymentGatewayFactory {
  abstract createGateway(): PaymentGateway;
  
  async processPayment(amount: Money): Promise<PaymentResult> {
    const gateway = this.createGateway();
    return gateway.charge(amount);
  }
}

class StripeFactory extends PaymentGatewayFactory {
  createGateway(): PaymentGateway {
    return new StripeGateway(process.env.STRIPE_KEY);
  }
}
```

### Strategy Pattern (Python)
```python
from abc import ABC, abstractmethod

class ShippingStrategy(ABC):
    @abstractmethod
    def calculate(self, weight: float, distance: float) -> float: ...

class FlatRateShipping(ShippingStrategy):
    def calculate(self, weight: float, distance: float) -> float:
        return 5.99

class WeightBasedShipping(ShippingStrategy):
    def calculate(self, weight: float, distance: float) -> float:
        return weight * 0.5 + distance * 0.01

class Order:
    def __init__(self, shipping_strategy: ShippingStrategy):
        self._shipping = shipping_strategy
    
    @property
    def shipping_cost(self) -> float:
        return self._shipping.calculate(self.weight, self.distance)
```

### Observer Pattern (Event-Driven)
```typescript
interface Observer<T> {
  update(event: T): Promise<void>;
}

class EventEmitter<T> {
  private observers: Set<Observer<T>> = new Set();

  subscribe(observer: Observer<T>): void {
    this.observers.add(observer);
  }

  unsubscribe(observer: Observer<T>): void {
    this.observers.delete(observer);
  }

  async emit(event: T): Promise<void> {
    await Promise.allSettled(
      Array.from(this.observers).map(o => o.update(event))
    );
  }
}
```

### Decorator Pattern (TypeScript)
```typescript
interface Notifier {
  send(message: string): Promise<void>;
}

class EmailNotifier implements Notifier {
  async send(message: string): Promise<void> {
    // Send via SMTP
  }
}

class SlackNotifierDecorator implements Notifier {
  constructor(private wrapped: Notifier) {}

  async send(message: string): Promise<void> {
    await this.wrapped.send(message);
    await this.sendToSlack(message);  // additional behavior
  }

  private async sendToSlack(message: string): Promise<void> {
    // Post to Slack channel
  }
}
```

### Adapter Pattern (Third-Party Integration)
```typescript
// Third-party SDK (incompatible interface)
class StripeSDK {
  createPayment(amountCents: number, currency: string, token: string): Promise<any> { }
}

// Target interface
interface PaymentProcessor {
  charge(amount: Money): Promise<PaymentResult>;
}

// Adapter
class StripeAdapter implements PaymentProcessor {
  constructor(private sdk: StripeSDK) {}

  async charge(amount: Money): Promise<PaymentResult> {
    const response = await this.sdk.createPayment(
      amount.toCents(),
      amount.currency,
      amount.sourceToken
    );
    return { transactionId: response.id, status: response.status };
  }
}
```

### Command Pattern (CQRS)
```typescript
interface Command<T = void> {
  execute(): Promise<T>;
}

class PlaceOrderCommand implements Command<Order> {
  constructor(
    private orderRepo: OrderRepository,
    private eventBus: EventBus,
    private items: OrderItem[],
  ) {}

  async execute(): Promise<Order> {
    const order = Order.create(this.items);
    await this.orderRepo.save(order);
    await this.eventBus.publish(new OrderPlacedEvent(order.id));
    return order;
  }
}

// Usage
const command = new PlaceOrderCommand(repo, bus, items);
await commandBus.dispatch(command);
```

### State Pattern (State Machine)
```typescript
interface OrderState {
  addItem(item: OrderItem): void;
  pay(amount: Money): void;
  ship(): void;
}

class PendingState implements OrderState {
  constructor(private order: Order) {}
  addItem(item: OrderItem) { this.order.items.push(item); }
  pay(amount: Money) { this.order.setState(new PaidState(this.order)); }
  ship() { throw new Error('Cannot ship pending order'); }
}

class PaidState implements OrderState {
  constructor(private order: Order) {}
  addItem() { throw new Error('Cannot modify paid order'); }
  pay() { throw new Error('Already paid'); }
  ship() { this.order.setState(new ShippedState(this.order)); }
}

class Order {
  state: OrderState = new PendingState(this);
  setState(state: OrderState) { this.state = state; }
}
```

## Anti-Patterns and Rejections

### Common Anti-Patterns to Reject
| Anti-Pattern | Problem | Better Alternative |
|---|---|---|
| Singleton | Global state, hidden dependencies | DI-managed single instance |
| God Class | Too many responsibilities | Decompose into smaller classes |
| Spaghetti Code | Unstructured flow | Clean Architecture layers |
| Golden Hammer | Applying familiar pattern everywhere | Match pattern to problem |
| Premature Optimization | Optimizing without profiling | Measure first, optimize later |
| Service Locator | Hidden dependencies | Constructor injection |

## Pattern Composition

### Common Compositions
| Composition | Patterns | Use Case |
|---|---|---|
| Repository + Unit of Work | Enterprise | Data access with transaction coordination |
| Command + Observer + Mediator | Behavioral + Behavioral | CQRS with event bus |
| Strategy + Factory | Behavioral + Creational | Pluggable algorithms with auto-selection |
| Decorator + Proxy | Structural + Structural | Layered cross-cutting concerns |
| Adapter + Factory | Structural + Creational | Third-party integration abstraction |
| Saga + CQRS + Event Sourcing | Architectural + Architectural | Distributed transactions with audit |
| Chain of Responsibility + Composite | Behavioral + Structural | Request processing pipeline |

## Performance Considerations
- Decorator pattern adds N method calls per operation — acceptable for I/O (< 1μs per layer)
- Observer pattern with many subscribers — use batched delivery or async processing
- Reflection-based patterns (DI, ORM) add startup cost — acceptable for server apps
- Flyweight only when profiler confirms memory pressure
- Command pattern with many commands — use command bus with async dispatch

## Security Considerations
- Proxy pattern for access control (validation proxy, audit proxy)
- Strategy pattern for role-based algorithm selection
- Template Method for secure base implementation with overridable hooks
- Factory pattern for input validation before object creation
- Command pattern enables security audit trail (every action is an object)

## Rules
- Identify axis of change before selecting pattern.
- Prefer composition over inheritance.
- Singleton only when DI cannot manage lifecycle.
- Flyweight only when profiler confirms memory pressure.
- No pattern is universally applicable — context determines fitness.
- Enterprise patterns solve business logic organization.
- Integration patterns solve service communication.
- Concurrency patterns add complexity — use only when profiler confirms contention.
- Architectural patterns constrain the entire system — apply early, refactor reluctantly.
- Every pattern selection must document rejected alternatives with reasons.
- When two patterns solve the same problem, pick the simpler one.
- Never apply a pattern just because it exists — always have a concrete problem.

## References
  - references/anti-patterns.md — Anti-Patterns Reference
  - references/concurrency-patterns.md — Concurrency Patterns
  - references/design-patterns-fundamentals.md — Design Patterns Fundamentals
  - references/design-patterns-advanced.md — Design Patterns Advanced
  - references/domain-driven-design-patterns.md — Domain-Driven Design Patterns
  - references/enterprise-patterns.md — Enterprise & Architectural Patterns
  - references/gof-patterns.md — GoF Design Patterns Reference
  - references/integration-patterns.md — Enterprise Integration Patterns Reference
  - references/pattern-catalog.md — Pattern Catalog
  - references/pattern-relationships.md — Pattern Relationships & Selection Reference
  - references/selection-decision-tree.md — Pattern Selection Decision Tree
  - references/testing-patterns.md — Testing Design Patterns
## Handoff
Hand off to `backend/universal/microservices/SKILL.md` if distributed system patterns need implementation details. Hand off to `backend/universal/clean-architecture/SKILL.md` if structuring the entire application. Hand off to `backend/universal/event-driven/SKILL.md` if event-driven patterns need elaboration.
## Implementation Patterns

### Observer Pattern for Event Handling
`
interface EventObserver<T> {
  onEvent(event: T): Promise<void>;
}

class EventBus<T> {
  private observers: Set<EventObserver<T>> = new Set();
  subscribe(observer: EventObserver<T>): void {
    this.observers.add(observer);
  }
  unsubscribe(observer: EventObserver<T>): void {
    this.observers.delete(observer);
  }
  async emit(event: T): Promise<void> {
    const results = Array.from(this.observers).map(o => o.onEvent(event));
    await Promise.allSettled(results);
  }
}
`

### Configuration-Driven Approach
`
config:
  defaults:
    timeout: 30s
    retryCount: 3
  overrides:
    production:
      timeout: 60s
      retryCount: 5
    development:
      timeout: 300s
      retryCount: 1
`

## Production Considerations

### Deployment Checklist
- [ ] Configuration validated against schema before startup
- [ ] Health check endpoints registered and monitored
- [ ] Graceful shutdown with draining period (30s timeout)
- [ ] Resource limits configured (CPU, memory, file descriptors)
- [ ] Log level set appropriate for environment
- [ ] Metrics endpoint secured and exposed
- [ ] Rate limiting configured per-tier
- [ ] TLS certificates valid and auto-renewing
- [ ] Database migrations run as separate deployment step
- [ ] Feature flags ready for gradual rollout

### Monitoring and Alerting
| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| Error rate | > 1% over 5min | Critical | Page on-call |
| p99 latency | > 2s over 5min | Warning | Investigate |
| Throughput drop | > 50% over 1min | Critical | Check upstream |
| Queue depth | > 1000 over 1min | Warning | Scale consumers |
| Disk usage | > 85% | Warning | Clean or expand |
| Memory usage | > 90% heap | Critical | Restart or scale |

## Anti-Patterns

| Anti-Pattern | Symptom | Root Cause | Solution |
|-------------|---------|------------|----------|
| Premature optimization | Complex code for no measured benefit | Guessing instead of profiling | Measure first, optimize based on data |
| Copy-paste reuse | Duplicate code across codebase | Lack of abstraction | Extract shared logic into libraries |
| Gold-plating | Features with no current requirement | Over-engineering | YAGNI — build what's needed now |
| Magical thinking | Assumptions without validation | Skipping error handling | Handle all failure modes explicitly |

## Performance Optimization

### Caching Strategy
Cache hierarchy: L1 (in-memory local) → L2 (distributed Redis/Memcached) → L3 (CDN/Edge).
Cache invalidation: TTL-based (simple, stale), event-based (complex, fresh), write-through (consistent, higher write latency), write-behind (fast writes, eventual consistency).

### Resource Pooling
- Database connections: Pool of reusable connections (HikariCP, pgBouncer)
- HTTP connections: Keep-alive + connection pooling for external calls
- Thread pool: Bounded thread pools for async task execution

### Profiling Methodology
1. Establish baseline with production traffic profile
2. Profile CPU with sampling profiler (pprof, perf, async-profiler)
3. Profile memory with heap dumps and allocation tracking
4. Profile I/O with strace/perf trace for syscall analysis
5. Profile latency with distributed tracing (OpenTelemetry)
6. Identify bottleneck, formulate hypothesis, implement fix
7. Re-profile to verify improvement, repeat

## Security Considerations

### Threat Modeling (STRIDE)
- Spoofing: Identity validation, authentication
- Tampering: Integrity checks, digital signatures
- Repudiation: Audit logs, non-repudiation
- Information disclosure: Encryption, access control
- Denial of service: Rate limiting, resource quotas
- Elevation of privilege: Principle of least privilege

### Supply Chain Security
- Dependency scanning: Snyk, Dependabot, Trivy
- SBOM generation: CycloneDX or SPDX format
- Signed commits: GPG or SSH commit signing
- Artifact verification: Checksum validation, signature verification

### Secrets Management
- Secrets never in code — always in secrets manager (Vault, AWS Secrets Manager)
- Rotation policy: Rotate database credentials every 90 days
- Access audit: Log every secrets access, alert on anomalies
- Encryption at rest and in transit for all secrets
- Principle of least privilege: each service gets only its own secrets

## Rules
- Default-deny security posture — allow only explicitly required access.
- All inputs validated, all outputs encoded, all errors handled.
- Defend in depth — multiple layers of security controls.
- Fail securely — errors default to safe behavior.
- Log security-relevant events for audit and investigation.
- Keep dependencies updated — automate vulnerability scanning.
- Design for observability from day one, not as an afterthought.
- Document all architectural decisions with rationale.
- Review code for security, performance, and correctness before merging.