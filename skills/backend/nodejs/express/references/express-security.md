# Express Security Reference

## Security Headers

```typescript
import helmet from 'helmet';
import express from 'express';

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'", 'https://api.example.com'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
```

## CORS Configuration

```typescript
import cors from 'cors';

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const whitelist = process.env.CORS_ORIGINS?.split(',') || [];
    if (!origin || whitelist.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  exposedHeaders: ['X-Request-Id', 'X-Total-Count'],
  credentials: true,
  maxAge: 86400,
};

app.use(cors(corsOptions));
```

## Authentication & JWT

```typescript
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

interface TokenPayload {
  sub: string;
  roles: string[];
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing token' });
  }

  try {
    const token = authHeader.substring(7);
    req.user = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
    next();
  } catch {
    res.status(401).json({ code: 'UNAUTHORIZED', message: 'Invalid token' });
  }
};
```

## Role-Based Authorization

```typescript
const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
    }
    const hasRole = roles.some(role => req.user!.roles.includes(role));
    if (!hasRole) {
      return res.status(403).json({ code: 'FORBIDDEN', message: 'Insufficient permissions' });
    }
    next();
  };
};

app.get('/api/admin/users', authenticate, authorize('admin'), adminHandler);
```

## Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { code: 'RATE_LIMIT', message: 'Too many requests' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: { code: 'RATE_LIMIT', message: 'Too many login attempts' },
});

app.use('/api', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
```

## Input Validation

```typescript
import { z } from 'zod';

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(2).max(100),
});

const validate = (schema: z.ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'Invalid request body',
      details: result.error.issues,
    });
  }
  req.body = result.data;
  next();
};

app.post('/api/users', validate(createUserSchema), createUserHandler);
```

## CSRF Protection

```typescript
import doubleCsrf from 'csrf-csrf';

const { generateToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET!,
  cookieName: 'csrf-token',
  cookieOptions: { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' },
  size: 64,
});

app.get('/api/csrf-token', (req, res) => {
  res.json({ token: generateToken(req, res) });
});

app.use('/api/protected', doubleCsrfProtection);
```

## Secure Cookies

```typescript
import session from 'express-session';

app.use(session({
  secret: process.env.SESSION_SECRET!,
  name: '__Secure-session',
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000,
    domain: process.env.COOKIE_DOMAIN,
  },
}));
```

## SQL Injection Prevention

```typescript
// Always parameterized
app.get('/api/users/:id', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, name, email FROM users WHERE id = $1',
    [req.params.id]
  );
  res.json(rows[0]);
});
```

## Key Points

- Helmet sets essential security headers (CSP, HSTS, X-Frame-Options)
- CORS whitelist specific origins with credential support
- JWT authentication with Bearer token extraction
- Role-based authorization guards admin endpoints
- Rate limiting differentiates general vs auth endpoints
- Zod input validation prevents malformed data
- CSRF double-submit cookie pattern for state-changing requests
- Secure cookies with httpOnly, secure, sameSite flags
- Parameterized queries prevent SQL injection
- Environment-specific security configuration via env vars
