# Middleware Patterns

## Middleware Chain Ordering

Express middleware executes in registration order. Always order:

1. Security (cors, helmet, compression)
2. Parsing (json, urlencoded, multipart)
3. Observability (request logger, request ID)
4. Rate limiting
5. Routes
6. 404 handler
7. Global error handler

```typescript
app.use(cors());
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(requestId());
app.use(requestLogger);
app.use(rateLimiter);
app.use('/api/v1', routes);
app.use(notFoundHandler);
app.use(errorHandler);
```

## Error Handling Middleware

Four-argument signature marks error handler:

```typescript
function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  const status = err instanceof AppError ? err.statusCode : 500;
  res.status(status).json({
    success: false,
    error: {
      message: err.message || 'Internal Server Error',
      ...(env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
}
```

## Async Handler Wrapper

Express 4 does not catch rejected promises. Wrap async handlers:

```typescript
import { Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

export function asyncHandler(fn: AsyncHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
```

Express 5 catches async errors natively. Use for Express 5+ projects.

## Validation Middleware

```typescript
import { z } from 'zod';

const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().positive().optional(),
});

// Generic validation factory
function validate<T>(schema: z.ZodSchema<T>, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(new AppError(400, 'VALIDATION_ERROR', 'Validation failed', result.error.issues));
    }
    req[source] = result.data;
    next();
  };
}
```

## Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                    // limit per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests. Try again later.' },
  },
});

app.use('/api/', apiLimiter);
```

For distributed rate limiting, use `rate-limit-redis`:

```typescript
import RedisStore from 'rate-limit-redis';
import { redis } from '../config/redis';

const limiter = rateLimit({
  store: new RedisStore({ sendCommand: (...args: string[]) => redis.sendCommand(args) }),
  windowMs: 15 * 60 * 1000,
  max: 100,
});
```

## Request ID Middleware

```typescript
import { v4 as uuidv4 } from 'uuid';

export function requestId(req: Request, res: Response, next: NextFunction) {
  const id = req.headers['x-request-id'] as string || uuidv4();
  req.id = id;
  res.setHeader('x-request-id', id);
  next();
}

declare global {
  namespace Express {
    interface Request { id: string; }
  }
}
```

## Conditional Middleware

Apply middleware based on route or condition:

```typescript
function unless(paths: string[], middleware: RequestHandler): RequestHandler {
  return (req, res, next) => {
    if (paths.some(p => req.path.startsWith(p))) return next();
    return middleware(req, res, next);
  };
}

// Skip auth for public endpoints
app.use(unless(['/health', '/auth/login'], authenticate));
```

## Body Parser Configuration

```typescript
app.use(express.json({
  limit: env.MAX_BODY_SIZE || '1mb',
  verify: (req, _res, buf) => {
    req.rawBody = buf.toString();
  },
}));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// File upload with multer
import multer from 'multer';
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new AppError(400, 'INVALID_FILE', 'Only images allowed'));
    }
    cb(null, true);
  },
});
app.post('/upload', upload.single('file'), uploadHandler);
```

## Compression

```typescript
import compression from 'compression';

// Filter to skip compression for small responses
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
  threshold: 1024, // bytes
}));
```

## CORS Configuration

```typescript
const corsOptions = {
  origin: env.CORS_ORIGIN.split(',').map(s => s.trim()),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['x-request-id'],
  credentials: true,
  maxAge: 86400, // 24h preflight cache
};

app.use(cors(corsOptions));
```

## Helmet Security Headers

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: env.NODE_ENV === 'production',
  crossOriginEmbedderPolicy: false,
}));
```

## Response Time Header

```typescript
import responseTime from 'response-time';

app.use(responseTime((req, res, time) => {
  res.setHeader('x-response-time', `${time.toFixed(0)}ms`);
}));
```
