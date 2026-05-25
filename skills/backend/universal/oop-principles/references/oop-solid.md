# OOP SOLID Principles

## SOLID Principles Overview

| Principle | Name | Intent | Violation Smell |
|-----------|------|--------|-----------------|
| S | Single Responsibility | One reason to change | Classes named `Manager`, `Util`, `Helper` |
| O | Open-Closed | Open for extension, closed for modification | `switch`/`if-else` chains on type codes |
| L | Liskov Substitution | Subtypes replaceable for base types | `NotImplementedException` in derived class |
| I | Interface Segregation | No client forced to depend on unused methods | Fat interfaces with many `NotImplementedException` |
| D | Dependency Inversion | Depend on abstractions, not concretions | `new` keyword for services in business logic |

## Single Responsibility Principle

```typescript
// BAD — OrderService does too much
class OrderService {
  async createOrder(data: CreateOrderDto): Promise<Order> {
    // Validation
    if (!data.email.includes('@')) throw new Error('Invalid email');
    // Business logic
    const order = new Order(data);
    // Persistence
    await this.db.save(order);
    // Notification
    await this.email.send(order.customerEmail, 'Order created');
    return order;
  }
}

// GOOD — Separated responsibilities
class OrderValidator {
  validate(data: CreateOrderDto): ValidationResult { /* ... */ }
}
class OrderFactory {
  create(data: CreateOrderDto): Order { /* ... */ }
}
class OrderRepository {
  async save(order: Order): Promise<void> { /* ... */ }
}
class OrderNotificationService {
  async notifyCreated(order: Order): Promise<void> { /* ... */ }
}
class CreateOrderUseCase {
  constructor(
    private validator: OrderValidator,
    private factory: OrderFactory,
    private repo: OrderRepository,
    private notification: OrderNotificationService,
  ) {}
  async execute(data: CreateOrderDto): Promise<Order> {
    // Orchestrates without doing everything itself
  }
}
```

## Open-Closed Principle

```typescript
// BAD — modification required for each new payment type
class PaymentProcessor {
  process(type: string, amount: number): void {
    if (type === 'credit') { /* process credit */ }
    else if (type === 'debit') { /* process debit */ }
    else if (type === 'paypal') { /* process paypal */ }
    // Adding new type requires modifying this class
  }
}

// GOOD — open for extension, closed for modification
interface IPaymentMethod {
  process(amount: number): PaymentResult;
}

class CreditPayment implements IPaymentMethod {
  process(amount: number): PaymentResult { /* ... */ }
}

class PayPalPayment implements IPaymentMethod {
  process(amount: number): PaymentResult { /* ... */ }
}

class PaymentProcessor {
  constructor(private methods: Map<string, IPaymentMethod>) {}
  process(type: string, amount: number): PaymentResult {
    const method = this.methods.get(type);
    if (!method) throw new Error(`Unknown payment type: ${type}`);
    return method.process(amount);
  }
}
// Adding new type: create new class, register in map — no modification of PaymentProcessor
```

## Liskov Substitution Principle

```typescript
// BAD — Square extends Rectangle, violates LSP
class Rectangle {
  constructor(protected width: number, protected height: number) {}
  setWidth(w: number): void { this.width = w; }
  setHeight(h: number): void { this.height = h; }
  getArea(): number { return this.width * this.height; }
}

class Square extends Rectangle {
  setWidth(w: number): void {
    this.width = w;
    this.height = w; // Side effect violates base class contract
  }
  setHeight(h: number): void {
    this.width = h; // Side effect violates base class contract
    this.height = h;
  }
}

// Client code breaks:
function resizeRectangle(rect: Rectangle): void {
  rect.setWidth(5);
  rect.setHeight(10);
  // Expects area = 50, but Square gives area = 100
}

// GOOD — Avoid problematic inheritance
interface IShape {
  getArea(): number;
}
class Rectangle implements IShape {
  constructor(private width: number, private height: number) {}
  getArea(): number { return this.width * this.height; }
}
class Square implements IShape {
  constructor(private side: number) {}
  getArea(): number { return this.side * this.side; }
}
```

## Interface Segregation Principle

```typescript
// BAD — Fat interface
interface IWorker {
  work(): void;
  eat(): void;
  sleep(): void;
}

class HumanWorker implements IWorker {
  work() { /* works */ }
  eat() { /* eats */ }
  sleep() { /* sleeps */ }
}

class RobotWorker implements IWorker {
  work() { /* works */ }
  eat() { throw new Error('Robots do not eat'); }  // VIOLATION
  sleep() { throw new Error('Robots do not sleep'); }  // VIOLATION
}

// GOOD — Segregated interfaces
interface IWorkable {
  work(): void;
}
interface IFeedable {
  eat(): void;
}
interface ISleepable {
  sleep(): void;
}

class HumanWorker implements IWorkable, IFeedable, ISleepable {
  work() { /* works */ }
  eat() { /* eats */ }
  sleep() { /* sleeps */ }
}

class RobotWorker implements IWorkable {
  work() { /* works */ }
}
```

## Dependency Inversion Principle

```typescript
// BAD — High-level depends on low-level
class OrderService {
  private db = new PostgreSQLDatabase();  // Direct dependency
  async getOrder(id: string): Promise<Order> {
    return this.db.query(`SELECT * FROM orders WHERE id = $1`, [id]);
  }
}

// GOOD — Both depend on abstractions
interface IOrderRepository {
  findById(id: string): Promise<Order | null>;
  save(order: Order): Promise<void>;
}

class PostgreSQLOrderRepository implements IOrderRepository {
  async findById(id: string): Promise<Order | null> { /* ... */ }
  async save(order: Order): Promise<void> { /* ... */ }
}

class OrderService {
  constructor(private orderRepo: IOrderRepository) {}  // Depends on abstraction
  async getOrder(id: string): Promise<Order | null> {
    return this.orderRepo.findById(id);
  }
}
```

## SOLID Detection Heuristics

```yaml
heuristics:
  srp_violations:
    - "Class name contains 'And', 'Or', 'Manager', 'Util', 'Helper'"
    - "Class has > 4 public methods operating on different domains"
    - "Class has > 200 lines of code"

  ocp_violations:
    - "switch/if-else chain checking type/type code"
    - "Same method edited frequently for new variants"

  lsp_violations:
    - "Derived class throws NotImplementedException"
    - "Derived class has empty method body"
    - "Type check (instanceof, typeof) before using base type"

  isp_violations:
    - "Interface has > 3 methods and implementations throw for some"
    - "Client depends on methods it doesn't use"

  dip_violations:
    - "new keyword for services/ repositories in business logic"
    - "Static method calls on concrete infrastructure classes"
    - "Using File, Database, HttpClient directly in domain code"
```

## Principles Interaction

```
DIP enables OCP (depend on abstractions to extend without modifying)
ISP enables LSP (small interfaces reduce substitutability issues)
SRP supports ISP (single responsibility leads to focused interfaces)
OCP + DIP = Plugin Architecture
SRP + ISP = Microservices
All five = Testable, maintainable code
```
