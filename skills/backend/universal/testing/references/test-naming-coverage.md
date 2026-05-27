# Test Naming and Coverage

## Naming Conventions

### Structure
```typescript
describe('OrderService', () => {
  describe('createOrder', () => {
    it('should return created order when input is valid', () => {});
    it('should throw validation error when email is invalid', () => {});
    it('should throw not found when product does not exist', () => {});
    it('should calculate total correctly when discount applied', () => {});
  });

  describe('cancelOrder', () => {
    it('should mark order as cancelled when order is pending', () => {});
    it('should throw conflict when order is already shipped', () => {});
    it('should refund payment when order was paid', () => {});
  });
});
```

### Naming Pattern: should_{expected}_when_{condition}
```typescript
// Good
it('should return 400 when email is missing', () => {});
it('should return user list when page is requested', () => {});
it('should throw error when product is out of stock', () => {});

// Bad
it('test_email_validation', () => {});
it('test_user_list', () => {});
it('unit_test_1', () => {});
```

## AAA Pattern

### Arrange-Act-Assert
```typescript
describe('UserRegistration', () => {
  it('should create user when all fields are valid', async () => {
    // Arrange
    const registrationService = new RegistrationService();
    const validUser = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      name: 'Test User',
    };

    // Act
    const result = await registrationService.register(validUser);

    // Assert
    expect(result).toBeDefined();
    expect(result.email).toBe('test@example.com');
    expect(result.id).toBeDefined();
  });

  it('should throw when email is already registered', async () => {
    // Arrange
    const repo = new InMemoryUserRepository();
    await repo.save(createUser({ email: 'existing@example.com' }));
    const service = new RegistrationService(repo);

    // Act & Assert
    await expect(
      service.register({ email: 'existing@example.com', password: 'Pass123!' })
    ).rejects.toThrow(DuplicateEmailError);
  });
});
```

## Coverage Targets

### Coverage Configuration
```json
{
  "jest": {
    "collectCoverageFrom": [
      "src/**/*.ts",
      "!src/**/*.test.ts",
      "!src/**/*.spec.ts",
      "!src/generated/**"
    ],
    "coverageThreshold": {
      "global": {
        "branches": 70,
        "functions": 80,
        "lines": 80,
        "statements": 80
      },
      "src/domain/**": {
        "branches": 90,
        "functions": 95,
        "lines": 95
      },
      "src/application/**": {
        "branches": 80,
        "functions": 85,
        "lines": 85
      }
    }
  }
}
```

## Mutation Testing

### Stryker Configuration
```json
{
  "stryker-config": {
    "mutate": ["src/**/*.ts", "!src/**/*.test.ts"],
    "testRunner": "jest",
    "reporters": ["progress", "html", "json"],
    "thresholds": {
      "high": 80,
      "low": 60,
      "break": 50
    },
    "mutator": {
      "plugins": []
    },
    "timeoutMs": 5000
  }
}
```

## Behavior-Driven Tests

### Given-When-Then Pattern
```typescript
describe('ShoppingCart', () => {
  describe('adding items', () => {
    it('should increment item count when product is added', () => {
      // Given
      const cart = new ShoppingCart();
      const product = new Product('123', 'Widget', 10.99);

      // When
      cart.addItem(product, 2);

      // Then
      expect(cart.itemCount).toBe(2);
      expect(cart.total).toBe(21.98);
    });

    it('should update quantity when same product is added twice', () => {
      // Given
      const cart = new ShoppingCart();
      const product = new Product('123', 'Widget', 10.99);

      // When
      cart.addItem(product, 1);
      cart.addItem(product, 2);

      // Then
      expect(cart.items).toHaveLength(1);
      expect(cart.items[0].quantity).toBe(3);
    });
  });

  describe('checking out', () => {
    it('should complete checkout when cart is not empty', () => {
      // Given
      const cart = new ShoppingCart();
      cart.addItem(new Product('123', 'Widget', 10.99), 1);
      const payment = new PaymentService();

      // When
      const result = cart.checkout(payment);

      // Then
      expect(result.success).toBe(true);
      expect(cart.isEmpty()).toBe(true);
    });

    it('should fail when cart is empty', () => {
      // Given
      const cart = new ShoppingCart();
      const payment = new PaymentService();

      // When
      const act = () => cart.checkout(payment);

      // Then
      expect(act).toThrow('Cannot checkout empty cart');
    });
  });
});
```

## Key Points
- Use descriptive test names following should_{expected}_when_{condition} pattern
- Organize tests with nested describes matching the source structure
- Follow AAA (Arrange-Act-Assert) for every test
- Target 80%+ line coverage for application code, 90%+ for domain logic
- Use mutation testing (Stryker) to validate test quality beyond coverage
- Structure integration tests as Given-When-Then scenarios
- One assertion per behavior test
- Test edge cases: null, empty, boundary values, error conditions
- Use factories and builders to reduce test setup boilerplate
- Keep tests fast and deterministic — no timing dependencies
