# API Security Fundamentals

## Overview
API security protects API endpoints from unauthorized access, abuse, and attacks. With APIs becoming the primary attack surface for modern applications, security must be designed into every layer: authentication, authorization, rate limiting, input validation, and audit logging. The OWASP API Security Top 10 provides a threat model framework.

## Core Concepts

### Concept 1: OWASP API Security Top 10
- **API1: Broken Object Level Authorization** — Users access objects they shouldn't
- **API2: Broken Authentication** — Weak or bypassable authentication
- **API3: Excessive Data Exposure** — API returns more data than needed
- **API4: Lack of Resources & Rate Limiting** — No limits on request volume
- **API5: Broken Function Level Authorization** — Users access admin functions
- **API6: Mass Assignment** — Users modify fields they shouldn't
- **API7: Security Misconfiguration** — Default configs, verbose errors
- **API8: Injection** — SQL, NoSQL, command injection via API parameters
- **API9: Improper Asset Management** — Old/debug API endpoints exposed
- **API10: Insufficient Logging & Monitoring** — No audit trail for attacks

### Concept 2: API Authentication
- **API Keys**: Simple, shared secret in header. Weak — use only for low-risk, server-to-server
- **JWT (JSON Web Tokens)**: Self-contained, signed tokens. Validate signature, expiration, issuer, audience. Use short-lived access tokens (15 min) + long-lived refresh tokens
- **OAuth 2.0**: Delegated authorization framework. Authorization code flow for web apps, client credentials for server-to-server, device code for IoT
- **Mutual TLS (mTLS)**: Both sides present certificates. Strongest option for server-to-server API security

### Concept 3: Rate Limiting
- **Token Bucket**: Tokens refill at fixed rate. Allows bursts up to bucket size
- **Sliding Window**: Count requests in rolling time window. More accurate than fixed window
- **Per-User**: Rate limit per authenticated user (e.g., 100 req/min per user)
- **Per-Endpoint**: Different limits for different endpoints (e.g., 10 req/min for login, 1000 req/min for search)
- **Per-IP**: Rate limit by source IP (fallback for unauthenticated endpoints)

### Concept 4: Input Validation
Validate all API inputs at the gateway and application level:
- Schema validation with JSON Schema or OpenAPI spec
- SQL injection prevention with parameterized queries
- NoSQL injection prevention (sanitize MongoDB query operators)
- Command injection prevention (avoid shell execution with user input)
- Path traversal prevention (validate file paths)
- XML/XXE protection (disable external entity processing)

## Implementation Guide

### Step 1: JWT Authentication Middleware
```typescript
// middleware/auth.ts — JWT validation and user context
import { jwtVerify, type JWTPayload } from 'jose';
import type { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    roles: string[];
    permissions: string[];
  };
}

export async function authenticateJWT(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: 'api.example.com',
      audience: 'api.example.com',
    });

    req.user = {
      id: payload.sub as string,
      roles: payload.roles as string[],
      permissions: payload.permissions as string[],
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
```

### Step 2: Rate Limiting Middleware
```typescript
// middleware/rateLimit.ts — Sliding window rate limiter
import rateLimit from 'express-rate-limit';

// Global rate limit — 1000 requests per minute
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

// Strict rate limit for auth endpoints — 10 requests per minute
export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,  // Only count failed attempts
  message: { error: 'Too many authentication attempts' },
});

// Per-user rate limit
export const userRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: (req) => {
    // Different limits for different user tiers
    if (req.user?.tier === 'premium') return 5000;
    if (req.user?.tier === 'enterprise') return 10000;
    return 1000;
  },
  keyGenerator: (req) => req.user?.id || req.ip,
});
```

### Step 3: Input Validation with Zod
```typescript
// validators/checkout.ts — Request validation
import { z } from 'zod';

export const checkoutSchema = z.object({
  cartId: z.string().uuid(),
  shippingAddress: z.object({
    street: z.string().min(1).max(255),
    city: z.string().min(1).max(100),
    state: z.string().length(2),
    zip: z.string().regex(/^\d{5}(-\d{4})?$/),
    country: z.string().length(2),
  }),
  paymentMethod: z.enum(['credit_card', 'debit_card', 'paypal']),
  couponCode: z.string().optional(),
});

export async function validateCheckout(req: Request, res: Response, next: NextFunction) {
  const result = checkoutSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: result.error.issues.map(i => ({
        path: i.path.join('.'),
        message: i.message,
      })),
    });
  }
  req.validatedBody = result.data;
  next();
}
```

### Step 4: API Security Headers (Gateway Level)
```yaml
# Nginx/Kong API gateway security headers
headers:
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  - X-XSS-Protection: "1; mode=block"
  - Strict-Transport-Security: "max-age=31536000; includeSubDomains"
  - Content-Security-Policy: "default-src 'none'"
  - Cache-Control: "no-store"
  - Pragma: "no-cache"
```

## Best Practices
- Authenticate every request — no unauthenticated endpoints unless explicitly public
- Validate all inputs against a schema — reject malformed requests at the gateway
- Use short-lived JWT access tokens (15 min) with refresh tokens (7 days)
- Implement rate limiting per user and per endpoint with different tiers
- Log every authenticated request with user ID, action, resource, and timestamp
- Use API keys only for server-to-server communication with IP allowlisting
- Version APIs explicitly (v1, v2) and deprecate old versions
- Implement proper object-level authorization — don't trust IDs from the client
- Avoid excessive data exposure — return only required fields
- Use parameterized queries for all database operations

## Common Pitfalls
- Broken object-level authorization: user can access another user's data by changing an ID
- No rate limiting on auth endpoints: brute force attacks succeed
- Excessive data exposure: API returns all fields including internal ones
- Mass assignment: user modifies fields they shouldn't via request body
- Verbose error messages: leaking stack traces, SQL queries, or implementation details
- Unversioned APIs: changing API breaks existing clients without notice
- Storing secrets in API responses: tokens, passwords, API keys in response bodies
- CORS misconfiguration: allowing all origins for authenticated endpoints

## Key Points
- OWASP API Security Top 10 guides API-specific threat modeling
- Authenticate every request with JWT or OAuth 2.0
- Rate limit per user and per endpoint with tiered policies
- Validate all inputs against strict schemas
- Authorize every object access — don't trust IDs from client
- Return minimal data — avoid excessive data exposure
- Log all API access for audit and threat detection
- Version APIs and deprecate old versions explicitly
