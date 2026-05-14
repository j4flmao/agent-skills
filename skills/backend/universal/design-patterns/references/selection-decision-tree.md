# Pattern Selection Decision Tree

## Top-Level Decision

```
PROBLEM
├── Creating objects?
│   ├── Only one instance needed? → Singleton
│   ├── Subclass decides type? → Factory Method
│   ├── Family of related objects? → Abstract Factory
│   ├── Complex object construction? → Builder
│   ├── Cloning cheaper than creation? → Prototype
│   └── None of the above → Keep using `new` / DI
│
├── Structuring classes/objects?
│   ├── Incompatible interface? → Adapter
│   ├── Abstraction and implementation vary independently? → Bridge
│   ├── Tree structure with uniform treatment? → Composite
│   ├── Add behavior without modifying? → Decorator
│   ├── Simplify subsystem access? → Facade
│   ├── Many fine-grained objects, memory issue? → Flyweight
│   ├── Controlled access to object? → Proxy
│   └── None of the above → Keep simple composition
│
├── Defining object communication?
│   ├── Request passes through handler chain? → Chain of Responsibility
│   ├── Encapsulate request for undo/queue? → Command
│   ├── Simple grammar interpretation? → Interpreter
│   ├── Uniform collection traversal? → Iterator
│   ├── Complex communication hub? → Mediator
│   ├── State snapshot/restore? → Memento
│   ├── One-to-many change propagation? → Observer
│   ├── Behavior changes with state? → State
│   ├── Interchangeable algorithms? → Strategy
│   ├── Algorithm skeleton with variant steps? → Template Method
│   ├── Many operations on stable structure? → Visitor
│   └── None of the above → Keep simple method calls
```

## Creational Decision Matrix

| Condition | Singleton | Factory Method | Abstract Factory | Builder | Prototype |
|---|---|---|---|---|---|
| Only one instance | YES | NO | NO | NO | NO |
| Multiple product families | NO | NO | YES | NO | NO |
| Complex construction | NO | NO | NO | YES | NO |
| Expensive creation | NO | NO | NO | NO | YES |
| DI container manages lifecycle | NO | Prefer DI | Prefer DI | OK | OK |
| Configuration-driven creation | OK | OK | YES | OK | NO |

## Structural Decision Matrix

| Need | Adapter | Bridge | Composite | Decorator | Facade | Proxy |
|---|---|---|---|---|---|---|
| Interface mismatch | YES | NO | NO | NO | NO | NO |
| Separate abstraction from impl | NO | YES | NO | NO | NO | NO |
| Uniform tree handling | NO | NO | YES | NO | NO | NO |
| Runtime behavior extension | NO | NO | NO | YES | NO | NO |
| Subsystem simplification | NO | NO | NO | NO | YES | NO |
| Access control/lazy loading | NO | NO | NO | NO | NO | YES |

## Behavioral Decision Matrix

| Need | Pattern |
|---|---|
| Unknown handler, multiple may process | Chain of Responsibility |
| Queue, log, undo, transactional | Command |
| Object structure changes behavior | State |
| Algorithm family, swappable | Strategy |
| Algorithm skeleton, variant steps | Template Method |
| One-to-many change notification | Observer |
| Many-to-many communication | Mediator |
| Separating algorithm from structure | Visitor |
| Uniform iteration over different collections | Iterator |

## Performance vs. Flexibility Trade-off

```
High Performance                    High Flexibility
│                                       │
├── Singleton (fast, global)           ├── Strategy (swappable)
├── Flyweight (memory efficient)       ├── Decorator (composable)
├── Template Method (compile-time)     ├── Visitor (many ops)
├── Iterator (sequential access)       ├── Abstract Factory (families)
├── Proxy (controlled access)          ├── Chain of Resp. (dynamic)
└── Adapter (interface fix)            └── Mediator (complex routing)

Rule: Apply LEFT patterns when performance is critical (>500 rps).
Apply RIGHT patterns when maintainability is critical (complex business logic).
```

## When NOT to Use a Pattern

| Pattern | Don't use when |
|---|---|
| **Singleton** | You can use DI container singleton scope |
| **Factory Method** | Constructor is sufficient (arguments are not complex) |
| **Abstract Factory** | Only one product family exists |
| **Builder** | Object has <4 constructor parameters |
| **Prototype** | Object creation is cheap |
| **Adapter** | You can change the target interface |
| **Bridge** | Abstraction and implementation are tightly coupled |
| **Composite** | Object tree has only 1-2 levels |
| **Decorator** | You can modify the original class |
| **Facade** | Subsystem is already simple |
| **Flyweight** | Object count is <10,000 |
| **Proxy** | Direct access is acceptable |
| **Chain of Resp.** | Handler can be determined at compile-time |
| **Command** | No undo/queue/logging needed |
| **Observer** | One-to-one dependency only |
| **Mediator** | Few objects, simple communication |
| **State** | Few states (<3) with simple transitions |
| **Strategy** | Only one algorithm exists |
| **Template Method** | Entire algorithm varies |
| **Visitor** | Object structure changes frequently |
