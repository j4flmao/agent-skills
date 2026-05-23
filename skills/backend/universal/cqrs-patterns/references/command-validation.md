# Command Validation

## Two-Phase Validation Model

```
Phase 1 — Syntactic Validation (before command handler):
  - Required fields present
  - Correct data types
  - String length limits
  - Enum value checks
  - Format validation (email, UUID, etc.)

Phase 2 — Business Rule Validation (inside command handler):
  - Entity existence
  - State transition allowed
  - Business rule satisfaction
  - Authorization/permission
  - Concurrency conflict detection
```

## Phase 1: Input Validation

```typescript
class PlaceOrderValidator {
  validate(command: PlaceOrderCommand): ValidationResult {
    const errors: ValidationError[] = [];

    if (!command.customerId) errors.push({ field: 'customerId', message: 'Customer ID is required' });
    if (command.items.length === 0) errors.push({ field: 'items', message: 'At least one item required' });
    for (const item of command.items) {
      if (item.quantity <= 0) errors.push({ field: `items[${item.productId}].quantity`, message: 'Quantity must be positive' });
      if (item.unitPrice <= 0) errors.push({ field: `items[${item.productId}].unitPrice`, message: 'Price must be positive' });
    }

    return errors.length > 0 ? { success: false, errors } : { success: true };
  }
}
```

## Phase 2: Business Rule Validation

```typescript
class PlaceOrderHandler {
  async handle(command: PlaceOrderCommand): Promise<Result> {
    // Business rule: customer must be active
    const customer = await this.customerRepo.findById(command.customerId);
    if (!customer || !customer.isActive) {
      return Result.failure('Customer not found or inactive');
    }

    // Business rule: order total must be within customer credit limit
    const total = this.calculateTotal(command.items);
    if (total > customer.creditLimit) {
      return Result.failure(`Order total ${total} exceeds credit limit ${customer.creditLimit}`);
    }

    // Business rule: all products must be available
    const unavailable = await this.inventoryService.checkAvailability(command.items);
    if (unavailable.length > 0) {
      return Result.failure(`Products unavailable: ${unavailable.join(', ')}`);
    }

    // Execute
    const aggregate = new OrderAggregate(OrderState.create(command.orderId));
    const event = aggregate.placeOrder(command);
    await this.repository.save(aggregate);
    await this.eventBus.publish(event);
    return Result.success();
  }
}
```

## Command Result Patterns

```typescript
class Result {
  constructor(
    public readonly success: boolean,
    public readonly error?: string,
    public readonly correlationId?: string
  ) {}

  static success(): Result { return new Result(true); }
  static failure(error: string): Result { return new Result(false, error); }
}
```

## Validation Rules

- Phase 1 validation happens before command handler. Phase 2 validation inside.
- Validation errors return immediately. Business rule failures return as Result.
- Commands never throw exceptions for validation failures. Return Result with error information.
- Use a validation pipeline/middleware for Phase 1 to keep handlers clean.
- Phase 2 validations that access external services should be cached when possible.
