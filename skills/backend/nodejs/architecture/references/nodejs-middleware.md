# Node.js Middleware Architecture Reference

## Middleware Pipeline Order

Express/Fastify middleware executes in registration order. Maintain this sequence:

```typescript
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';

const app = express();

// 1. Security headers
app.use(helmet());

// 2. CORS
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') }));

// 3. Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 4. Compression
app.use(compression());

// 5. Request logging
app.use(requestLogger);

// 6. Rate limiting
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// 7. Routes
app.use('/api/v1', router);

// 8. 404 handler
app.use(notFoundHandler);

// 9. Global error handler (must be last)
app.use(errorHandler);
```

## Custom Middleware Patterns

### Async Error Wrapper

```typescript
import { Request, Response, NextFunction } from 'express';

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

const asyncHandler = (fn: AsyncHandler) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

app.get('/api/users', asyncHandler(async (req, res) => {
  const users = await userService.findAll();
  res.json(users);
}));
```

### Request Context Middleware

```typescript
import { v4 as uuidv4 } from 'uuid';

declare global {
  namespace Express {
    interface Request {
      context: {
        requestId: string;
        startTime: number;
        userId?: string;
      };
    }
  }
}

app.use((req, res, next) => {
  req.context = {
    requestId: uuidv4(),
    startTime: Date.now(),
  };
  res.setHeader('X-Request-Id', req.context.requestId);
  next();
});
```

### Authentication Middleware

```typescript
import jwt from 'jsonwebtoken';

const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.context.userId = (decoded as any).sub;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

app.use('/api/protected', authenticate, protectedRouter);
```

### Validation Middleware

```typescript
import { z, ZodSchema } from 'zod';

const validate = (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: result.error.issues.map(i => ({
        field: i.path.join('.'),
        message: i.message,
      })),
    });
  }
  req.body = result.data;
  next();
};

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  age: z.number().min(18),
});

app.post('/api/users', validate(createUserSchema), createUserHandler);
```

### Rate Limiting Middleware

```typescript
import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts' },
});

app.use('/api', apiLimiter);
app.use('/api/auth/login', authLimiter);
```

### Error Handling Middleware

```typescript
class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}

const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      code: err.code,
      message: err.message,
      details: err.details,
    });
  }

  console.error('Unhandled error:', err);
  res.status(500).json({
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  });
};
```

### Logger Middleware

```typescript
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: Date.now() - start,
      requestId: req.context.requestId,
    });
  });
  next();
};
```

### Conditional Middleware

```typescript
const conditionalMiddleware = (condition: boolean, middleware: RequestHandler) => 
  (req: Request, res: Response, next: NextFunction) => {
    if (condition) {
      return middleware(req, res, next);
    }
    next();
  };

app.use(conditionalMiddleware(
  process.env.NODE_ENV === 'development',
  morgan('dev')
));
```

## Key Points

- Middleware executes in registration order — security first, routes last
- Async error wrapper eliminates try/catch in route handlers
- Request context (requestId, startTime) enables tracing
- Authentication middleware extracts and validates JWT tokens
- Zod schema validation provides type-safe request parsing
- Rate limiting protects auth endpoints with stricter limits
- Global error handler catches all exceptions uniformly
- Logger middleware captures request metrics
- Conditional middleware enables environment-specific behavior
- 404 handler before error handler ensures clean error responses
