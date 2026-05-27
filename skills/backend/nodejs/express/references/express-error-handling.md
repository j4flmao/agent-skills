# Express Error Handling Reference

## Global Error Handler

Centralized error handling catches all exceptions and returns consistent responses.

```typescript
import { Request, Response, NextFunction } from 'express';

class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  const requestId = req.context?.requestId;

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      code: err.code,
      message: err.message,
      details: err.details,
      requestId,
    });
  }

  console.error('Unhandled error:', {
    message: err.message,
    stack: err.stack,
    requestId,
    method: req.method,
    url: req.originalUrl,
  });

  res.status(500).json({
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
    requestId,
  });
};

app.use(errorHandler);
```

## Custom Error Classes

```typescript
export class NotFoundError extends AppError {
  constructor(entity: string, id: string) {
    super(404, 'NOT_FOUND', `${entity} with id ${id} not found`);
  }
}

export class ValidationError extends AppError {
  constructor(errors: ValidationDetail[]) {
    super(400, 'VALIDATION_ERROR', 'Validation failed', errors);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(403, 'FORBIDDEN', message);
  }
}

export class ConflictError extends AppError {
  constructor(detail: string) {
    super(409, 'CONFLICT', detail);
  }
}
```

## Async Error Wrapper

```typescript
import { RequestHandler } from 'express';

export const asyncHandler = (fn: RequestHandler): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Usage
app.get('/api/orders/:id', asyncHandler(async (req, res) => {
  const order = await orderService.findById(req.params.id);
  if (!order) throw new NotFoundError('Order', req.params.id);
  res.json(order);
}));
```

## 404 Handler

```typescript
app.use((req, res) => {
  res.status(404).json({
    code: 'NOT_FOUND',
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});
```

## Validation Middleware

```typescript
import { z, ZodError } from 'zod';

export const validate = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        }));
        next(new ValidationError(details));
      } else {
        next(error);
      }
    }
  };
};
```

## Error Logging Middleware

```typescript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  serializers: {
    err: pino.stdSerializers.err,
  },
});

export const errorLogger = (err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error({
    err,
    requestId: req.context?.requestId,
    method: req.method,
    url: req.originalUrl,
    body: req.body,
  });
  next(err);
};

app.use(errorLogger);
app.use(errorHandler);
```

## Unhandled Rejection Handling

```typescript
process.on('unhandledRejection', (reason: Error) => {
  logger.error({ err: reason }, 'Unhandled Promise rejection');
});

process.on('uncaughtException', (error: Error) => {
  logger.error({ err: error }, 'Uncaught exception');
  process.exit(1);
});
```

## Graceful Shutdown

```typescript
const server = app.listen(port, () => {
  logger.info(`Server listening on port ${port}`);
});

const shutdown = async (signal: string) => {
  logger.info(`${signal} received, shutting down...`);
  server.close(async () => {
    await db.disconnect();
    await redis.quit();
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```

## Error Response Standard

```typescript
interface ErrorResponse {
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
  timestamp: string;
}
```

## Key Points

- Global error handler catches all exceptions at one point
- Custom error classes carry status code and error code
- Async error wrapper eliminates try/catch in route handlers
- 404 handler catches unmatched routes before error handler
- Zod validation errors map to structured validation details
- Error logger captures full context before passing to handler
- Unhandled rejections must be logged, not ignored
- Graceful shutdown closes connections before exiting
- Error response format is consistent across all endpoints
- Stack traces never exposed in production responses
