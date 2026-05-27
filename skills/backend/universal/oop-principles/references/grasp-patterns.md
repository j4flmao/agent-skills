# GRASP Patterns

## Overview
General Responsibility Assignment Software Patterns (GRASP): information expert, creator, controller, low coupling, high cohesion, polymorphism, pure fabrication, indirection, and protected variations.

## Information Expert

```typescript
// Anti-pattern: Invoice generator knows about item pricing
class InvoiceGenerator {
  generateInvoice(order: Order): Invoice {
    const total = order.items.reduce((sum, item) => {
      // Wrong: Invoice generator knows pricing rules
      return sum + item.quantity * item.product.price;
    }, 0);
    return new Invoice(order.id, total);
  }
}

// GRASP: Information Expert — Order knows its own total
class Order {
  get total(): Money {
    return this.items.reduce(
      (sum, item) => sum.add(item.subtotal),
      Money.zero('USD')
    );
  }
}

class InvoiceService {
  generateInvoice(order: Order): Invoice {
    // Order is the information expert for its own total
    return new Invoice(order.id, order.total);
  }
}
```

## Creator

```typescript
// GRASP Creator — Order creates OrderItems
class Order {
  private items: OrderItem[] = [];

  addItem(product: Product, quantity: number): void {
    // Order creates OrderItem because:
    // 1. Order contains OrderItems
    // 2. Order records OrderItems
    // 3. Order has the data needed (product, quantity)
    const item = new OrderItem(
      OrderItemId.generate(),
      product.id,
      quantity,
      product.price
    );
    this.items.push(item);
  }
}

// Creator decision table
// Factory: when creation is complex or needs special logic
class OrderFactory {
  static createFromCart(cart: Cart): Order {
    const order = new Order(OrderId.generate(), cart.customerId);
    for (const item of cart.items) {
      order.addItem(item.product, item.quantity);
    }
    return order;
  }
}
```

## Controller

```typescript
// Anti-pattern: UI directly calls domain logic
class CheckoutUI {
  async onSubmit(formData: CheckoutForm): Promise<void> {
    // Wrong: UI handles system events directly
    const order = new Order(OrderId.generate(), formData.customerId);
    for (const item of formData.items) {
      order.addItem(item.product, item.quantity);
    }
    await orderRepo.save(order);
    await paymentService.charge(order.total);
  }
}

// GRASP Controller — delegates to domain
class CheckoutController {
  constructor(
    private checkoutService: CheckoutService
  ) {}

  async submitOrder(req: HttpRequest): Promise<HttpResponse> {
    const result = await this.checkoutService.placeOrder({
      customerId: req.user.id,
      items: req.body.items,
      paymentMethod: req.body.paymentMethod,
    });
    return { status: 201, body: result };
  }
}

// Use case controller
class PlaceOrderUseCase {
  constructor(
    private orderRepo: OrderRepository,
    private paymentService: PaymentService,
    private inventoryService: InventoryService
  ) {}

  async execute(request: PlaceOrderRequest): Promise<OrderConfirmation> {
    const order = OrderFactory.createFromCart(request.cart, request.customer);
    order.place();

    await this.inventoryService.reserve(order.items);
    const payment = await this.paymentService.charge(order.total);
    order.confirmPayment(payment.id);

    await this.orderRepo.save(order);
    return new OrderConfirmation(order.id, payment.id);
  }
}
```

## Low Coupling / High Cohesion

```typescript
// Low cohesion, high coupling
class UserManager {
  constructor(
    private db: Database,
    private emailService: EmailService,
    private auditService: AuditService,
    private paymentService: PaymentService,
    private notificationService: NotificationService
  ) {}

  async registerUser(email: string): Promise<void> {
    const user = await this.db.save({ email });
    await this.emailService.sendWelcome(user);
    await this.auditService.log('user_registered', user.id);
    await this.notificationService.notifyAdmin('new_user', user);
  }

  async processPayment(userId: string, amount: number): Promise<void> {
    // Wrong: UserManager handles payments too
    const payment = await this.paymentService.charge(amount);
    await this.db.update({ userId, payment });
  }
}

// High cohesion, low coupling
class UserRegistrationService {
  constructor(
    private userRepo: UserRepository,
    private welcomeEmailSender: WelcomeEmailSender
  ) {}

  async register(request: RegisterRequest): Promise<User> {
    const user = await this.userRepo.save(User.fromRequest(request));
    await this.welcomeEmailSender.send(user);
    return user;
  }
}

class PaymentService {
  constructor(
    private paymentGateway: PaymentGateway,
    private paymentRepo: PaymentRepository
  ) {}

  async processCharge(request: ChargeRequest): Promise<PaymentResult> {
    const result = await this.paymentGateway.charge(request.amount);
    await this.paymentRepo.save(Payment.fromResult(result));
    return result;
  }
}
```

## Pure Fabrication

```typescript
// Problem: No natural class for persistence responsibility
// Information Expert says domain objects should handle it, but that breaks SRP

// Pure Fabrication — create an artificial class
class UserRepository {
  constructor(private db: Database) {}

  async findById(id: UserId): Promise<User | null> {
    const row = await this.db.query('SELECT * FROM users WHERE id = $1', [id]);
    return row ? User.fromDatabase(row) : null;
  }

  async save(user: User): Promise<void> {
    await this.db.execute(
      'INSERT INTO users (id, email, name) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET email = $2, name = $3',
      [user.id, user.email, user.name]
    );
  }
}

// Another Pure Fabrication: Service class
class UserService {
  constructor(
    private userRepo: UserRepository,
    private emailService: EmailService
  ) {}

  async changeEmail(userId: UserId, newEmail: Email): Promise<void> {
    const user = await this.userRepo.findById(userId);
    user.changeEmail(newEmail);
    await this.userRepo.save(user);
    await this.emailService.sendEmailChangedNotification(user);
  }
}
```

## Protected Variations

```typescript
// Wrap unstable elements behind an interface

// Unstable: third-party payment gateway
interface PaymentGateway {
  charge(amount: Money, source: PaymentSource): Promise<ChargeResult>;
  refund(chargeId: string): Promise<RefundResult>;
}

class StripePaymentGateway implements PaymentGateway {
  async charge(amount: Money, source: PaymentSource): Promise<ChargeResult> {
    const charge = await stripe.charges.create({
      amount: amount.toCents(),
      currency: amount.currency,
      source: source.token,
    });
    return ChargeResult.fromStripe(charge);
  }
}

// Stable domain code depends only on the abstraction
class PaymentProcessor {
  constructor(private gateway: PaymentGateway) {}

  async process(order: Order): Promise<PaymentResult> {
    const charge = await this.gateway.charge(order.total, order.paymentSource);
    return PaymentResult.fromCharge(charge);
  }
}

// Change gateway implementation without changing domain code
class SquarePaymentGateway implements PaymentGateway {
  async charge(amount: Money, source: PaymentSource): Promise<ChargeResult> {
    const payment = await square.payments.create({
      amount: BigInt(amount.toCents()),
      sourceId: source.id,
    });
    return ChargeResult.fromSquare(payment);
  }
}
```

## Key Points
- Information Expert: assign responsibility to the class with the most relevant data
- Creator: class B creates class A if B contains/composes/records A
- Controller: first object beyond UI that receives system events (use case controller)
- Low Coupling: assign responsibility to minimize dependencies between classes
- High Cohesion: keep related operations together within a class
- Polymorphism: use polymorphic operations instead of type-based conditionals
- Pure Fabrication: create artificial classes when no domain class fits (Repository, Service)
- Indirection: insert intermediary to decouple components (Mediator, Observer)
- Protected Variations: wrap unstable elements behind stable interfaces
