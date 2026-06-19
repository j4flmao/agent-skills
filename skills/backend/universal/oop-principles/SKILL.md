---
name: oop-principles
description: >
  Use this skill when evaluating codebase design quality or refactoring — SOLID, GRASP, DRY, KISS, YAGNI, Law of Demeter, Composition over Inheritance, Encapsulation, Coupling & Cohesion. This skill enforces: principle violation detection heuristics, refactoring plans with ordered steps, actionable decision flow. Do NOT use for: language-specific idioms, framework patterns, infrastructure design.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, oop, phase-2, universal]
---

# OOP Principles

## Purpose
Apply and enforce language-agnostic OOP, SOLID, GRASP, and foundational software principles for robust backend design. These principles guide the creation of maintainable, testable, and extensible code.

## Agent Protocol

### Trigger
User request includes: `oop`, `solid`, `grasp`, `principles`, `design principles`, `object-oriented`.

### Input Context
- Technology stack (language-agnostic)
- Current codebase design concerns (tight coupling, low cohesion, rigidity)
- Specific principle(s) to apply if requested

### Output Artifact
A markdown document with principle violation detection and refactoring plan. No file unless requested.

### Response Format
Produce the artifact directly. No preamble, no postamble, no explanations. If no violations found, output `No violations detected.` and stop.

### Completion Criteria
- All applicable principles are covered
- Each principle includes: intent, applicability, violation heuristics, language-agnostic example
- Refactoring plan is actionable (ordered steps with file paths)

### Max Response Length
4096 tokens

## Architecture Decision Tree

### Which Principle Applies?

```
What code quality problem are you solving?
  ├── "This class does everything" → SRP — Split responsibilities
  ├── "I keep editing the same class to add features" → OCP — Make extensible
  ├── "Subclasses break when used as parent" → LSP — Fix inheritance hierarchy
  ├── "My interface has unused methods" → ISP — Split interfaces
  ├── "High-level code depends on low-level details" → DIP — Invert dependencies
  ├── "Changes ripple across many files" → Low Coupling — Reduce dependencies
  ├── "Related code is scattered everywhere" → High Cohesion — Group related code
  ├── "Switch statements everywhere" → Polymorphism — Replace with strategies
  └── "Simultaneously too many and too few classes" → YAGNI + AHA — Remove abstractions
```

### Refactoring Sequence

```
What to refactor first?
  1. Compilation errors and failing tests (must pass first)
  2. Pain points (features that are hard to add or bugs that are hard to fix)
  3. Violations with concrete symptoms (slow tests, deployment failures)
  4. Structural improvements (SRP, DIP) before performance
  5. Never refactor without tests covering the changed code
```

## Workflow

### Step 1: Evaluate SOLID Principles

**Single Responsibility Principle (SRP)**
- A class/module should have one, and only one, reason to change.
- Violation heuristics: class name contains `And`, `Or`, `Manager`, `Util`, `Helper`; class has >4 public methods operating on different data domains.
- Example: `OrderService` that both validates orders and emails invoices → split into `OrderValidator` and `InvoiceNotifier`.

```typescript
// BAD — SRP violation
class OrderService {
  validate(order: Order): boolean { /* ... */ }
  save(order: Order): Promise<void> { /* ... */ }
  sendInvoice(order: Order): Promise<void> { /* ... */ }
  printLabel(order: Order): string { /* ... */ }
}

// GOOD — each class has one reason to change
class OrderValidator { validate(order: Order): boolean { /* ... */ } }
class OrderRepository { save(order: Order): Promise<void> { /* ... */ } }
class InvoiceService { send(order: Order): Promise<void> { /* ... */ } }
class ShippingService { printLabel(order: Order): string { /* ... */ } }
```

**Open-Closed Principle (OCP)**
- Software entities should be open for extension, closed for modification.
- Achieve via polymorphism, strategy pattern, template method, dependency injection.
- Violation heuristics: `switch`/`if-else` chains on type codes; frequent editing of existing classes to add new behavior.

```typescript
// BAD — modifying existing code to add new payment type
function processPayment(type: string, amount: number) {
  if (type === 'credit') { /* ... */ }
  else if (type === 'paypal') { /* ... */ }
  // Adding new type requires editing this function
}

// GOOD — extend via new implementation
interface PaymentProcessor { process(amount: number): Promise<Result>; }
class CreditProcessor implements PaymentProcessor { /* ... */ }
class PayPalProcessor implements PaymentProcessor { /* ... */ }
// Add new types by implementing the interface
```

**Liskov Substitution Principle (LSP)**
- Subtypes must be substitutable for their base types without altering correctness.
- Violation heuristics: derived class throws `NotImplementedException`; derived class strengthens preconditions or weakens postconditions; `is`/`as` checks before using base type.

```typescript
// BAD — Square violates LSP for Rectangle
class Rectangle { setWidth(w: number) { this.width = w; } setHeight(h: number) { this.height = h; } }
class Square extends Rectangle {
  setWidth(w: number) { this.width = w; this.height = w; }  // Side effect!
  setHeight(h: number) { this.width = h; this.height = h; } // Breaks caller expectations
}

// GOOD — separate shapes with common interface
interface Shape { area(): number; }
class Rectangle implements Shape { constructor(public width: number, public height: number) {} }
class Square implements Shape { constructor(public side: number) {} }
```

**Interface Segregation Principle (ISP)**
- Clients should not be forced to depend on interfaces they do not use.
- Violation heuristics: interface has >3 methods where implementations throw `NotImplementedException` for some; fat interfaces with mixed responsibilities.

```typescript
// BAD — fat interface forces all implementations to have unused methods
interface Worker { work(): void; eat(): void; sleep(): void; }
class Robot implements Worker {
  work() { /* ... */ }
  eat() { throw new Error('Robots do not eat'); }  // ISP violation
  sleep() { throw new Error('Robots do not sleep'); }  // ISP violation
}

// GOOD — segregated interfaces
interface Workable { work(): void; }
interface Eatable { eat(): void; }
interface Sleepable { sleep(): void; }
class HumanWorker implements Workable, Eatable, Sleepable { /* ... */ }
class RobotWorker implements Workable { /* ... */ }
```

**Dependency Inversion Principle (DIP)**
- Depend on abstractions, not concretions. High-level modules should not depend on low-level modules.
- Violation heuristics: `new` keyword for services inside business logic; static method calls on concrete classes; direct file/system calls in domain code.

```typescript
// BAD — high-level depends on low-level concrete implementation
class OrderService {
  private repo = new PostgresOrderRepository();  // DIP violation
  private emailService = new SendGridEmailService();  // DIP violation
}

// GOOD — depends on abstractions, injected from outside
class OrderService {
  constructor(
    private repo: OrderRepository,
    private emailService: EmailService
  ) {}
}
```

### Step 2: Apply GRASP Patterns

| Pattern | Intent | Applies When |
|---------|--------|-------------|
| Information Expert | Assign responsibility to class with most data needed | Single class has all necessary info |
| Creator | Class A creates class B if A contains/composes/records B | Natural ownership exists |
| Controller | First object beyond UI that receives system events | Need to delegate from boundary to domain |
| Low Coupling | Assign responsibility to minimize dependencies | Two options exist, choose less coupled |
| High Cohesion | Assign responsibility keeping related operations together | Responsibilities span multiple unrelated areas |
| Polymorphism | Use polymorphic operations instead of type-based conditionals | Behavior varies by type |
| Pure Fabrication | Create artificial class when Expert pattern breaks SRP | No natural class fits responsibility |
| Indirection | Insert intermediary to decouple components | Direct coupling is too high |
| Protected Variations | Wrap unstable elements behind interface | External systems, third-party APIs, config |

```typescript
// Pure Fabrication example: no domain class handles DB operations
// Solution: create a Repository (pure fabrication)
interface OrderRepository {  // Pure Fabrication
  save(order: Order): Promise<void>;
  findById(id: string): Promise<Order | null>;
}

// Protected Variations: wrap external API behind interface
interface PaymentGateway {  // Protected Variations
  charge(amount: Money): Promise<PaymentResult>;
}
class StripeAdapter implements PaymentGateway { /* ... */ }
// Swapping Stripe for PayPal? Just write a new adapter.
```

### Step 3: Apply DRY / WET / AHA

- **DRY** (Don't Repeat Yourself): Every piece of knowledge must have a single, unambiguous representation. Violation = copy-paste code.
- **WET** (Write Everything Twice): Allowed temporarily during exploration. Must consolidate after stabilization.
- **AHA** (Avoid Hasty Abstractions): Prefer duplication over premature abstraction. Extract only after 3+ occurrences.

```typescript
// AHA: Wait for 3+ duplications before extracting
// First duplication: leave it (might be coincidence)
function calculateOrderTotal(items: OrderItem[]) { /* ... */ }
function calculateCartTotal(items: CartItem[]) { /* ... */ }

// Second duplication in different context: could be similar but not same
// Third duplication in same context: NOW extract
function calculateTotal(items: PricedItem[]): Money {
  return items.reduce((sum, item) => sum.add(item.price.multiply(item.quantity)), Money.zero());
}
```

### Step 4: Apply KISS / YAGNI

- **KISS** (Keep It Simple, Stupid): Simplest solution that passes all tests. No clever tricks, no premature optimization, no over-engineering.
- **YAGNI** (You Ain't Gonna Need It): Build only what is required now. Do not add hooks, extension points, or generalizations for speculated future needs.

```typescript
// BAD — YAGNI violation: building for future that may never come
interface PaymentProcessor {
  process(amount: Money): Promise<Result>;
  refund(transactionId: string): Promise<Result>;
  voidTransaction(transactionId: string): Promise<Result>;
  scheduleRecurring(amount: Money, interval: string): Promise<Result>;
  generateReport(start: Date, end: Date): Promise<Report>;
}
// Current requirement: process payments only.
// The other 4 methods are speculative.

// GOOD — only what's needed now
interface PaymentProcessor {
  process(amount: Money): Promise<Result>;
}
```

### Step 5: Apply Law of Demeter

- A unit should talk only to its immediate friends: itself, its fields, its method parameters, objects it creates.
- Violation heuristics: chained calls: `a.getB().getC().doSomething()`, train wrecks in general.

```typescript
// BAD — Law of Demeter violation
const city = order.getCustomer().getAddress().getCity();

// GOOD — tell, don't ask
class Order {
  getShippingCity(): string {
    return this.customer.getShippingAddress().city;
  }
}
// const city = order.getShippingCity();
```

### Step 6: Apply Composition over Inheritance

- Rule: Favor object composition over class inheritance.
- When to use inheritance: True `is-a` relationship, subclass does not override behavior negatively, no need to change behavior at runtime.
- When to use composition: Need runtime behavior swap, cross-cutting concerns, class hierarchy would be deep/complex.

```typescript
// BAD — deep inheritance hierarchy
class Bird { fly() { /* ... */ } }
class Duck extends Bird { quack() { /* ... */ } }
class RubberDuck extends Duck { fly() { /* throw */ } }  // Broken LSP

// GOOD — composition of behaviors
interface FlyBehavior { fly(): void; }
interface QuackBehavior { quack(): void; }
class Duck {
  constructor(private flyBehavior: FlyBehavior, private quackBehavior: QuackBehavior) {}
  performFly() { this.flyBehavior.fly(); }
  performQuack() { this.quackBehavior.quack(); }
}
// Can compose different behaviors at runtime
const mallard = new Duck(new FlyWithWings(), new Quack());
const rubber = new Duck(new FlyNoWay(), new Squeak());
```

### Step 7: Apply Encapsulation / Information Hiding

- Hide internal state and implementation details. Expose only stable interfaces.
- Rules: All fields private by default. No getters/setters for internal collections without defensive copies. Mutable state must be contained within single aggregate.

```typescript
// BAD — exposed internal state
class Order {
  items: OrderItem[];  // Direct access to array
  status: string;      // Direct mutation allowed
}

// GOOD — encapsulated state
class Order {
  private items: OrderItem[] = [];
  private status: OrderStatus = 'pending';

  addItem(item: OrderItem): void {
    if (this.status !== 'pending') throw new Error('Cannot modify confirmed order');
    this.items.push(item);
  }

  getItems(): ReadonlyArray<OrderItem> {
    return Object.freeze([...this.items]);  // Defensive copy
  }
}
```

### Step 8: Evaluate Coupling & Cohesion

| Metric | High (Good) | Low (Bad) |
|--------|-------------|-----------|
| Cohesion (within module) | Related operations grouped together | Unrelated operations in same class |
| Coupling (between modules) | Loose, depends on abstractions | Tight, depends on concrete implementations |

Target: High cohesion, loose coupling. Measure: a change in module A should affect at most 1-2 other modules on average.

## Violation Detection Heuristics

| Smell | Likely Violation | Fix |
|-------|-----------------|-----|
| Class name contains `Util`,`Helper`,`Manager`,`Or` | SRP | Split into focused classes |
| Switch/if-else on type codes | OCP, Polymorphism | Strategy pattern |
| Subclass throws NotImplementedException | LSP, ISP | Split interface, fix hierarchy |
| Constructor takes no parameters, creates dependencies inline | DIP | Constructor injection |
| Method chains > 2 dots | Law of Demeter | Tell, don't ask |
| Public fields or getters returning mutable references | Encapsulation | Private fields, defensive copies |
| Copy-pasted code blocks | DRY | Extract method/class |
| Unused parameters, abstract base classes with one subclass | YAGNI | Remove them |

## Design Patterns by Principle

### Patterns That Enforce SRP
| Pattern | Description | When |
|---------|-------------|------|
| **Facade** | Simplified interface to complex subsystem | Complex subsystem access |
| **Command** | Encapsulate request as object | Undoable operations, queuing |
| **Strategy** | Encapsulate interchangeable algorithms | Varying behavior by context |
| **Specification** | Business rules as composable objects | Complex validation logic |

### Patterns That Enforce OCP
| Pattern | Description | When |
|---------|-------------|------|
| **Strategy** | New algorithms via new implementations | Adding payment types, sort orders |
| **Template Method** | Skeleton in base, steps in subclasses | Algorithm with invariant steps |
| **Decorator** | Add behavior without modifying class | Cross-cutting concerns (logging, caching) |
| **Visitor** | New operations on existing hierarchy | Adding reporting to stable types |

### Patterns That Support DIP
| Pattern | Description | When |
|---------|-------------|------|
| **Dependency Injection** | Inject dependencies via constructor | All service classes |
| **Factory** | Abstract object creation | Conditional or complex construction |
| **Service Locator** | Centralized service registry | Legacy code migration (use DI preferrably) |
| **Abstract Factory** | Families of related objects | Cross-platform or theme-aware creation |

## Code Smell Detection in Practice

```typescript
// Heuristic-based code smell detection

interface CodeSmell {
  name: string;
  pattern: RegExp;
  severity: 'low' | 'medium' | 'high';
  principle: string;
  fix: string;
}

const codeSmells: CodeSmell[] = [
  {
    name: 'Primitive Obsession',
    pattern: /: string\s*\n/,
    severity: 'medium',
    principle: 'Encapsulation',
    fix: 'Wrap primitive in value object (Email, PhoneNumber, Money)',
  },
  {
    name: 'Data Clump',
    pattern: /\(.*address.*city.*zip.*\)/i,
    severity: 'medium',
    principle: 'DRY / High Cohesion',
    fix: 'Extract clump into Address value object',
  },
  {
    name: 'Switch Statement Smell',
    pattern: /switch\s*\(.*type|switch\s*\(.*kind/,
    severity: 'high',
    principle: 'OCP',
    fix: 'Replace with polymorphism / Strategy pattern',
  },
  {
    name: 'Feature Envy',
    pattern: /\w+\.get\w+\(\)\.\w+|get\w+\(\)\.get\w+\(\)/,
    severity: 'medium',
    principle: 'Information Expert / Low Coupling',
    fix: 'Move method to the class that has the data',
  },
  {
    name: 'Message Chain',
    pattern: /\.\w+\(\)\.\w+\(\)\.\w+\(\)/,
    severity: 'medium',
    principle: 'Law of Demeter',
    fix: 'Add delegating method to intermediate object',
  },
];
```

## Refactoring Plan Template

```typescript
// Ordered refactoring plan for a hypothetical OrderService
const refactoringPlan = [
  {
    step: 1,
    action: 'Extract OrderValidator from OrderService',
    files: ['src/orders/OrderService.ts', 'src/orders/OrderValidator.ts'],
    principle: 'SRP',
    risk: 'low',
    testCoverage: 'required before',
  },
  {
    step: 2,
    action: 'Replace payment switch statement with PaymentProcessorStrategy',
    files: ['src/orders/OrderService.ts', 'src/payments/PaymentProcessor.ts'],
    principle: 'OCP',
    risk: 'medium',
    testCoverage: 'required before and after',
  },
  {
    step: 3,
    action: 'Introduce OrderRepository interface for Database dependency inversion',
    files: ['src/orders/OrderService.ts', 'src/orders/OrderRepository.ts', 'src/orders/PostgresOrderRepository.ts'],
    principle: 'DIP',
    risk: 'medium',
    testCoverage: 'required after',
  },
  {
    step: 4,
    action: 'Replace boolean flags with discriminated union for order status',
    files: ['src/orders/Order.ts', 'src/orders/OrderStatus.ts'],
    principle: 'Encapsulation / OCP',
    risk: 'low',
    testCoverage: 'existing coverage sufficient',
  },
]; // Each step is reversible — can rollback independently
```

## Production Considerations

| Concern | Practice |
|---------|----------|
| Over-abstraction | AHA principle: wait for 3+ duplications before extracting |
| Performance vs purity | Pragmatic: violate principles for performance when measured, document the tradeoff |
| Team consistency | Use linters (eslint-plugin-sonarjs, tslint-sonarts) to enforce rules |
| Migration cost | Refactor in small, testable increments. Never big-bang refactor |
| Principle conflict | SRP vs Performance: sometimes a single class is faster. Choose based on measured need |
| Legacy code focus | Apply strangler pattern: write new code following principles, leave old code alone |
| YAGNI vs extensibility | Build for current needs only. Extract when patterns emerge, not when anticipated |

## Security Considerations

| Concern | Principle | Practice |
|---------|-----------|----------|
| Data exposure | Encapsulation | Never expose internal collections — use defensive copies |
| Injection | DIP | Validate all inputs before passing to dependencies |
| Authorization | SRP | Authorization logic belongs in dedicated guard classes, not mixed with business logic |
| Secret leakage | DIP | Inject secrets via config, never hardcode. Use Vault integration |
| Immutability | Encapsulation | Prefer readonly/immutable objects for data transfer — prevents accidental mutation |

## Performance Considerations

| Concern | Principle | Practice |
|---------|-----------|----------|
| Inline vs extracted | DRY | Hot path code may benefit from inlining despite DRY violation — document why |
| Polymorphism overhead | OCP | Virtual dispatch is cheap (<1µs). Profile before optimizing |
| Indirection cost | DIP | DI container overhead is ~10-100µs per resolution. Singleton scoping reduces it |
| Small objects | Encapsulation | Value objects create GC pressure. Pool or cache frequently created types |
| Defensive copying | Encapsulation | Copy-on-read can be expensive for large collections. Use ReadonlyCollection wrapper instead |

## Anti-Patterns

| Anti-Pattern | Why | Fix |
|---|---|---|
| God Class | One class does everything — violates SRP | Decompose into focused classes |
| Shotgun Surgery | One change affects many classes — low cohesion | Group related behavior together |
| Divergent Change | One class changed for different reasons — SRP violation | Split by change reason |
| Feature Envy | Method more interested in another class | Move method to the class it envies |
| Inappropriate Intimacy | Classes too familiar with each other's internals | Reduce coupling, use mediator |
| Lazy Class | Class does too little | Inline into client or merge with related class |
| Speculative Generality | Unused abstractions — YAGNI violation | Remove unused interfaces/classes |
| Message Chains | a.getB().getC().doSomething() — Law of Demeter | Add delegating methods |

## Rules
- No `Manager`, `Util`, or `Helper` classes — they indicate SRP violations.
- No `switch`/`if-else` on type codes — use polymorphism instead.
- No chained calls violating Law of Demeter — use method delegation.
- All fields private by default.
- Prefer composition over inheritance in all new code.
- No premature abstractions — wait for 3+ duplications before extracting.
- No speculatively generic code — build only for current requirements.
- DRY within a bounded context; OK to duplicate across contexts.
- Test for behavior, not implementation — tests should not break on refactor.
- Principle violations are acceptable when measured performance demands it — document the tradeoff.
- Code smell detection is automated (CI linting) for PR review.
- Refactoring without test coverage is not refactoring — it's rewriting.

## References
  - references/composition-vs-inheritance.md — Composition over Inheritance
  - references/grasp-patterns.md — GRASP Patterns
  - references/oop-solid.md — OOP SOLID Principles
  - references/principles-reference.md — Principles Reference
  - references/solid-deep-dive.md — SOLID Deep Dive
  - references/solid-examples.md — SOLID Code Examples
## Handoff
Hand off to `backend/universal/design-patterns/SKILL.md` if concrete pattern selection is required. Hand off to `backend/universal/clean-architecture/SKILL.md` if system architecture restructuring is needed.
