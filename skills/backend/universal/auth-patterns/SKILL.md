---
name: backend-auth-patterns
description: >
  Use this skill when the user says 'auth', 'authentication', 'authorization', 'JWT', 'OAuth', 'RBAC', 'permissions', 'login', 'session', 'refresh token', 'guard', 'middleware auth', or when implementing or reviewing authentication and authorization. This skill enforces: JWT structure and validation, refresh token rotation, OAuth2/OIDC flows, RBAC vs ABAC decision, middleware placement, and password security. Applies to any backend stack. Do NOT use for: specific OAuth provider implementation details, frontend auth UI, or passwordless login flows.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, security, auth, phase-2, universal]
---

# Backend Auth Patterns

## Purpose
Implement authentication and authorization that is secure by default. Every endpoint must have an auth check. No secrets in code. No plaintext passwords.

## Agent Protocol

### Trigger
Exact user phrases: "auth", "authentication", "authorization", "JWT", "OAuth", "RBAC", "permissions", "login", "session", "refresh token", "guard", "middleware auth", "access control", "secure endpoint".

### Input Context
- Application type (SPA, mobile, M2M, server-rendered).
- Security requirements level (basic auth, enterprise SSO, API-key M2M).
- Existing auth infrastructure (if any).

### Output Artifact
Auth design as text. No file output.

### Response Format
```
Auth strategy: {strategy name}
Rationale: {one sentence}
Token structure: {claims}
Auth middleware: {location and logic}
Authorization model: {model name and role/permission list}
```

### Completion Criteria
- [ ] Auth strategy selected based on application type
- [ ] Token structure defined with minimum viable claims
- [ ] Refresh token rotation specified
- [ ] Authorization model defined (RBAC or ABAC)
- [ ] Auth middleware placement specified (Infrastructure layer)
- [ ] Password hashing algorithm specified (bcrypt/argon2)
- [ ] Brute force protection specified
- [ ] No secrets hardcoded in any code example

## Architecture Decision Trees

### Auth Strategy Selection
```
Browser-based SPA?
├── Yes → JWT with refresh tokens in httpOnly cookies (prevents XSS token theft)
│   └── CSRF protection required (SameSite=Strict + CSRF token)
└── No → Mobile app?
    ├── Yes → JWT with refresh tokens in secure device storage (Keychain/Keystore)
    │   └── No CSRF needed (native apps can set custom headers)
    └── No → Server-side rendered app?
        ├── Yes → Session-based auth with Redis store (simpler, CSRF protection built-in)
        └── No → M2M service?
            ├── Yes → API Key (simple) or OAuth2 Client Credentials (standard)
            └── No → Third-party login?
                └── OAuth2 / OIDC delegated to provider
```

### Token Signing Algorithm
```
Single service / monolith?
├── Yes → HMAC with HS256 (simpler, faster, one secret to manage)
└── No → Multiple services?
    ├── Yes → RSA with RS256 or EC with ES256 (public key distribution, no shared secret)
    └── Cloud-native with JWKS endpoint?
        └── RS256 with JWKS rotation (standard for OIDC)
```

### Session vs JWT Decision Tree
```
Do you need to revoke sessions immediately?
├── Yes → Session-based (server-side state, immediate revocation)
└── No → Is horizontal scaling a priority?
    ├── Yes → JWT (stateless, no shared session store)
    └── No → Session-based (simpler, built-in revocation)

Is CSRF protection a concern?
├── Yes → Session with SameSite=Strict cookie + CSRF token
└── No → JWT with Bearer header (CSRF inherently protected)
```

## Workflow

### Step 1: Choose Auth Strategy

| Application Type | Strategy | Token Type | Storage |
|---|---|---|---|
| SPA (browser) | JWT + Refresh Token | Access in memory, Refresh in httpOnly cookie | Memory + Cookie |
| Mobile app | JWT + Refresh Token | Both in secure storage | Keychain/Keystore |
| M2M service | API Key or Client Credentials | Static key or short-lived JWT | Env/Secrets |
| Server-rendered app | Session + Cookie | Session ID in signed cookie | Redis store |
| Third-party login | OAuth2 / OIDC | Delegated to provider | Provider-managed |
| Enterprise SSO | OIDC with SAML | Delegated to IdP | IdP-managed |

### Step 2: JWT Implementation

Token claims (minimum):
```json
{
  "sub": "user-uuid",
  "role": "admin",
  "iat": 1700000000,
  "exp": 1700086400
}
```

Common extended claims:
```json
{
  "sub": "user-uuid",
  "iss": "https://api.example.com",
  "aud": "web-app",
  "role": "admin",
  "permissions": ["order:read", "order:write"],
  "iat": 1700000000,
  "exp": 1700086400,
  "jti": "unique-token-id"
}
```

Rules:
- Asymmetric signing (RS256/ES256) for multi-service architectures. Symmetric (HS256) only for single-service monoliths.
- Claims are minimal: subject, role, issued-at, expires. No secrets or PII in claims.
- Access token expiry: 15 minutes. Refresh token expiry: 7 days.
- Refresh token is single-use. Rotate on every refresh.

### Step 3: Refresh Token Flow

```
1. Client sends access_token + refresh_token
2. Server validates signature and expiry of both
3. If access_token expired but refresh_token valid:
   a. Issue new access_token (15 min)
   b. Rotate refresh_token (issue new, invalidate old)
   c. Return both
4. If a consumed refresh_token is reused:
   a. Invalidate ALL refresh tokens for that user
   b. Log security event
   c. Require re-authentication
```

Implementation:
```typescript
interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

async function refreshTokens(refreshToken: string): Promise<TokenPair> {
  const stored = await tokenRepository.findByToken(refreshToken);

  if (!stored || stored.consumedAt) {
    // Token reuse detected
    await tokenRepository.consumeAllForUser(stored?.userId);
    await securityLogger.log('refresh_token_reuse', { token: refreshToken });
    throw new UnauthorizedError('Token reuse detected. All sessions invalidated.');
  }

  if (stored.expiresAt < new Date()) {
    throw new UnauthorizedError('Refresh token expired.');
  }

  await tokenRepository.markConsumed(refreshToken);

  const user = await userRepository.findById(stored.userId);
  const accessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken(user);

  await tokenRepository.save({
    token: newRefreshToken,
    userId: user.id,
    expiresAt: addDays(new Date(), 7),
  });

  return { accessToken, refreshToken: newRefreshToken };
}
```

### Step 4: Authorization Model

**RBAC (Role-Based Access Control)** — default for most applications:
```typescript
const ROLES = {
  admin: ['*'],
  manager: ['order:read', 'order:write', 'user:read'],
  user: ['order:read', 'order:write'],
  guest: ['order:read'],
} as const;

function authorize(requiredPermission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    const permissions = ROLES[user.role] || [];
    if (!permissions.includes('*') && !permissions.includes(requiredPermission)) {
      throw new ForbiddenError('Insufficient permissions');
    }
    next();
  };
}
```

**ABAC (Attribute-Based Access Control)** — for fine-grained control:
```python
POLICIES = [
    {
        "effect": "allow",
        "action": "order:read",
        "condition": lambda user, resource, env:
            user.tenant_id == resource.tenant_id
    },
    {
        "effect": "allow",
        "action": "order:delete",
        "condition": lambda user, resource, env:
            user.role == "admin" or resource.created_by == user.id
    }
]

def check_abac(user, action, resource):
    for policy in POLICIES:
        if policy["action"] == action and policy["condition"](user, resource, None):
            return True
    return False
```

### Step 5: Auth Middleware

Auth middleware belongs in Infrastructure layer. Not in Domain. Not in Application.

```typescript
// Express middleware
import jwt from 'jsonwebtoken';

function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid authorization header');
  }

  const token = authHeader.substring(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_PUBLIC_KEY, {
      algorithms: ['RS256'],
      issuer: process.env.JWT_ISSUER,
    });
    req.user = payload;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Token expired');
    }
    throw new UnauthorizedError('Invalid token');
  }
}
```

**Python FastAPI middleware:**
```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            PUBLIC_KEY,
            algorithms=["RS256"],
            issuer="https://api.example.com",
            audience="web-app",
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
```

### Step 6: Password Security

```typescript
import { hash, compare } from 'bcrypt';

const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  return compare(plain, hashed);
}

// Argon2 alternative (preferred for new projects)
import * as argon2 from 'argon2';

export async function hashPasswordArgon2(plain: string): Promise<string> {
  return argon2.hash(plain, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}
```

### Step 7: Rate Limiting Auth Endpoints

```typescript
const AUTH_RATE_LIMITS = {
  login: { window: '5 minutes', max: 5 },
  register: { window: '60 minutes', max: 2 },
  refresh: { window: '1 minute', max: 10 },
  passwordReset: { window: '60 minutes', max: 3 },
};

import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: 'RATE_LIMITED', message: 'Too many login attempts. Try again later.' },
  keyGenerator: (req) => `${req.ip}-${req.body?.email}`, // Per-IP + per-user
});

app.use('/api/auth/login', loginLimiter);
```

### Step 8: Session Management (Server-Rendered Apps)

```typescript
import session from 'express-session';
import RedisStore from 'connect-redis';

app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  name: 'sid',
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
  resave: false,
  saveUninitialized: false,
  rolling: true, // Reset maxAge on each request
}));

// Regenerate session ID on login (prevents session fixation)
req.session.regenerate((err) => {
  req.session.userId = user.id;
  req.session.role = user.role;
});
```

## Production Considerations

### Token Blacklisting
For immediate revocation of JWTs, maintain a token blacklist:
```typescript
// Store in Redis with TTL matching token expiry
async function revokeToken(jti: string, exp: number): Promise<void> {
  const ttl = exp - Math.floor(Date.now() / 1000);
  await redis.set(`revoked:${jti}`, 'true', 'EX', Math.max(ttl, 60));
}

async function isTokenRevoked(jti: string): Promise<boolean> {
  return (await redis.exists(`revoked:${jti}`)) === 1;
}
```

### OAuth2 Flows Selection
| Flow | Use Case | Security |
|------|----------|----------|
| Authorization Code | Web apps with backend | Best — PKCE required |
| Authorization Code + PKCE | SPA, mobile | Required for native apps |
| Client Credentials | M2M service | No user context |
| Resource Owner Password | Legacy / trusted apps | Avoid — exposes credentials |
| Implicit | Legacy SPAs | Deprecated — use PKCE |

## Anti-Patterns

1. **Storing tokens in localStorage**: XSS vulnerability. Use httpOnly cookies for SPA.
2. **Not validating token signature**: Accepting any JWT without verification.
3. **Ignoring token expiry**: Never trust client-side expiry. Always verify `exp` server-side.
4. **Refresh token without rotation**: Static refresh tokens never changed. If stolen, permanent access.
5. **No rate limiting on auth endpoints**: Allows brute force password guessing.
6. **Logging passwords in plaintext**: Mask or exclude sensitive fields.
7. **JWT with user data in claims**: PII in JWT claims exposed to all services.
8. **Secret hardcoded in source**: Always use environment variables or secrets manager.
9. **Session fixation not prevented**: Regenerate session ID on login.
10. **Missing CSRF protection for cookie-based auth**: SameSite=Strict mitigates most cases.
11. **Rolling your own crypto**: Always use standard libraries (bcrypt, argon2, jose).
12. **Overly long-lived access tokens**: Keep to 15 minutes max.

## Security Considerations

### Headers for Auth Endpoints
```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
Cache-Control: no-store  (never cache auth responses)
```

### Brute Force Prevention
- IP-based rate limiting on login endpoint
- Account lockout after 5 failed attempts (temporary, 15 min)
- Progressive delay on repeated failures
- CAPTCHA after threshold
- Alert on account take-over patterns (many IPs, one user)

### Audit Logging for Auth
- Log every authentication attempt (success/failure)
- Log token refresh, revocation, role changes
- Log password changes and reset requests
- Never log passwords, tokens, or secrets

## Comparative Analysis

| Feature | JWT + Refresh | Session Cookies | OAuth2 / OIDC |
|---------|--------------|----------------|---------------|
| Stateful/Stateless | Stateless (access), Stateful (refresh) | Stateful | Stateless |
| Scalability | Excellent | Requires shared session store | Excellent |
| XSS protection | Requires httpOnly cookie | httpOnly cookie | Delegated |
| CSRF protection | Via configuration | Via tokens | Via state param |
| Mobile support | Native | Requires webview | Native SDK |
| Token revocation | Blacklist required | Immediate | Per-provider |
| Implementation complexity | Moderate | Low | High |

## Performance Considerations
- Token verification: HS256 ~0.01ms, RS256 ~0.1ms, ES256 ~0.05ms per verification
- bcrypt verification: ~10ms per attempt (cost=12). Rate limiting mitigates attack surface.
- Session lookup: Redis <1ms. Use connection pooling.
- Token blacklist: Store in Redis with TTL. Bloom filter for high-traffic.
- API key lookup: Hash keys before storing. Constant-time comparison.

## Tooling

| Tool | Purpose |
|---|---|
| **jsonwebtoken / jose** | JWT creation and verification |
| **bcrypt / argon2** | Password hashing |
| **express-rate-limit** | Rate limiting middleware |
| **helmet** | HTTP security headers |
| **connect-redis** | Redis session store |
| **passport.js** | Strategy-based auth middleware |
| **keycloak-connect** | Keycloak integration |
| **auth0** | Auth0 integration SDK |

## Rules
- Never store plaintext passwords. Always hash with bcrypt (cost >= 10) or argon2id.
- JWTs are short-lived. 15 minutes for access tokens. 7 days maximum for refresh tokens.
- Every request is validated server-side. Client is never trusted for identity.
- For browser apps: use httpOnly, Secure, SameSite=Strict cookies for refresh tokens.
- Log every auth failure with: timestamp, user ID, IP address, failure reason.
- Brute force protection on login is mandatory. Account lockout after 5 failures.
- Refresh tokens are single-use with rotation. Token reuse detection invalidates all.
- Auth middleware belongs in Infrastructure layer.
- Secrets are always from environment variables or secrets manager.
- Authorization decisions based on permissions, never on role names directly.
- CSRF protection for all cookie-based authentication.
- Password reset tokens expire in 15 minutes and are single-use.

## References
  - references/auth-oauth2.md — OAuth2 Flows
  - references/auth-passwordless.md — Passwordless Authentication
  - references/auth-testing.md — Authentication Testing
  - references/jwt-oauth-guide.md — JWT and OAuth Guide
  - references/oidc-flows.md — OIDC Flows
  - references/rbac-abac.md — RBAC vs ABAC
  - references/auth-patterns-fundamentals.md — Auth Patterns Fundamentals
  - references/auth-patterns-advanced.md — Auth Patterns Advanced
  - references/auth-patterns-provider-comparison.md — Auth Provider Comparison

## Handoff
No artifact produced.
Next skill: backend-testing — test auth flows, verify auth middleware, test rate limiting.
Carry forward: auth strategy, token structure, authorization model, middleware implementation details.
## Implementation Patterns

### Observer Pattern for Event Handling
`
interface EventObserver<T> {
  onEvent(event: T): Promise<void>;
}

class EventBus<T> {
  private observers: Set<EventObserver<T>> = new Set();
  subscribe(observer: EventObserver<T>): void {
    this.observers.add(observer);
  }
  unsubscribe(observer: EventObserver<T>): void {
    this.observers.delete(observer);
  }
  async emit(event: T): Promise<void> {
    const results = Array.from(this.observers).map(o => o.onEvent(event));
    await Promise.allSettled(results);
  }
}
`

### Configuration-Driven Approach
`
config:
  defaults:
    timeout: 30s
    retryCount: 3
  overrides:
    production:
      timeout: 60s
      retryCount: 5
    development:
      timeout: 300s
      retryCount: 1
`

## Production Considerations

### Deployment Checklist
- [ ] Configuration validated against schema before startup
- [ ] Health check endpoints registered and monitored
- [ ] Graceful shutdown with draining period (30s timeout)
- [ ] Resource limits configured (CPU, memory, file descriptors)
- [ ] Log level set appropriate for environment
- [ ] Metrics endpoint secured and exposed
- [ ] Rate limiting configured per-tier
- [ ] TLS certificates valid and auto-renewing
- [ ] Database migrations run as separate deployment step
- [ ] Feature flags ready for gradual rollout

### Monitoring and Alerting
| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| Error rate | > 1% over 5min | Critical | Page on-call |
| p99 latency | > 2s over 5min | Warning | Investigate |
| Throughput drop | > 50% over 1min | Critical | Check upstream |
| Queue depth | > 1000 over 1min | Warning | Scale consumers |
| Disk usage | > 85% | Warning | Clean or expand |
| Memory usage | > 90% heap | Critical | Restart or scale |

## Anti-Patterns

| Anti-Pattern | Symptom | Root Cause | Solution |
|-------------|---------|------------|----------|
| Premature optimization | Complex code for no measured benefit | Guessing instead of profiling | Measure first, optimize based on data |
| Copy-paste reuse | Duplicate code across codebase | Lack of abstraction | Extract shared logic into libraries |
| Gold-plating | Features with no current requirement | Over-engineering | YAGNI — build what's needed now |
| Magical thinking | Assumptions without validation | Skipping error handling | Handle all failure modes explicitly |

## Performance Optimization

### Caching Strategy
Cache hierarchy: L1 (in-memory local) → L2 (distributed Redis/Memcached) → L3 (CDN/Edge).
Cache invalidation: TTL-based (simple, stale), event-based (complex, fresh), write-through (consistent, higher write latency), write-behind (fast writes, eventual consistency).

### Resource Pooling
- Database connections: Pool of reusable connections (HikariCP, pgBouncer)
- HTTP connections: Keep-alive + connection pooling for external calls
- Thread pool: Bounded thread pools for async task execution

### Profiling Methodology
1. Establish baseline with production traffic profile
2. Profile CPU with sampling profiler (pprof, perf, async-profiler)
3. Profile memory with heap dumps and allocation tracking
4. Profile I/O with strace/perf trace for syscall analysis
5. Profile latency with distributed tracing (OpenTelemetry)
6. Identify bottleneck, formulate hypothesis, implement fix
7. Re-profile to verify improvement, repeat

## Security Considerations

### Threat Modeling (STRIDE)
- Spoofing: Identity validation, authentication
- Tampering: Integrity checks, digital signatures
- Repudiation: Audit logs, non-repudiation
- Information disclosure: Encryption, access control
- Denial of service: Rate limiting, resource quotas
- Elevation of privilege: Principle of least privilege

### Supply Chain Security
- Dependency scanning: Snyk, Dependabot, Trivy
- SBOM generation: CycloneDX or SPDX format
- Signed commits: GPG or SSH commit signing
- Artifact verification: Checksum validation, signature verification

### Secrets Management
- Secrets never in code — always in secrets manager (Vault, AWS Secrets Manager)
- Rotation policy: Rotate database credentials every 90 days
- Access audit: Log every secrets access, alert on anomalies
- Encryption at rest and in transit for all secrets
- Principle of least privilege: each service gets only its own secrets

## Rules
- Default-deny security posture — allow only explicitly required access.
- All inputs validated, all outputs encoded, all errors handled.
- Defend in depth — multiple layers of security controls.
- Fail securely — errors default to safe behavior.
- Log security-relevant events for audit and investigation.
- Keep dependencies updated — automate vulnerability scanning.
- Design for observability from day one, not as an afterthought.
- Document all architectural decisions with rationale.
- Review code for security, performance, and correctness before merging.