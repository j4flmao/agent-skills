# Unit Testing Fundamentals

## Overview
Unit testing validates individual functions, methods, or modules in isolation. Good unit tests are fast, deterministic, and focused on a single unit of behavior. They form the base of the test pyramid — fast feedback on every change, catching bugs before they reach integration or E2E tests.

## Core Concepts

### Concept 1: FIRST Principles
- **Fast**: Tests run in milliseconds. Unit suites should complete in under 5 minutes
- **Independent**: No test depends on another. Run in any order, in parallel
- **Repeatable**: Same result every time, regardless of environment
- **Self-validating**: Pass/fail is automatic with assertions, no manual inspection
- **Timely**: Written before or alongside production code (TDD)

### Concept 2: AAA Pattern (Arrange-Act-Assert)
Standard structure for every test:
- **Arrange**: Set up test data, create mocks, configure the system under test
- **Act**: Execute the function or method being tested
- **Assert**: Verify the outcome matches expectations

### Concept 3: Test Doubles
- **Mock**: Pre-programmed object with expectations about which methods get called
- **Stub**: Provides canned answers to calls made during the test
- **Fake**: Lightweight implementation of an interface (e.g., in-memory database)
- **Spy**: Records calls made to a real object for later verification
- **Dummy**: Passed around but never used (fills parameter lists)

### Concept 4: Test Coverage
Coverage measures which lines/branches are executed by tests. Line coverage > 80%, branch coverage > 70% for business logic. Coverage is a necessary but not sufficient measure — focus on meaningful tests, not percentage chasing. Exclude generated code, boilerplate, and framework code.

## Framework Selection

| Feature | Vitest (JS/TS) | Jest (JS/TS) | pytest (Python) | JUnit 5 (Java) | xUnit (.NET) |
|---------|---------------|-------------|-----------------|----------------|--------------|
| Speed | Very fast (ESBuild) | Fast | Moderate | Fast | Fast |
| Mocking | vi.mock, vi.spyOn | jest.mock, jest.spyOn | pytest-mock, unittest.mock | Mockito | Moq, NSubstitute |
| Assertions | expect() | expect() | assert | AssertJ | FluentAssertions |
| Parameterized | test.each | test.each | @pytest.mark.parametrize | @CsvSource, @MethodSource | [Theory], [InlineData] |
| Parallel | Native | jest --maxWorkers | pytest-xdist | Maven/Gradle | Built-in |
| Coverage | c8/istanbul | istanbul | pytest-cov | JaCoCo | Coverlet |
| Watch mode | Native | --watch | pytest-watch | IntelliJ | dotnet watch |
| Best for | New TS/JS projects | Existing JS projects | Python projects | Java projects | .NET projects |

## Implementation Guide

### Step 1: Identify the Unit
A unit is a single function or method with a clear responsibility. Pure functions (same input → same output, no side effects) are the easiest to test. Methods with dependencies need test doubles at boundaries. Test behavior, not implementation.

### Step 2: Write the Test
```python
# tests/unit/test_pricing.py
"""Unit tests for pricing module — pure function testing."""
import pytest
from decimal import Decimal
from src.pricing import calculate_discount, PriceBreak

class TestCalculateDiscount:
    """Tests for the discount calculation function."""

    def test_no_breaks_returns_zero_discount(self):
        """Should return 0% when no price breaks exist."""
        result = calculate_discount(10, [])
        assert result == Decimal("0")

    def test_quantity_meets_exact_break(self):
        """Should apply discount when quantity exactly matches break."""
        breaks = [PriceBreak(5, Decimal("10"))]
        result = calculate_discount(5, breaks)
        assert result == Decimal("10")

    def test_quantity_exceeds_break(self):
        """Should apply discount when quantity exceeds break threshold."""
        breaks = [PriceBreak(5, Decimal("10"))]
        result = calculate_discount(10, breaks)
        assert result == Decimal("10")

    def test_highest_applicable_break_applied(self):
        """Should apply highest discount among applicable breaks."""
        breaks = [
            PriceBreak(5, Decimal("10")),
            PriceBreak(10, Decimal("15")),
            PriceBreak(20, Decimal("20")),
        ]
        assert calculate_discount(15, breaks) == Decimal("15")
        assert calculate_discount(25, breaks) == Decimal("20")

    def test_quantity_below_all_breaks_returns_zero(self):
        """Should return 0% when below all break thresholds."""
        breaks = [PriceBreak(5, Decimal("10"))]
        result = calculate_discount(3, breaks)
        assert result == Decimal("0")
```

### Step 3: Write Tests with Mocks
```typescript
// src/services/__tests__/order.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderService } from '../order.service';

describe('OrderService', () => {
  let service: OrderService;
  let mockOrderRepo: { create: ReturnType<typeof vi.fn> };
  let mockPaymentGateway: { charge: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    // Arrange — create fresh mocks for each test
    mockOrderRepo = { create: vi.fn() };
    mockPaymentGateway = { charge: vi.fn() };
    service = new OrderService(mockOrderRepo, mockPaymentGateway);
  });

  it('should create order and return it on success', async () => {
    // Arrange
    const cart = { items: [{ price: 50 }, { price: 30 }] };
    mockPaymentGateway.charge.mockResolvedValue({ id: 'pay_123' });
    mockOrderRepo.create.mockResolvedValue({ id: 'ord_456' });

    // Act
    const result = await service.placeOrder(cart, 'cust_789');

    // Assert
    expect(mockPaymentGateway.charge).toHaveBeenCalledWith('cust_789', 80);
    expect(mockOrderRepo.create).toHaveBeenCalledWith({
      customerId: 'cust_789', total: 80, paymentId: 'pay_123',
    });
    expect(result).toEqual({ id: 'ord_456' });
  });

  it('should not create order when payment fails', async () => {
    // Arrange
    const cart = { items: [{ price: 50 }] };
    mockPaymentGateway.charge.mockRejectedValue(new Error('insufficient_funds'));

    // Act & Assert
    await expect(service.placeOrder(cart, 'cust_789')).rejects.toThrow('insufficient_funds');
    expect(mockOrderRepo.create).not.toHaveBeenCalled();
  });
});
```

### Step 4: Coverage Configuration
```yaml
# vitest.config.ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      lines: 80,
      branches: 70,
      functions: 80,
      statements: 80,
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'src/generated/**'],
    },
  },
});
```

## Best Practices
- Follow AAA pattern (Arrange-Act-Assert) consistently
- Use descriptive test names: "should [expected] when [scenario]"
- Mock at system boundaries (network, database, filesystem, time), not internals
- Use real implementations for pure functions and value objects
- One behavior concept per test — multiple assertions are fine if they test one behavior
- Use factory functions for test data with sensible defaults and overrides
- Clean up between tests: restore mocks, reset timers, clear state
- Write tests alongside or before production code (TDD)
- Run tests in watch mode during development for fast feedback
- Use parameterized tests for data-driven scenarios (test.each, @pytest.mark.parametrize)

## Common Pitfalls
- Over-mocking: mocking internals creates brittle tests that break on refactoring
- Testing implementation: tests that assert internal method calls break during refactoring
- Shared mutable state: tests that depend on each other are unreliable and order-dependent
- Slow tests: real I/O makes tests slow — mock network, DB, filesystem
- Empty assertions: tests without assertions provide false confidence
- Coverage chasing: targeting 100% encourages meaningless tests; focus on business logic
- Skipping error paths: only testing happy path misses most bugs

## Key Points
- Unit tests validate single functions/modules in isolation
- Follow FIRST principles: Fast, Independent, Repeatable, Self-validating, Timely
- Use AAA pattern for consistent test structure
- Mock at system boundaries, use real implementations for pure logic
- Coverage targets: line >= 80%, branch >= 70% for business logic
- Tests should complete in < 100ms each, suite under 5 minutes
- Test behavior, not implementation — assertions on observable outcomes only
- Use factory functions for test data creation
- Clean up state between tests for reliable, order-independent execution
