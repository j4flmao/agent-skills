# Testing Design Patterns

## Overview
Design patterns applied to testing: test doubles, test structure patterns, assertion patterns, parameterized testing, test fixtures, and test organization.

## Test Double Patterns

```typescript
// Dummy — passed but never used
class DummyEmailService implements EmailService {
  async send(_to: string, _body: string): Promise<void> {
    // No-op for testing
  }
}

// Stub — returns canned answers
class StubProductRepository implements ProductRepository {
  private products: Map<string, Product> = new Map();

  constructor() {
    this.products.set('prod-1', new Product('prod-1', 'Test Product', 29.99));
  }

  async findById(id: string): Promise<Product | null> {
    return this.products.get(id) ?? null;
  }
}

// Spy — records interactions
class SpyEmailService implements EmailService {
  public sentEmails: Array<{ to: string; subject: string }> = [];

  async send(to: string, subject: string): Promise<void> {
    this.sentEmails.push({ to, subject });
  }

  wasEmailSentTo(to: string): boolean {
    return this.sentEmails.some(e => e.to === to);
  }

  emailCount(): number {
    return this.sentEmails.length;
  }
}

// Mock — pre-programmed expectations
class MockPaymentGateway implements PaymentGateway {
  private expectedCalls: Array<{
    amount: number;
    shouldSucceed: boolean;
  }> = [];

  expectCharge(amount: number, shouldSucceed: boolean): void {
    this.expectedCalls.push({ amount, shouldSucceed });
  }

  async charge(amount: number): Promise<PaymentResult> {
    const expected = this.expectedCalls.shift();
    if (!expected) throw new Error('Unexpected call to charge()');
    if (expected.amount !== amount) throw new Error('Unexpected amount');
    return expected.shouldSucceed
      ? PaymentResult.success('txn-123')
      : PaymentResult.failure('insufficient_funds');
  }

  verify(): void {
    if (this.expectedCalls.length > 0) {
      throw new Error(`${this.expectedCalls.length} expected calls not made`);
    }
  }
}

// Fake — working implementation but unsuitable for production
class FakeUserRepository implements UserRepository {
  private users: Map<string, User> = new Map();

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async save(user: User): Promise<void> {
    this.users.set(user.id, user);
  }
}
```

## Test Structure Patterns

```typescript
// AAA Pattern (Arrange, Act, Assert)
describe('OrderService.submitOrder', () => {
  it('processes valid order', async () => {
    // Arrange
    const order = new Order(OrderId.generate(), CustomerId.generate());
    order.addItem(new Product('p1', 'Widget', 10), 2);
    const repo = new FakeOrderRepository();
    const service = new OrderService(repo, new StubPaymentGateway());

    // Act
    await service.submitOrder(order.id);

    // Assert
    const saved = await repo.findById(order.id);
    expect(saved?.status).toBe(OrderStatus.SUBMITTED);
  });
});

// Given-When-Then Pattern
describe('Shopping Cart', () => {
  it('calculates total with discounts', () => {
    // Given a cart with items and a 10% discount
    const cart = new ShoppingCart()
      .addItem(new Product('p1', 'A', 100), 1)
      .addItem(new Product('p2', 'B', 50), 2);
    const discount = new PercentageDiscount(10);

    // When discount is applied
    const total = cart.applyDiscount(discount);

    // Then total should be 180 (200 - 20)
    expect(total.amount).toBe(180);
  });
});

// SUT (System Under Test) Pattern
describe('SUT: EmailNotificationService', () => {
  let sut: EmailNotificationService;
  let spyEmail: SpyEmailService;
  let stubTemplate: StubTemplateEngine;

  beforeEach(() => {
    spyEmail = new SpyEmailService();
    stubTemplate = new StubTemplateEngine();
    sut = new EmailNotificationService(spyEmail, stubTemplate);
  });

  it('sends welcome email', async () => {
    await sut.sendWelcome('user@example.com');
    expect(spyEmail.wasEmailSentTo('user@example.com')).toBe(true);
  });
});
```

## Parameterized Testing Pattern

```typescript
describe('Price Calculation', () => {
  it.each([
    { subtotal: 100, taxRate: 0.08, shipping: 10, expected: 118 },
    { subtotal: 50, taxRate: 0.10, shipping: 5, expected: 60 },
    { subtotal: 200, taxRate: 0.00, shipping: 0, expected: 200 },
    { subtotal: 0, taxRate: 0.08, shipping: 10, expected: 10 },
  ])('calculates final price: $subtotal + $taxRate tax + $shipping = $expected', ({
    subtotal, taxRate, shipping, expected,
  }) => {
    const result = calculatePrice(subtotal, taxRate, shipping);
    expect(result).toBe(expected);
  });
});

// Property-based testing pattern
describe('String Reversal (property-based)', () => {
  it('reversing twice returns original', () => {
    const property = forAll(
      arbitrary.string(),
      (str) => reverse(reverse(str)) === str
    );
    expect(property).toBeTruthy();
  });

  it('reversing preserves length', () => {
    const property = forAll(
      arbitrary.string(),
      (str) => reverse(str).length === str.length
    );
    expect(property).toBeTruthy();
  });
});

// Data-driven test pattern
const ORDER_STATUS_TRANSITIONS = [
  { from: OrderStatus.PENDING, action: 'submit', to: OrderStatus.SUBMITTED },
  { from: OrderStatus.SUBMITTED, action: 'confirm', to: OrderStatus.CONFIRMED },
  { from: OrderStatus.CONFIRMED, action: 'ship', to: OrderStatus.SHIPPED },
  { from: OrderStatus.SHIPPED, action: 'deliver', to: OrderStatus.DELIVERED },
];

describe('Order Status Transitions', () => {
  it.each(ORDER_STATUS_TRANSITIONS)(
    '$from -> $action -> $to',
    ({ from, action, to }) => {
      const order = createOrderWithStatus(from);
      (order as any)[action]();
      expect(order.status).toBe(to);
    }
  );
});
```

## Test Fixture Pattern

```typescript
// Object Mother pattern
class OrderMother {
  static pending(): Order {
    const order = new Order(OrderId.generate(), CustomerId.generate());
    order.addItem(ProductMother.simple(), 1);
    return order;
  }

  static withItems(itemCount: number): Order {
    const order = this.pending();
    for (let i = 0; i < itemCount - 1; i++) {
      order.addItem(ProductMother.simple(), 1);
    }
    return order;
  }

  static withHighValue(): Order {
    const order = new Order(OrderId.generate(), CustomerId.generate());
    order.addItem(ProductMother.premium(), 10);
    return order;
  }
}

// Test Data Builder pattern
class OrderBuilder {
  private id = OrderId.generate();
  private customerId = CustomerId.generate();
  private items: OrderItem[] = [];
  private status = OrderStatus.PENDING;

  withId(id: OrderId): this { this.id = id; return this; }
  withCustomer(id: CustomerId): this { this.customerId = id; return this; }
  withStatus(status: OrderStatus): this { this.status = status; return this; }
  addItem(product: Product, quantity: number): this {
    const item = new OrderItem(OrderItemId.generate(), product.id, quantity, product.price);
    this.items.push(item);
    return this;
  }

  build(): Order {
    const order = new Order(this.id, this.customerId);
    (order as any).items = this.items;
    (order as any).status = this.status;
    return order;
  }
}

// Usage
const order = new OrderBuilder()
  .withStatus(OrderStatus.SUBMITTED)
  .addItem(new Product('p1', 'Widget', 10), 2)
  .addItem(new Product('p2', 'Gadget', 25), 1)
  .build();
```

## Test Organization Patterns

```typescript
// Test Suite Organization
describe('OrderService', () => {
  // Shared context setup
  let sut: OrderService;
  let orderRepo: FakeOrderRepository;
  let paymentGateway: MockPaymentGateway;

  beforeAll(() => {
    // One-time setup (expensive, shared resources)
  });

  beforeEach(() => {
    // Fresh setup per test
    orderRepo = new FakeOrderRepository();
    paymentGateway = new MockPaymentGateway();
    sut = new OrderService(orderRepo, paymentGateway);
  });

  // Group related tests
  describe('submission', () => {
    it('succeeds for valid order');
    it('fails for empty order');
    it('fails for already submitted order');
  });

  describe('cancellation', () => {
    it('succeeds for pending order');
    it('fails for delivered order');
  });

  // Clean up test-specific resources
  afterEach(() => {
    paymentGateway.verify();
  });

  afterAll(() => {
    // Clean up shared resources
  });
});
```

## Key Points
- Use appropriate test doubles: Dummy, Stub, Spy, Mock, Fake
- Structure tests with AAA (Arrange, Act, Assert) or Given-When-Then
- Use parameterized tests to cover multiple scenarios without duplication
- Apply Object Mother or Test Data Builder for complex fixtures
- Organize tests by feature or behavior, not by method
- Use property-based testing for invariant verification
- Clean up test doubles (mocks) in afterEach to verify expectations
