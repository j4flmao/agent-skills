# Clean Architecture Error Handling

## Overview
Handle errors in clean architecture: domain exceptions in domain layer, use-case errors in application layer, HTTP mapping in presentation layer.

## Domain Layer Exceptions

```typescript
// Domain layer — pure business exceptions, no HTTP concepts
class DomainException extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'DomainException';
  }
}

class InsufficientBalanceError extends DomainException {
  constructor(accountId: string, required: number, available: number) {
    super(
      `Account ${accountId} has insufficient balance. Required: ${required}, Available: ${available}`,
      'INSUFFICIENT_BALANCE'
    );
    this.name = 'InsufficientBalanceError';
  }
}

class OrderItemLimitExceededError extends DomainException {
  constructor(maxItems: number) {
    super(`Order cannot exceed ${maxItems} items`, 'ORDER_ITEM_LIMIT_EXCEEDED');
    this.name = 'OrderItemLimitExceededError';
  }
}

class DuplicateEmailError extends DomainException {
  constructor(email: string) {
    super(`User with email ${email} already exists`, 'DUPLICATE_EMAIL');
    this.name = 'DuplicateEmailError';
  }

  get statusCode(): number {
    return 409;
  }
}
```

## Application Layer — Use Case Results

```typescript
// Application layer — typed results instead of throwing
type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

class PlaceOrderUseCase {
  constructor(
    private orderRepo: IOrderRepository,
    private paymentGateway: IPaymentGateway,
    private unitOfWork: IUnitOfWork,
    private logger: ILogger
  ) {}

  async execute(command: PlaceOrderCommand): Promise<Result<OrderResponse, ApplicationError>> {
    try {
      return await this.unitOfWork.execute(async () => {
        const customer = await this.orderRepo.findCustomer(command.customerId);
        if (!customer) {
          return { success: false, error: new NotFoundError('Customer', command.customerId) };
        }

        const order = Order.create(customer, command.items);
        const savedOrder = await this.orderRepo.save(order);

        const paymentResult = await this.paymentGateway.charge(
          customer.paymentMethod,
          savedOrder.total
        );

        if (!paymentResult.success) {
          // Compensate: mark order as failed, no refund needed since no charge
          savedOrder.markPaymentFailed(paymentResult.error);
          await this.orderRepo.save(savedOrder);
          return {
            success: false,
            error: new PaymentFailedError(paymentResult.error),
          };
        }

        savedOrder.confirm();
        await this.orderRepo.save(savedOrder);

        return { success: true, data: OrderResponse.fromDomain(savedOrder) };
      });
    } catch (error) {
      this.logger.error('Unexpected error placing order', { error, command });
      return { success: false, error: new UnexpectedError('Failed to place order') };
    }
  }
}
```

## Presentation Layer — Error Mapping

```typescript
// Presentation layer — maps domain/application errors to HTTP responses
class ErrorHandlerMiddleware {
  private readonly errorMap: Map<string, { status: number; code: string }> = new Map([
    ['InsufficientBalanceError', { status: 422, code: 'INSUFFICIENT_BALANCE' }],
    ['DuplicateEmailError', { status: 409, code: 'DUPLICATE_EMAIL' }],
    ['NotFoundError', { status: 404, code: 'NOT_FOUND' }],
    ['PaymentFailedError', { status: 402, code: 'PAYMENT_FAILED' }],
    ['OrderItemLimitExceededError', { status: 422, code: 'ORDER_ITEM_LIMIT_EXCEEDED' }],
    ['ValidationError', { status: 422, code: 'VALIDATION_ERROR' }],
    ['UnauthorizedError', { status: 401, code: 'UNAUTHORIZED' }],
    ['ForbiddenError', { status: 403, code: 'FORBIDDEN' }],
  ]);

  handle(error: Error, req: Request, res: Response, next: NextFunction): void {
    // Domain exception mapping
    const mapping = this.errorMap.get(error.constructor.name);
    if (mapping) {
      res.status(mapping.status).json({
        success: false,
        data: null,
        error: {
          code: mapping.code,
          message: error.message,
          requestId: req.id,
        },
      });
      return;
    }

    // Unknown errors — 500, don't expose details
    this.logger.error('Unhandled error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        requestId: req.id,
      },
    });
  }
}
```

## Cross-Cutting Error Handling

```typescript
// Infrastructure layer — external error wrapping
class ExternalServiceError extends Error {
  constructor(
    public readonly service: string,
    public readonly originalError: Error,
    public readonly statusCode?: number
  ) {
    super(`${service} error: ${originalError.message}`);
    this.name = 'ExternalServiceError';
  }
}

class ResilientServiceClient {
  async callWithRetry<T>(
    serviceName: string,
    call: () => Promise<T>,
    retries = 3
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        return await call();
      } catch (error) {
        lastError = error;
        if (this.isRetryable(error) && attempt < retries - 1) {
          await this.delay(Math.pow(2, attempt) * 100);
          continue;
        }
        throw new ExternalServiceError(serviceName, error);
      }
    }

    throw lastError;
  }

  private isRetryable(error: any): boolean {
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') return true;
    if (error.statusCode >= 500) return true;
    return false;
  }
}
```

## Testing Error Paths

```typescript
describe('PlaceOrderUseCase error paths', () => {
  it('returns NotFoundError for missing customer', async () => {
    orderRepo.findCustomer.mockResolvedValue(null);

    const result = await useCase.execute(command);

    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(NotFoundError);
    expect(result.error.code).toBe('NOT_FOUND');
  });

  it('returns InsufficientBalanceError when payment fails', async () => {
    paymentGateway.charge.mockResolvedValue({ success: false, error: 'Insufficient funds' });

    const result = await useCase.execute(command);

    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(PaymentFailedError);
  });

  it('wraps unknown errors as UnexpectedError', async () => {
    orderRepo.save.mockRejectedValue(new Error('Database connection failed'));

    const result = await useCase.execute(command);

    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(UnexpectedError);
    expect(result.error.message).toBe('Failed to place order'); // Generic message
  });
});
```

## Key Points
- Domain exceptions are pure business concepts with zero HTTP awareness
- Application layer returns Result<T, E> union types, not thrown exceptions
- Presentation layer maps domain errors to HTTP status codes and error codes
- Infrastructure layer wraps external errors in service-specific exception types
- Controllers never catch — error middleware handles all mapping centrally
