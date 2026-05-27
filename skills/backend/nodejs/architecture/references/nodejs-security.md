# Node.js Security Reference

## Input Validation

```typescript
import { z } from 'zod';

const orderSchema = z.object({
  customerId: z.string().uuid(),
  items: z.array(z.object({
    sku: z.string().min(1).max(50),
    quantity: z.number().int().positive(),
    price: z.number().positive().multipleOf(0.01),
  })).min(1).max(100),
  couponCode: z.string().optional(),
});

// Sanitize inputs to prevent injection
const sanitizeHtml = (input: string): string => {
  return input.replace(/[<>]/g, '');
};
```

## SQL Injection Prevention

```typescript
// Always use parameterized queries
import { Pool } from 'pg';

const pool = new Pool();

// Correct — parameterized
app.get('/api/users/:id', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM users WHERE id = $1',
    [req.params.id]
  );
  res.json(rows[0]);
}));
```

## Authentication & Authorization

```typescript
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12);
};

const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

const generateToken = (userId: string, roles: string[]): string => {
  return jwt.sign(
    { sub: userId, roles },
    process.env.JWT_SECRET!,
    { expiresIn: '15m', issuer: 'myapp' }
  );
};

const generateRefreshToken = (userId: string): string => {
  return jwt.sign(
    { sub: userId, type: 'refresh' },
    process.env.REFRESH_SECRET!,
    { expiresIn: '7d' }
  );
};
```

## Security Headers

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));
```

## CORS Configuration

```typescript
import cors from 'cors';

app.use(cors({
  origin: (origin, callback) => {
    const allowed = process.env.ALLOWED_ORIGINS?.split(',') || [];
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Total-Count'],
  credentials: true,
  maxAge: 86400,
}));
```

## Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);

const limiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redis.call(...args),
  }),
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: { error: 'Too many login attempts' },
});
```

## CSRF Protection

```typescript
import csurf from 'csurf';

app.use(csurf({ cookie: { httpOnly: true, sameSite: 'strict' } }));

app.get('/api/csrf-token', (req, res) => {
  res.json({ token: req.csrfToken() });
});
```

## Cookie Security

```typescript
app.use(express.session({
  secret: process.env.SESSION_SECRET!,
  name: 'sessionId',
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000,
  },
}));
```

## Environment Variable Validation

```typescript
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  REDIS_URL: z.string().url(),
  ALLOWED_ORIGINS: z.string(),
});

const env = envSchema.parse(process.env);
export default env;
```

## Request Size Limiting

```typescript
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
```

## Key Points

- Validate and sanitize all user inputs with Zod
- Use parameterized queries for all database operations
- Hash passwords with bcrypt (12 rounds minimum)
- JWT access tokens expire in 15 minutes, refresh tokens in 7 days
- Helmet sets security headers including CSP and HSTS
- CORS whitelist specific origins
- Rate limiting with Redis store for distributed environments
- CSRF protection for cookie-based authentication
- Secure cookies with httpOnly, secure, sameSite flags
- Validate environment variables at application startup
