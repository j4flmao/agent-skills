# SOLID Code Examples

## Overview
Practical SOLID principle examples: violations and refactored solutions for each of the five SOLID principles with real-world scenarios.

## Single Responsibility Principle (SRP)

```typescript
// Violation: OrderService handles orders AND email AND logging
class OrderService {
  async placeOrder(request: PlaceOrderRequest): Promise<Order> {
    const order = new Order(request);
    await this.db.save(order);

    // SRP violation: email logic
    const emailBody = `Order ${order.id} placed for ${request.customerEmail}`;
    await this.emailClient.send(request.customerEmail, 'Order Confirmed', emailBody);

    // SRP violation: logging
    this.logger.log(`Order ${order.id} placed: ${JSON.stringify(order)}`);

    // SRP violation: analytics
    await this.analytics.track('order_placed', { orderId: order.id });

    return order;
  }
}

// Refactored — each concern has its own class
class OrderPlacer {
  constructor(
    private orderRepo: OrderRepository,
    private eventPublisher: EventPublisher
  ) {}

  async place(request: PlaceOrderRequest): Promise<Order> {
    const order = Order.create(request);
    await this.orderRepo.save(order);
    await this.eventPublisher.publish(new OrderPlacedEvent(order));
    return order;
  }
}

class OrderPlacedHandler {
  constructor(
    private emailService: EmailService,
    private logger: Logger,
    private analytics: AnalyticsTracker
  ) {}

  async handle(event: OrderPlacedEvent): Promise<void> {
    await Promise.all([
      this.emailService.sendConfirmation(event.order),
      this.logger.info('Order placed', { orderId: event.order.id }),
      this.analytics.track('order_placed', { orderId: event.order.id }),
    ]);
  }
}
```

## Open-Closed Principle (OCP)

```typescript
// Violation: adding new payment method requires modifying existing code
class PaymentProcessor {
  process(order: Order, method: string): void {
    switch (method) {
      case 'credit_card':
        this.chargeCard(order.total.amount, order.payment.cardNumber);
        break;
      case 'paypal':
        this.chargePayPal(order.total.amount, order.payment.paypalEmail);
        break;
      // OCP violation: adding Apple Pay requires new case
      case 'apple_pay':
        this.chargeApplePay(order.total.amount, order.payment.applePayToken);
        break;
    }
  }
}

// Refactored — open for extension, closed for modification
interface PaymentStrategy {
  process(amount: Money, details: PaymentDetails): Promise<PaymentResult>;
}

class CreditCardPayment implements PaymentStrategy {
  async process(amount: Money, details: PaymentDetails): Promise<PaymentResult> {
    return paymentGateway.charge(amount, { cardNumber: details.cardNumber, cvv: details.cvv });
  }
}

class PayPalPayment implements PaymentStrategy {
  async process(amount: Money, details: PaymentDetails): Promise<PaymentResult> {
    return paypalClient.createPayment(amount, details.email);
  }
}

// New payment type — just add a new class, no existing code changes
class ApplePayPayment implements PaymentStrategy {
  async process(amount: Money, details: PaymentDetails): Promise<PaymentResult> {
    return applePayClient.processPayment(amount, details.token);
  }
}

class PaymentProcessor {
  private strategies: Map<string, PaymentStrategy> = new Map();

  registerStrategy(method: string, strategy: PaymentStrategy): void {
    this.strategies.set(method, strategy);
  }

  async process(order: Order): Promise<PaymentResult> {
    const strategy = this.strategies.get(order.paymentMethod);
    if (!strategy) throw new Error(`Unsupported payment method: ${order.paymentMethod}`);
    return strategy.process(order.total, order.payment);
  }
}
```

## Liskov Substitution Principle (LSP)

```typescript
// Violation: Square extends Rectangle but breaks behavior
class Rectangle {
  constructor(protected width: number, protected height: number) {}

  setWidth(w: number): void { this.width = w; }
  setHeight(h: number): void { this.height = h; }
  get area(): number { return this.width * this.height; }
}

class Square extends Rectangle {
  setWidth(w: number): void {
    this.width = w;
    this.height = w; // LSP violation: strengthens postcondition
  }
  setHeight(h: number): void {
    this.height = h;
    this.width = h; // LSP violation: strengthens postcondition
  }
}

// Client code breaks with Square
function resize(rect: Rectangle): void {
  rect.setWidth(5);
  rect.setHeight(4);
  // Expects area = 20, but Square gives 16
  console.assert(rect.area === 20);
}

// Refactored — use a common abstraction
interface Shape {
  readonly area: number;
}

class RectangleV2 implements Shape {
  constructor(public readonly width: number, public readonly height: number) {}
  get area(): number { return this.width * this.height; }
}

class SquareV2 implements Shape {
  constructor(public readonly side: number) {}
  get area(): number { return this.side * this.side; }
}
```

## Interface Segregation Principle (ISP)

```typescript
// Violation: fat interface
interface Worker {
  work(): void;
  eat(): void;
  sleep(): void;
  attendMeeting(): void;
}

class Robot implements Worker {
  work(): void { /* OK */ }
  eat(): void { throw new Error('Robots do not eat'); } // ISP violation
  sleep(): void { throw new Error('Robots do not sleep'); } // ISP violation
  attendMeeting(): void { /* Can attend if connected */ }
}

// Refactored — segregated interfaces
interface Workable {
  work(): void;
}

interface Eatable {
  eat(): void;
}

interface Sleepable {
  sleep(): void;
}

interface MeetingAttendable {
  attendMeeting(): void;
}

class HumanWorker implements Workable, Eatable, Sleepable, MeetingAttendable {
  work(): void { /* works */ }
  eat(): void { /* eats lunch */ }
  sleep(): void { /* sleeps 8h */ }
  attendMeeting(): void { /* attends standup */ }
}

class RobotWorker implements Workable, MeetingAttendable {
  work(): void { /* works 24/7 */ }
  attendMeeting(): void { /* connects via video */ }
}
```

## Dependency Inversion Principle (DIP)

```typescript
// Violation: high-level depends on low-level concretions
class OrderService {
  private db = new PostgresDatabase(); // DIP violation: depends on concrete
  private emailer = new SmtpEmailService(); // DIP violation: depends on concrete
  private logger = new FileLogger(); // DIP violation: depends on concrete

  async process(order: Order): Promise<void> {
    await this.db.save(order);
    await this.emailer.send(order.customerEmail, 'Order processed');
    this.logger.log(`Order ${order.id} processed`);
  }
}

// Refactored — depend on abstractions
interface OrderRepository {
  save(order: Order): Promise<void>;
  findById(id: string): Promise<Order | null>;
}

interface NotificationService {
  send(to: string, subject: string, body: string): Promise<void>;
}

interface Logger {
  log(message: string, metadata?: Record<string, unknown>): void;
}

class OrderServiceV2 {
  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly notificationService: NotificationService,
    private readonly logger: Logger
  ) {}

  async process(order: Order): Promise<void> {
    await this.orderRepo.save(order);
    await this.notificationService.send(
      order.customerEmail,
      'Order processed',
      `Your order ${order.id} has been processed.`
    );
    this.logger.info('Order processed', { orderId: order.id });
  }
}
```

## Key Points
- SRP: one reason to change per class — separate persistence, notification, logging
- OCP: use strategy/template method patterns — extend behavior without modifying
- LSP: subtypes must be substitutable — don't strengthen preconditions/weaken postconditions
- ISP: small focused interfaces — clients shouldn't depend on methods they don't use
- DIP: inject abstractions at construction time — don't create concretions inside high-level code
