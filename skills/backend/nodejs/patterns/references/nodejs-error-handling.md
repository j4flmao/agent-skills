# Node.js Error Handling

## Overview

Error handling in Node.js requires a multi-layered approach that distinguishes between operational errors (expected failures) and programmer errors (bugs). This reference covers error classification patterns, middleware-based error handling, the Result pattern, async error management, global error handlers, crash recovery strategies, and testing error handling paths.

## Error Classification

### Operational vs Programmer Errors

**Operational errors**: Expected runtime problems that a correct program must handle.
- Failed database connection
- Invalid user input
- Network timeout
- File not found
- Rate limit exceeded
- Payment declined

**Programmer errors**: Bugs in the code that shouldn't be handled at runtime.
- TypeError: undefined is not a function
- ReferenceError: variable not defined
- Null pointer dereference
- Incorrect API usage
- Logic errors

```javascript
// Operational error — handle gracefully
try {
  await db.query('SELECT * FROM users');
} catch (err) {
  if (err.code === 'ECONNREFUSED') {
    logger.error('Database unavailable, using cache fallback');
    return await cache.query('users');
  }
  throw err; // Unknown error — escalate
}

// Programmer error — crash and restart
function processOrder(order) {
  if (typeof order.total !== 'number') {
    // This is a programming bug, not runtime error handling
    throw new TypeError('order.total must be a number');
  }
}
```

### Error Severity Levels

```javascript
class ErrorSeverity {
  static LOW = 'low';          // Recoverable, no user impact
  static MEDIUM = 'medium';     // Affects single request, user retryable
  static HIGH = 'high';         // Affects multiple users, needs investigation
  static CRITICAL = 'critical'; // System-wide outage, page on-call
}

function classifyError(err, context) {
  if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
    return ErrorSeverity.HIGH;
  }
  if (err instanceof ValidationError) {
    return ErrorSeverity.LOW;
  }
  if (err instanceof AuthenticationError) {
    return ErrorSeverity.MEDIUM;
  }
  if (err instanceof DatabaseError) {
    return ErrorSeverity.CRITICAL;
  }
  return ErrorSeverity.MEDIUM;
}
```

## Error Class Hierarchy

### Domain-Specific Error Classes

```typescript
// Base application error
export class AppError extends Error {
  public readonly timestamp: Date;
  public readonly errorId: string;

  constructor(
    public readonly code: string,
    message: string,
    public readonly httpStatus: number = 500,
    public readonly details?: Record<string, unknown>,
    public readonly isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date();
    this.errorId = generateErrorId();
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      errorId: this.errorId,
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp.toISOString()
    };
  }
}

// Specific error types
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, 422, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super('AUTHENTICATION_ERROR', message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super('FORBIDDEN', message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      'NOT_FOUND',
      `${resource}${id ? ` with id ${id}` : ''} not found`,
      404
    );
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('CONFLICT', message, 409, details);
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter: number) {
    super('RATE_LIMITED', 'Too many requests', 429, { retryAfter });
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, statusCode: number, message: string) {
    super('EXTERNAL_SERVICE_ERROR', `${service} returned ${statusCode}: ${message}`, 502, { service, upstreamStatus: statusCode });
  }
}
```

### Usage in Services

```typescript
class OrderService {
  async findById(id: string): Promise<Order> {
    const order = await this.repository.findById(id);
    if (!order) {
      throw new NotFoundError('Order', id);
    }
    return order;
  }

  async create(data: CreateOrderDto): Promise<Order> {
    const errors = validateCreateOrder(data);
    if (errors.length > 0) {
      throw new ValidationError('Invalid order data', { fields: errors });
    }

    const customer = await this.customerService.findById(data.customerId);
    if (!customer) {
      throw new ValidationError('Customer not found', { customerId: data.customerId });
    }

    if (customer.status === 'suspended') {
      throw new AuthorizationError('Customer account is suspended');
    }

    try {
      const order = await this.repository.create(data);
      return order;
    } catch (err) {
      if (err.code === '23505') { // PostgreSQL unique violation
        throw new ConflictError('Order already exists', { id: data.id });
      }
      throw new AppError('DATABASE_ERROR', 'Failed to create order', 500, undefined, true);
    }
  }
}
```

## Result Pattern

### Core Implementation

```typescript
export class Result<T, E = AppError> {
  private constructor(
    private readonly _value?: T,
    private readonly _error?: E
  ) {}

  static success<T, E = never>(value: T): Result<T, E> {
    return new Result<T, E>(value, undefined);
  }

  static failure<T = never, E = AppError>(error: E): Result<T, E> {
    return new Result<T, E>(undefined, error);
  }

  get value(): T {
    if (this._error) throw new Error('Cannot access value of a failed Result');
    return this._value!;
  }

  get error(): E {
    if (!this._error) throw new Error('Cannot access error of a successful Result');
    return this._error;
  }

  isSuccess(): boolean {
    return this._error === undefined;
  }

  isFailure(): boolean {
    return this._error !== undefined;
  }

  getOrElse(defaultValue: T): T {
    return this.isSuccess() ? this._value! : defaultValue;
  }

  getOrThrow(): T {
    if (this.isFailure()) throw this._error;
    return this._value!;
  }

  map<U>(fn: (value: T) => U): Result<U, E> {
    if (this.isSuccess()) {
      return Result.success(fn(this._value!));
    }
    return Result.failure(this._error);
  }

  flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    if (this.isSuccess()) {
      return fn(this._value!);
    }
    return Result.failure(this._error);
  }

  match<U>(onSuccess: (value: T) => U, onFailure: (error: E) => U): U {
    return this.isSuccess() ? onSuccess(this._value!) : onFailure(this._error);
  }

  async matchAsync<U>(
    onSuccess: (value: T) => Promise<U>,
    onFailure: (error: E) => Promise<U>
  ): Promise<U> {
    return this.isSuccess() ? onSuccess(this._value!) : onFailure(this._error);
  }
}

// Helper to wrap try-catch into Result
export function tryCatch<T>(fn: () => T): Result<T> {
  try {
    return Result.success(fn());
  } catch (err) {
    return Result.failure(err instanceof AppError ? err : new AppError('UNKNOWN', String(err), 500));
  }
}

export async function tryCatchAsync<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    const result = await fn();
    return Result.success(result);
  } catch (err) {
    return Result.failure(err instanceof AppError ? err : new AppError('UNKNOWN', String(err), 500));
  }
}
```

### Chaining Results

```typescript
class PaymentService {
  async processOrderPayment(order: Order): Promise<Result<PaymentResult>> {
    const validationResult = this.validatePayment(order);
    if (validationResult.isFailure()) return validationResult;

    const chargeResult = await this.chargeCard(order);
    if (chargeResult.isFailure()) return chargeResult;

    const receiptResult = await this.generateReceipt(order);
    if (receiptResult.isFailure()) {
      // Rollback the charge
      await this.refundCharge(order);
      return receiptResult;
    }

    return Result.success({
      transactionId: chargeResult.value.transactionId,
      receiptUrl: receiptResult.value.url,
      amount: order.total
    });
  }

  // Using flatMap for cleaner chaining
  async processOrderPayment_v2(order: Order): Promise<Result<PaymentResult>> {
    const chargeResult = await this.chargeCard(order);
    return chargeResult.flatMap(async (charge) => {
      const receiptResult = await this.generateReceipt(order);
      return receiptResult.map((receipt) => ({
        transactionId: charge.transactionId,
        receiptUrl: receipt.url,
        amount: order.total
      }));
    });
  }
}
```

### Controller Usage

```typescript
// Express controller with Result pattern
class OrderController {
  async create(req: Request, res: Response, next: NextFunction) {
    const result = await orderService.create(req.body);

    result.match(
      (order) => {
        res.status(201).json({ success: true, data: order });
      },
      (error) => {
        // Map domain errors to HTTP responses
        switch (error.code) {
          case 'VALIDATION_ERROR':
            return res.status(422).json({ success: false, error: error.message, details: error.details });
          case 'FORBIDDEN':
            return res.status(403).json({ success: false, error: error.message });
          case 'CONFLICT':
            return res.status(409).json({ success: false, error: error.message });
          default:
            next(error); // Pass to Express error middleware
        }
      }
    );
  }
}
```

## Express Error Handling Middleware

### Centralized Error Middleware

```typescript
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Async handler wrapper
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Error logging middleware
export function errorLogger(err: Error, req: Request, res: Response, next: NextFunction) {
  const errorId = uuidv4();
  const requestInfo = {
    errorId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userId: (req as any).user?.id,
    timestamp: new Date().toISOString()
  };

  if (err instanceof AppError) {
    logger.warn('Operational error', { ...requestInfo, code: err.code, message: err.message });
  } else {
    logger.error('Unexpected error', { ...requestInfo, stack: err.stack, message: err.message });
  }

  (err as any).errorId = errorId;
  next(err);
}

// Error response middleware
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof AppError) {
    return res.status(err.httpStatus).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        errorId: (err as any).errorId,
        details: err.details,
        timestamp: err.timestamp
      }
    });
  }

  // Handle specific Node.js errors
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_JSON',
        message: 'Request body contains invalid JSON',
        errorId: (err as any).errorId
      }
    });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Request body exceeds size limit',
        errorId: (err as any).errorId
      }
    });
  }

  // Unexpected errors — don't leak details
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      errorId: (err as any).errorId
    }
  });
}

// 404 handler (must be after all routes)
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.url} not found`
    }
  });
}
```

### Error Middleware Registration Order

```typescript
const app = express();

// 1. Request logging (before all routes)
app.use(requestLogger);

// 2. Routes
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/users', userRoutes);

// 3. 404 handler (after all routes)
app.use(notFoundHandler);

// 4. Error logging (before error response)
app.use(errorLogger);

// 5. Error response (last)
app.use(errorHandler);
```

## Async Error Handling

### Global Unhandled Rejection Handler

```typescript
// Unhandled promise rejections — Node.js exits with non-zero code by default in v15+
process.on('unhandledRejection', (reason: Error | unknown, promise: Promise<unknown>) => {
  logger.error('Unhandled Promise Rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
    promise
  });

  // In production, log and exit to restart via process manager
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Uncaught exceptions — always crash
process.on('uncaughtException', (err: Error) => {
  logger.error('Uncaught Exception', {
    message: err.message,
    stack: err.stack
  });

  // Give logger time to flush, then exit
  setTimeout(() => {
    process.exit(1);
  }, 1000).unref();
});
```

### Warning Handling

```javascript
// Custom warning handler for deprecations
process.on('warning', (warning) => {
  if (warning.name === 'DeprecationWarning') {
    logger.warn('Deprecation', { code: warning.code, message: warning.message, detail: warning.detail });
  } else {
    logger.warn('Warning', { name: warning.name, message: warning.message });
  }
});
```

## Graceful Shutdown

```typescript
class GracefulShutdown {
  private shuttingDown = false;
  private handlers: Array<() => Promise<void>> = [];
  private server: http.Server | null = null;

  constructor(private readonly timeoutMs = 30000) {}

  registerServer(server: http.Server) {
    this.server = server;
  }

  registerHandler(name: string, handler: () => Promise<void>) {
    this.handlers.push(handler);
  }

  async shutdown(signal: string) {
    if (this.shuttingDown) return;
    this.shuttingDown = true;

    logger.info(`Shutdown signal received: ${signal}`);

    // Stop accepting new connections
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server!.close(() => resolve());
      });
      logger.info('HTTP server closed');
    }

    // Run cleanup handlers
    const results = await Promise.allSettled(
      this.handlers.map(handler => handler())
    );

    results.forEach((result, i) => {
      if (result.status === 'rejected') {
        logger.error(`Cleanup handler ${i} failed:`, result.reason);
      }
    });

    logger.info('Graceful shutdown complete');
    process.exit(0);
  }

  startListening() {
    process.on('SIGTERM', () => this.shutdown('SIGTERM'));
    process.on('SIGINT', () => this.shutdown('SIGINT'));

    // Force shutdown if graceful shutdown takes too long
    setTimeout(() => {
      if (this.shuttingDown) {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }
    }, this.timeoutMs).unref();
  }
}

// Usage
const shutdown = new GracefulShutdown(30000);
shutdown.registerServer(httpServer);
shutdown.registerHandler('db-close', () => db.close());
shutdown.registerHandler('redis-close', () => redis.quit());
shutdown.registerHandler('kafka-close', () => kafkaProducer.disconnect());
shutdown.startListening();
```

## Database Error Handling

```typescript
class DatabaseErrorHandler {
  static handleQueryError(err: any, context: string): never {
    // PostgreSQL error codes
    const pgErrors: Record<string, { code: string; status: number; message: string }> = {
      '23505': { code: 'DUPLICATE_ENTRY', status: 409, message: 'Resource already exists' },
      '23503': { code: 'FOREIGN_KEY_VIOLATION', status: 400, message: 'Referenced resource not found' },
      '23502': { code: 'NOT_NULL_VIOLATION', status: 422, message: 'Required field is missing' },
      '22P02': { code: 'INVALID_INPUT', status: 422, message: 'Invalid input format' },
      '40001': { code: 'SERIALIZATION_FAILURE', status: 409, message: 'Concurrent modification. Retry.' },
      '53300': { code: 'TOO_MANY_CONNECTIONS', status: 503, message: 'Database overloaded' },
    };

    if (err.code && pgErrors[err.code]) {
      const errorDef = pgErrors[err.code];
      throw new AppError(errorDef.code, `<${context}> ${errorDef.message}`, errorDef.status, {
        pgCode: err.code,
        detail: err.detail
      });
    }

    // Connection errors
    if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
      throw new AppError('DATABASE_UNAVAILABLE', `<${context}> Database connection failed`, 503, {
        code: err.code
      });
    }

    // Unknown database error
    throw new AppError('DATABASE_ERROR', `<${context}> Database operation failed`, 500, undefined, true);
  }
}
```

## External Service Error Handling

### Circuit Breaker Pattern

```typescript
class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;

  constructor(
    private readonly threshold = 5,
    private readonly resetTimeoutMs = 30000,
    private readonly halfOpenMaxRequests = 3
  ) {}

  async call<T>(fn: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
      } else {
        if (fallback) return fallback();
        throw new AppError('CIRCUIT_OPEN', 'Service is temporarily unavailable', 503);
      }
    }

    try {
      const result = await fn();

      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failureCount = 0;
      }

      return result;
    } catch (err) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.failureCount >= this.threshold || this.state === 'HALF_OPEN') {
        this.state = 'OPEN';
      }

      if (fallback) return fallback();
      throw err;
    }
  }

  getState() {
    return this.state;
  }

  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
  }
}

// Usage
const paymentGatewayBreaker = new CircuitBreaker(3, 15000);

class PaymentService {
  async processPayment(order: Order): Promise<PaymentResult> {
    return paymentGatewayBreaker.call(
      () => paymentGateway.charge(order.total, order.currency),
      () => this.fallbackPayment(order)
    );
  }

  private async fallbackPayment(order: Order): Promise<PaymentResult> {
    // Use alternative payment provider
    return backupGateway.charge(order.total, order.currency);
  }
}
```

### Retry with Exponential Backoff

```typescript
interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableErrors: string[];
}

const defaultRetryOptions: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 100,
  maxDelayMs: 10000,
  retryableErrors: ['ECONNREFUSED', 'ETIMEDOUT', 'ECONNRESET', '5XX']
};

async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const config = { ...defaultRetryOptions, ...options };
  let lastError: Error;

  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      const isRetryable = config.retryableErrors.some(pattern => {
        if (pattern === '5XX' && err instanceof ExternalServiceError) {
          return err.httpStatus >= 500;
        }
        return (err as any).code === pattern;
      });

      if (!isRetryable || attempt === config.maxRetries) {
        throw err;
      }

      const delay = Math.min(
        config.baseDelayMs * Math.pow(2, attempt - 1),
        config.maxDelayMs
      );

      // Add jitter
      const jitter = Math.random() * delay * 0.1;
      await new Promise(resolve => setTimeout(resolve, delay + jitter));
    }
  }

  throw lastError!;
}
```

## Validation Error Handling

### Structured Validation

```typescript
import { z } from 'zod';

class ValidationEngine {
  static validate<T>(schema: z.ZodSchema<T>, data: unknown): Result<T, ValidationError> {
    const result = schema.safeParse(data);

    if (result.success) {
      return Result.success(result.data);
    }

    const formattedErrors = result.error.errors.map(err => ({
      path: err.path.join('.'),
      message: err.message,
      code: err.code
    }));

    return Result.failure(
      new ValidationError('Validation failed', { fields: formattedErrors })
    );
  }
}

// Usage
const createOrderSchema = z.object({
  customerId: z.string().uuid(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().min(1).max(100),
    unitPrice: z.number().positive()
  })).min(1),
  couponCode: z.string().optional()
});

class OrderController {
  async create(req: Request, res: Response) {
    const validationResult = ValidationEngine.validate(createOrderSchema, req.body);

    validationResult.match(
      (validData) => {
        // Process with validated data
        orderService.create(validData);
        res.status(201).json({ success: true });
      },
      (validationError) => {
        res.status(422).json({
          success: false,
          error: {
            code: validationError.code,
            message: validationError.message,
            details: validationError.details
          }
        });
      }
    );
  }
}
```

## Logging Errors

### Structured Error Logging

```typescript
class ErrorLogger {
  static log(err: Error, context?: Record<string, unknown>) {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      errorId: (err as any).errorId || generateErrorId(),
      name: err.name,
      message: err.message,
      stack: err.stack?.split('\n').slice(0, 5).join('\n'), // First 5 lines
      code: (err as any).code,
      statusCode: (err as any).httpStatus,
      isOperational: (err as any).isOperational !== false,
      context
    };

    if (err instanceof AppError && err.isOperational) {
      logger.warn(errorEntry);
    } else {
      logger.error(errorEntry);
      notifyOnCall(errorEntry); // Page on-call engineer
    }
  }
}

// Error aggregation for monitoring
class ErrorAggregator {
  private errors: Map<string, { count: number; firstSeen: Date; lastSeen: Date }> = new Map();

  record(err: Error) {
    const key = `${err.name}:${err.message}`;
    const existing = this.errors.get(key);

    if (existing) {
      existing.count++;
      existing.lastSeen = new Date();
    } else {
      this.errors.set(key, {
        count: 1,
        firstSeen: new Date(),
        lastSeen: new Date()
      });
    }
  }

  getTopErrors(limit = 10) {
    return [...this.errors.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, limit)
      .map(([key, data]) => ({ error: key, ...data }));
  }

  getErrorRate(windowMs = 3600000) {
    const cutoff = Date.now() - windowMs;
    return [...this.errors.values()]
      .filter(e => e.lastSeen.getTime() > cutoff)
      .reduce((sum, e) => sum + e.count, 0) / (windowMs / 1000);
  }
}
```

## Testing Error Handling

```typescript
import { describe, it, expect } from '@jest/globals';

describe('OrderService', () => {
  describe('create', () => {
    it('returns VALIDATION_ERROR for invalid input', async () => {
      const invalidData = { customerId: 'not-uuid', items: [] };
      const result = await orderService.create(invalidData);

      expect(result.isFailure()).toBe(true);
      expect(result.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns NOT_FOUND when customer does not exist', async () => {
      mockCustomerService.findById.mockResolvedValue(null);

      const result = await orderService.create(validOrderData);

      expect(result.isFailure()).toBe(true);
      expect(result.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('error middleware', () => {
    it('returns 422 for ValidationError', async () => {
      const res = await request(app)
        .post('/api/v1/orders')
        .send({ invalid: true });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 401 for unauthenticated requests', async () => {
      const res = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', '');

      expect(res.status).toBe(401);
    });

    it('returns 500 for unexpected errors (no leak)', async () => {
      mockOrderService.create.mockRejectedValue(new Error('Secret DB info'));

      const res = await request(app)
        .post('/api/v1/orders')
        .send(validOrderData);

      expect(res.status).toBe(500);
      expect(res.body.error.message).not.toContain('Secret DB info');
      expect(res.body.error.message).toBe('An unexpected error occurred');
    });
  });

  describe('Result pattern', () => {
    it('chains operations with flatMap', async () => {
      const result = await Result.success(5)
        .flatMap(x => Result.success(x * 2))
        .flatMap(x => Result.success(x + 1));

      expect(result.isSuccess()).toBe(true);
      expect(result.getOrThrow()).toBe(11);
    });

    it('short-circuits on failure', async () => {
      const sideEffect = jest.fn();

      const result = await Result.success(5)
        .flatMap(() => Result.failure(new AppError('ERROR', 'Failed', 400)))
        .flatMap(() => {
          sideEffect();
          return Result.success(10);
        });

      expect(result.isFailure()).toBe(true);
      expect(sideEffect).not.toHaveBeenCalled();
    });

    it('provides fallback with getOrElse', () => {
      const success = Result.success(42);
      const failure = Result.failure(new AppError('ERROR', '', 400));

      expect(success.getOrElse(0)).toBe(42);
      expect(failure.getOrElse(0)).toBe(0);
    });
  });
});

// Utility: assert error type in tests
function expectAppError(result: Result<unknown>, expectedCode: string) {
  expect(result.isFailure()).toBe(true);
  expect(result.error).toBeInstanceOf(AppError);
  expect((result.error as AppError).code).toBe(expectedCode);
}
```

## Error Handling Checklist

### Development
- [ ] All async route handlers wrapped with asyncHandler
- [ ] Error classes defined for all domain-specific errors
- [ ] Result pattern used for service layer return types
- [ ] Error middleware registered in correct order
- [ ] Global unhandledRejection handler configured
- [ ] Graceful shutdown handler implemented
- [ ] Error IDs generated for all error responses

### Production
- [ ] Error responses do not leak stack traces
- [ ] 500 errors log full details but return generic message
- [ ] Database error codes mapped to appropriate HTTP statuses
- [ ] Circuit breaker configured for external service calls
- [ ] Retry with exponential backoff for transient failures
- [ ] Error aggregation for monitoring system
- [ ] On-call notification for critical errors
- [ ] Error rate monitored and alerted

### Testing
- [ ] Unit tests for each error type
- [ ] Integration tests for error middleware
- [ ] Tests verify error details are not leaked
- [ ] Tests for Result pattern chaining
- [ ] Tests for circuit breaker and retry logic
- [ ] Tests for graceful shutdown behavior
