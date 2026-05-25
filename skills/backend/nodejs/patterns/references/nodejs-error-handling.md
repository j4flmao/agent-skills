# Node.js Error Handling

## Error Hierarchy

```typescript
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(404, 'NOT_FOUND', `${resource} with id ${id} not found`);
  }
}

export class ValidationError extends AppError {
  constructor(details: unknown) {
    super(400, 'VALIDATION', 'Validation failed', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, 'UNAUTHORIZED', message);
  }
}
```

## Global Error Handler

```typescript
// Express
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  // Unknown errors
  console.error('Unhandled error:', err);
  return res.status(500).json({
    success: false,
    error: { code: 'INTERNAL', message: 'Unexpected error occurred' },
  });
}
```

## Async Error Wrapper

```typescript
import { Request, Response, NextFunction } from 'express';

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Usage
router.get('/orders/:id', asyncHandler(async (req, res) => {
  const order = await orderService.findById(req.params.id);
  if (!order) throw new NotFoundError('Order', req.params.id);
  res.json({ data: order });
}));
```

## Result Pattern

```typescript
export class Result<T, E = AppError> {
  private constructor(
    private readonly _value?: T,
    private readonly _error?: E,
  ) {}

  static ok<T>(value: T): Result<T> {
    return new Result(value);
  }

  static fail<E>(error: E): Result<never, E> {
    return new Result(undefined, error);
  }

  get isOk(): boolean {
    return this._error === undefined;
  }

  get isFail(): boolean {
    return this._error !== undefined;
  }

  get value(): T {
    if (this.isFail) throw new Error('Cannot get value from failed result');
    return this._value!;
  }

  get error(): E {
    if (this.isOk) throw new Error('Cannot get error from successful result');
    return this._error!;
  }

  match<U>(ok: (v: T) => U, fail: (e: E) => U): U {
    return this.isOk ? ok(this._value!) : fail(this._error!);
  }
}

// Service using Result
export class OrderService {
  async findById(id: string): Promise<Result<Order, AppError>> {
    const order = await this.repo.findById(id);
    if (!order) return Result.fail(new NotFoundError('Order', id));
    return Result.ok(order);
  }
}
```

## Error Handling Strategies

| Strategy | When | Example |
|----------|------|---------|
| **Throw + catch** | Unexpected errors | `throw new Error('db connection failed')` |
| **Result pattern** | Expected failures | Validation, not found, conflict |
| **try/catch** | Local error handling | Around risky calls |
| **Global handler** | Express/Fastify/Hono | Central error middleware |

## Logging Errors

```typescript
export function createLogger(service: string) {
  return {
    error(err: Error, context?: Record<string, unknown>) {
      console.error(JSON.stringify({
        level: 'error',
        service,
        message: err.message,
        stack: err.stack,
        name: err.name,
        ...context,
      }));
    },

    warn(msg: string, context?: Record<string, unknown>) {
      console.warn(JSON.stringify({ level: 'warn', service, message: msg, ...context }));
    },
  };
}
```

## Domain-Specific Errors

```typescript
// Business logic errors
export class OrderError extends AppError {
  constructor(message: string) {
    super(409, 'ORDER_ERROR', message);
  }
}

// Use in services
export function cancelOrder(id: string, user: User) {
  const order = await repo.findById(id);
  if (order.status === 'shipped') {
    throw new OrderError('Cannot cancel shipped orders');
  }
}
```

## Error Response Format

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
    timestamp?: string;
  };
}
```
