# API Design Security

## Overview
Design APIs with security built in from endpoint design: authentication enforcement, input validation, rate limiting at endpoint level, and secure data exposure patterns.

## Authentication Enforcement

```typescript
// Express middleware enforcing auth per route group
function requireAuth(roles?: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
    }
    if (roles && !roles.some(r => user.roles.includes(r))) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Insufficient permissions' });
    }
    next();
  };
}

// Route-level auth enforcement
router.post('/orders', requireAuth(['customer']), createOrder);
router.get('/admin/users', requireAuth(['admin']), listUsers);
router.get('/health', publicEndpoint); // Explicit opt-in for public
```

## Input Validation at the Endpoint

```typescript
// Zod schema validation at the API boundary
import { z } from 'zod';

const createOrderSchema = z.object({
  customerId: z.string().uuid(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive().max(100),
  })).min(1).max(50),
  shippingAddressId: z.string().uuid(),
  couponCode: z.string().optional(),
});

function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(422).json({
        error: 'VALIDATION_ERROR',
        message: 'Request body validation failed',
        details: result.error.issues.map(i => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      });
    }
    req.validatedBody = result.data;
    next();
  };
}

router.post('/orders', validateBody(createOrderSchema), createOrder);
```

## Rate Limiting per Endpoint

```typescript
// Granular rate limiting by endpoint and user tier
interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
}

const rateLimitConfigs: Record<string, RateLimitConfig> = {
  'POST /auth/login': { windowMs: 60000, maxRequests: 5 },
  'POST /auth/register': { windowMs: 3600000, maxRequests: 2 },
  'GET /api/*': { windowMs: 60000, maxRequests: 100 },
  'POST /api/orders': { windowMs: 60000, maxRequests: 30 },
  'POST /api/payments': { windowMs: 60000, maxRequests: 10 },
};

function rateLimitByEndpoint(req: Request, res: Response, next: NextFunction) {
  const route = `${req.method} ${req.baseUrl}${req.route?.path || ''}`;
  const config = rateLimitConfigs[route] || rateLimitConfigs['GET /api/*'];
  const key = `${req.ip}:${route}`;
  // Redis-backed counter implementation
  next();
}
```

## Secure Data Exposure

```typescript
// Never expose internal IDs, stack traces, or sensitive fields
function sanitizeResponse<T>(data: T, fields: string[]): Partial<T> {
  const sanitized = { ...data };
  for (const field of fields) {
    delete sanitized[field];
  }
  return sanitized;
}

// Usage in controller
router.get('/users/:id', async (req, res) => {
  const user = await userService.findById(req.params.id);
  const safeUser = sanitizeResponse(user, [
    'passwordHash', 'ssn', 'creditCardNumber', 'internalNotes'
  ]);
  res.json({ data: safeUser });
});
```

## API Key Management

```typescript
// API key generation and validation
import crypto from 'crypto';

function generateApiKey(): { key: string; hash: string } {
  const key = `ak_${crypto.randomBytes(32).toString('hex')}`;
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  return { key, hash }; // Store hash, return key once
}

async function validateApiKey(key: string): Promise<boolean> {
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  const stored = await ApiKey.findOne({ hash, active: true, expiresAt: { $gt: new Date() } });
  return stored !== null;
}
```

## Key Points
- Authenticate at every endpoint by default; explicitly mark public endpoints
- Validate all input at the API boundary using schema validation
- Rate limit per endpoint based on sensitivity (login: 5/min, general: 100/min)
- Never expose internal IDs, stack traces, or sensitive fields in API responses
- Hash API keys before storing; return the plaintext key exactly once
