---
name: backend-auth-patterns
description: >
  Use this skill when the user says 'auth', 'authentication', 'authorization', 'JWT', 'OAuth', 'RBAC', 'permissions', 'login', 'session', 'refresh token', 'guard', 'middleware auth', or when implementing or reviewing authentication and authorization. This skill enforces: JWT structure and validation, refresh token rotation, OAuth2/OIDC flows, RBAC vs ABAC decision, middleware placement, and password security. Applies to any backend stack. Do NOT use for: specific OAuth provider implementation details, frontend auth UI, or passwordless login flows.
version: "1.0.0"
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
Before activating, verify:
- The application type is known (SPA, mobile, M2M, server-rendered).
- The security requirements level is known (basic auth, enterprise SSO, API-key M2M).
- Existing auth infrastructure (if any) is described.

### Output Artifact
No file output. Produces auth design as text.

### Response Format
```
Auth strategy: {strategy name}
Rationale: {one sentence}
Token structure: {claims}
Auth middleware: {location and logic}
Authorization model: {model name and role/permission list}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick. No explanations of auth theory.

### Completion Criteria
- [ ] Auth strategy selected based on application type.
- [ ] Token structure defined with minimum viable claims.
- [ ] Refresh token rotation specified.
- [ ] Authorization model defined (RBAC or ABAC).
- [ ] Auth middleware placement specified (Infrastructure layer).
- [ ] Password hashing algorithm specified (bcrypt/argon2).
- [ ] Brute force protection specified.
- [ ] No secrets hardcoded in any code example.

### Max Response Length
Auth design: 12 lines maximum.

## Workflow

### Step 1: Choose Auth Strategy
| Application Type | Strategy | Token Type |
|---|---|---|
| SPA (browser) | JWT + Refresh Token | Access in memory, Refresh in httpOnly cookie |
| Mobile app | JWT + Refresh Token | Both in secure storage |
| M2M service | API Key or Client Credentials | Static key or short-lived JWT |
| Server-rendered app | Session + Cookie | Session ID in signed cookie |
| Third-party login | OAuth2 / OIDC | Delegated to provider |
| Enterprise SSO | OIDC with SAML | Delegated to IdP |

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
- Refresh token is single-use. Rotate on every refresh. If a used refresh token is presented again, invalidate ALL tokens for that user (token reuse detection).

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

Implementation pseudocode:
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

  // Verify token hasn't expired
  if (stored.expiresAt < new Date()) {
    throw new UnauthorizedError('Refresh token expired.');
  }

  // Mark current token as consumed
  await tokenRepository.markConsumed(refreshToken);

  // Issue new tokens
  const user = await userRepository.findById(stored.userId);
  const accessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken(user);

  await tokenRepository.save({ token: newRefreshToken, userId: user.id, expiresAt: /* 7 days */ });

  return { accessToken, refreshToken: newRefreshToken };
}
```

### Step 4: Authorization Model

RBAC (Role-Based Access Control):
- Default for most applications. Simple, auditable.
- Roles: admin, manager, user, guest.
- Each role has a set of permissions.
- Guard checks: does the user's role have this permission?

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

ABAC (Attribute-Based Access Control):
- Use when RBAC insufficient (multi-tenant, document-level permissions).
- Policy engine evaluates: user attributes + resource attributes + environment.
- More flexible but significantly more complex.

```python
# ABAC policy example
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
- Auth middleware belongs in Infrastructure layer. Not in Domain. Not in Application.
- Auth decisions (permissions) belong in Application layer use cases.
- Domain entities have no auth logic.

```typescript
// Express middleware example
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

export async function verifyPasswordArgon2(plain: string, hashed: string): Promise<boolean> {
  return argon2.verify(hashed, plain);
}
```

### Step 7: Rate Limiting Auth Endpoints
```typescript
// Rate limit configuration
const AUTH_RATE_LIMITS = {
  login: { window: '5 minutes', max: 5 },
  register: { window: '60 minutes', max: 2 },
  refresh: { window: '1 minute', max: 10 },
  passwordReset: { window: '60 minutes', max: 3 },
};

// Implementation with express-rate-limit
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: 'RATE_LIMITED', message: 'Too many login attempts. Try again later.' },
  keyGenerator: (req) => req.ip,
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
  name: 'sid', // Custom cookie name, not default 'connect.sid'
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
```

## Architecture Decision Trees

### Auth Strategy Selection
```
Browser-based SPA?
  +-- Yes -> JWT with refresh tokens in httpOnly cookies (prevents XSS token theft)
  +-- No  -> Mobile app?
      +-- Yes -> JWT with refresh tokens in secure device storage (Keychain/Keystore)
      +-- No  -> Server-side rendered app?
          +-- Yes -> Session-based auth with Redis store (simpler, CSRF protection built-in)
          +-- No  -> M2M service?
              +-- Yes -> API Key (simple) or OAuth2 Client Credentials (standard)
```

### Token Signing Algorithm
```
Single service / monolith?
  +-- Yes -> HMAC with HS256 (simpler, faster, one secret to manage)
  +-- No  -> Multiple services?
      +-- Yes -> RSA with RS256 or EC with ES256 (public key distribution, no shared secret)
```

### Authorization Model
```
Simple role hierarchy sufficient?
  +-- Yes -> RBAC (simpler, auditable, most apps)
  +-- No  -> Multi-tenant or document-level permissions needed?
      +-- Yes -> ABAC (flexible but complex, policy engine required)
      +-- No  -> ReBAC (relationship-based, good for social/graph apps)
```

## Common Pitfalls

1. **Storing tokens in localStorage**: XSS vulnerability. Attackers can read localStorage. Use httpOnly cookies for SPA refresh tokens.

2. **Not validating token signature**: Accepting any JWT without verifying the signature. Always verify with the correct public key or secret.

3. **Ignoring token expiry**: Never trust client-side expiry. Always verify `exp` claim server-side.

4. **Refresh token without rotation**: Static refresh tokens never changed. If stolen, attacker has permanent access.

5. **No rate limiting on auth endpoints**: Allows brute force password guessing. Always rate limit per IP and per user.

6. **Logging passwords in plaintext**: Accidentally logging request bodies that contain passwords. Mask or exclude sensitive fields.

7. **JWT with user data in claims**: PII (email, phone, address) in JWT claims exposed to all services that verify the token.

8. **Secret hardcoded in source**: JWT secret, API keys, DB passwords in git history. Always use environment variables or secrets manager.

9. **Session fixation not prevented**: Regenerate session ID on login to prevent session fixation attacks.

10. **Missing CSRF protection for cookie-based auth**: Cookie-based sessions need CSRF tokens. SameSite=Strict mitigates most cases.

## Best Practices

1. **Hash passwords with bcrypt (cost >= 12) or argon2id**.
2. **JWTs are short-lived: 15 minutes for access tokens. 7 days max for refresh tokens**.
3. **Every request validated server-side. Client never trusted for identity**.
4. **httpOnly, Secure, SameSite=Strict cookies for browser refresh tokens. No localStorage**.
5. **Log every auth failure: timestamp, user ID (if available), IP, reason. Never log password/token**.
6. **Brute force protection on login mandatory. IP rate limiting. Account lockout after 5 failures**.
7. **Token reuse detection: invalidate all tokens when refresh token reuse detected**.
8. **API keys have least privilege: scoped to specific actions and resources**.
9. **Audit trail for all authorization changes: role assignments, permission changes**.

## Compared With

| Feature | JWT + Refresh | Session Cookies | OAuth2 / OIDC |
|---|---|---|---|
| Stateful/Stateless | Stateless (access), Stateful (refresh) | Stateful | Stateless |
| Scalability | Excellent | Requires shared session store | Excellent |
| XSS protection | Requires httpOnly cookie | httpOnly cookie | Delegated |
| CSRF protection | Via configuration | Via tokens | Via state param |
| Mobile support | Native | Requires webview | Native SDK |
| Token revocation | Blacklist required | Immediate | Per-provider |
| Implementation complexity | Moderate | Low | High |

## Performance

- Token verification cost: HS256 ~0.01ms, RS256 ~0.1ms, ES256 ~0.05ms per verification.
- bcrypt verification: ~10ms per attempt (cost=12). Rate limiting reduces attack surface to negligible.
- Session lookup: Redis <1ms per lookup. Use connection pooling for high throughput.
- Token blacklist: Store in Redis with TTL matching token expiry. Bloom filter for high-traffic systems.
- API key lookup: Hash API keys before storing. Use constant-time comparison on lookup.

## Tooling

| Tool | Purpose |
|---|---|
| **jsonwebtoken** | JWT creation and verification (Node.js) |
| **bcrypt / argon2** | Password hashing |
| **express-rate-limit** | Rate limiting middleware |
| **helmet** | HTTP security headers |
| **connect-redis** | Redis session store |
| **csurf / csrf-csrf** | CSRF protection |
| **express-session** | Session middleware |
| **passport.js** | Strategy-based auth middleware |
| **keycloak-connect** | Keycloak integration |
| **auth0** | Auth0 integration SDK |
| **jose** | JOSE standards library (JWT, JWE, JWK) |

## Rules

- Never store plaintext passwords. Always hash with bcrypt (cost >= 10) or argon2id.
- JWTs are short-lived. 15 minutes for access tokens. 7 days maximum for refresh tokens.
- Every request is validated server-side. The client is never trusted to provide identity.
- For browser apps: use httpOnly, Secure, SameSite=Strict cookies for refresh tokens. Do NOT store tokens in localStorage.
- Log every auth failure with: timestamp, user ID (if available), IP address, failure reason. Never log the password or token.
- Brute force protection on login is mandatory. IP-based rate limiting. Account lockout after 5 failures.
- Refresh tokens are single-use with rotation. Token reuse detection invalidates all sessions.
- Auth middleware belongs in Infrastructure layer.
- Secrets are always from environment variables or secrets manager, never from code.
- Authorization decisions based on permissions, never on role names directly.
- CSRF protection for all cookie-based authentication.
- Password reset tokens expire in 15 minutes and are single-use.
- MFA should be configurable per user for elevated operations.
- Session IDs are randomly generated with sufficient entropy (crypto.randomUUID or equivalent).

## References
  - references/auth-patterns-oauth2-openid.md — Auth Patterns: OAuth2 and OpenID Connect
  - references/auth-patterns-session-management.md — Auth Patterns: Session Management
  - references/auth-oauth2.md — OAuth2 Flows
  - references/auth-passwordless.md — Passwordless Authentication
  - references/auth-testing.md — Authentication Testing
  - references/jwt-oauth-guide.md — JWT and OAuth Guide
  - references/oidc-flows.md — OIDC Flows
  - references/rbac-abac.md — RBAC vs ABAC

## Handoff
No artifact produced.
Next skill: backend-testing — test auth flows, verify auth middleware, test rate limiting.
Carry forward: auth strategy, token structure, authorization model, middleware implementation details.
