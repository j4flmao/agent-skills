# SOLID Deep Dive

## Single Responsibility Principle (SRP)

A class should have one reason to change.

### Detection Heuristics
| Smell | Problem | Solution |
|-------|---------|----------|
| Class named `Manager`, `Helper`, `Util` | Multiple responsibilities | Split into focused classes |
| Class has >4 public methods on different data | Too many concerns | Group by data domain |
| Method has >2 levels of abstraction | Mixed concerns | Extract helper methods |
| Changes come from multiple stakeholders | Different change pressures | Split by stakeholder need |

### Example
```
Bad: OrderService (validates, persists, emails, logs)
Good: OrderValidator + OrderRepository + EmailNotifier + AuditLogger
```

## Open/Closed Principle (OCP)

Open for extension, closed for modification.

### Implementation Strategies
| Strategy | Mechanism | When |
|----------|-----------|------|
| Strategy pattern | Interface + implementations | Algorithm selection |
| Template method | Abstract base with hooks | Fixed skeleton, variable steps |
| Decorator | Wrapping interface | Adding behavior to existing |
| Plugin architecture | Service loading | Runtime extensibility |

## Liskov Substitution Principle (LSP)

Subtypes must be substitutable for base types.

### Common Violations
- `Square extends Rectangle` (overrides setters inconsistently).
- `ReadOnlyCollection extends Collection` (throws on add).
- `NullStream extends Stream` (all methods no-op).
- `PersistentSet extends Set` (adds DB dependency).

### Prevention
- Favor composition over inheritance to avoid LSP issues entirely.
- If using inheritance, the subtype should NOT:
  - Throw new exceptions not thrown by base.
  - Strengthen preconditions (accept narrower input).
  - Weaken postconditions (return broader output).
  - Remove side effects the base class guarantees.

## Interface Segregation Principle (ISP)

No client should depend on methods it doesn't use.

### Detection
- An implementation throws `NotImplementedException` or `UnsupportedOperationException`.
- An interface has >3 methods serving different client types.
- A client depends on an interface but only uses 1-2 methods.

## Dependency Inversion Principle (DIP)

Depend on abstractions, not concretions.

### Application Layers
```
High-level policy (domain) ← abstraction ← Low-level detail (infrastructure)
```

### Rules
- Domain layer defines interfaces (repository, service, event bus).
- Infrastructure implements those interfaces.
- Composition root wires implementations to abstractions.
- Domain never imports infrastructure.
