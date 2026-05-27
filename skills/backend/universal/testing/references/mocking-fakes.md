# Mocking and Test Doubles

## Test Double Types

### Mock vs Stub vs Fake vs Spy
```typescript
// Stub: Returns fixed values
const userRepositoryStub = {
  findById: async (id: string) => ({
    id,
    name: 'Test User',
    email: 'test@example.com',
  }),
};

// Mock: Verifies interactions
const emailServiceMock = {
  sendWelcomeEmail: jest.fn(),
};

// Fake: Working implementation for testing
class InMemoryUserRepository implements UserRepository {
  private users: Map<string, User> = new Map();

  async save(user: User): Promise<void> {
    this.users.set(user.id, user);
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email === email) return user;
    }
    return null;
  }
}

// Spy: Records calls for verification
class LoggerSpy implements Logger {
  public calls: Array<{ level: string; message: string }> = [];

  info(message: string): void {
    this.calls.push({ level: 'info', message });
  }

  error(message: string): void {
    this.calls.push({ level: 'error', message });
  }
}
```

## Mocking Boundaries

### What to Mock vs What Not to Mock
```typescript
// Mock at boundaries
interface PaymentGateway {
  charge(amount: number, token: string): Promise<ChargeResult>;
}

interface EmailSender {
  send(to: string, subject: string, body: string): Promise<void>;
}

interface MessageQueue {
  publish(topic: string, message: any): Promise<void>;
}

// Do NOT mock
class Money {
  constructor(public amount: number, public currency: string) {}

  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error('Currency mismatch');
    }
    return new Money(this.amount + other.amount, this.currency);
  }
}

class Email {
  constructor(public to: string, public subject: string, public body: string) {}

  validate(): boolean {
    return this.to.includes('@') && this.subject.length > 0;
  }
}
```

## Mocking Frameworks

### Jest Mocks
```typescript
// Auto-mock module
jest.mock('../services/payment-service');

// Manual mock
jest.mock('../services/email-service', () => ({
  EmailService: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue(true),
    sendBatch: jest.fn().mockResolvedValue(['id1', 'id2']),
  })),
}));

// Partial mock
const userService = jest.createMockFromModule('../services/user-service');
userService.getUser.mockImplementation((id: string) => ({
  id,
  name: 'Mocked User',
}));

// Spy on existing object
const logger = new Logger();
const infoSpy = jest.spyOn(logger, 'info');
```

### Sinon.js (Node.js)
```javascript
const sinon = require('sinon');

// Stub
const stub = sinon.stub().resolves({ id: '123' });

// Mock with expectations
const mock = sinon.mock(paymentGateway);
mock.expects('charge')
  .once()
  .withArgs(100, 'tok_xxx')
  .resolves({ success: true });

// Spy
const spy = sinon.spy(cache, 'get');
```

### Mockito (Java)
```java
// Mock creation
@Mock
private UserRepository userRepository;

@Mock
private EmailService emailService;

@InjectMocks
private RegistrationService registrationService;

// Stubbing
when(userRepository.findByEmail("test@test.com"))
    .thenReturn(Optional.of(user));

when(userRepository.save(any()))
    .thenReturn(user);

// Verification
verify(emailService, times(1))
    .sendWelcomeEmail(user.getId());

verify(userRepository, never())
    .delete(any());
```

### unittest.mock (Python)
```python
from unittest.mock import Mock, patch, MagicMock

# Mock object
payment_gateway = Mock()
payment_gateway.charge.return_value = {"success": True}
payment_gateway.charge.side_effect = ValueError("Card declined")

# Patch decorator
@patch("services.email.EmailService.send")
def test_send_welcome_email(mock_send):
    mock_send.return_value = True
    service = RegistrationService()
    service.send_welcome("user@test.com")
    mock_send.assert_called_once_with("user@test.com", "Welcome!", any())

# Context manager
with patch("services.payment.PaymentGateway.charge") as mock_charge:
    mock_charge.return_value = {"success": True}
    result = payment_service.process_payment(100, "tok_xxx")
```

## Anti-Patterns

### What NOT to Do
```typescript
// BAD: Mocking value objects
const moneyMock = {
  amount: 100,
  currency: 'USD',
  add: jest.fn(),
};
// Value objects should be real objects in tests

// BAD: Mocking everything
const orderServiceMock = {
  createOrder: jest.fn(),
  cancelOrder: jest.fn(),
  getOrder: jest.fn(),
};
// Only mock boundary interfaces, not the service under test

// BAD: Over-specifying interactions
it('should call repository with correct parameters', async () => {
  const repo = { save: jest.fn() };
  const service = new OrderService(repo);

  await service.createOrder(input);

  expect(repo.save).toHaveBeenCalledWith(
    expect.objectContaining({
      id: expect.any(String),
      items: expect.arrayContaining([
        expect.objectContaining({ productId: '123' }),
      ]),
    })
  );
});
// This tests implementation details, not behavior

// BAD: Mocking what you don't own
jest.mock('aws-sdk', () => ({
  DynamoDB: { DocumentClient: jest.fn() },
}));
// Mock your adapter layer, not third-party libraries directly
```

## Integration Test Factories

### Test Data Builders
```typescript
class UserBuilder {
  private id = uuid();
  private name = 'Default Name';
  private email = 'default@example.com';
  private role = 'user';
  private createdAt = new Date();

  withId(id: string): this {
    this.id = id;
    return this;
  }

  withName(name: string): this {
    this.name = name;
    return this;
  }

  withEmail(email: string): this {
    this.email = email;
    return this;
  }

  asAdmin(): this {
    this.role = 'admin';
    return this;
  }

  build(): User {
    return new User(this.id, this.name, this.email, this.role, this.createdAt);
  }

  static create(): UserBuilder {
    return new UserBuilder();
  }
}

// Usage in tests
const admin = UserBuilder.create()
  .withName('Admin User')
  .asAdmin()
  .build();

const specificUser = UserBuilder.create()
  .withEmail('test@example.com')
  .build();
```

## Key Points
- Mock at boundary interfaces (repository, external API, message queue, email)
- Never mock value objects, domain entities, or language primitives
- Use fakes (in-memory implementations) instead of mocks when possible
- Use spies to verify side effects (logging, email sending, event publishing)
- Follow the one mock per test principle to keep tests focused
- Avoid over-specifying interaction details — test behavior, not calls
- Use test data builders for clean and maintainable test setup
- Mock external services, not framework internals or libraries
- Use verified fakes that match real implementation behavior
- Keep mock setups close to the assertions they support
