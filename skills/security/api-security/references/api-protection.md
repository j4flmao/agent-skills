# API Protection

## Authentication Patterns

### JWT Authentication
```typescript
function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = extractBearerToken(req.headers.authorization);
  try {
    const decoded = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
      issuer: 'auth.myapp.com',
      maxAge: '15m'
    });
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}
```
Claims: `sub` (user ID), `iss` (issuer), `aud` (audience), `exp` (expiry), `iat` (issued at), `jti` (token ID — unique per token), `scope` (permissions), `client_id` (OAuth client). Validate: signature, expiry, issuer, audience, not-before-time.

### OAuth2 Flows
Authorization Code + PKCE: for SPAs and mobile apps — code challenge prevents interception. Client Credentials: for machine-to-machine API access — no user context. Resource Owner Password: legacy flow, not recommended. Device Authorization Grant: for CLI/headless clients. Refresh Token Rotation: rotate refresh token on each use, one-time use only, bound to client ID. Token introspection: validate token status (active, expired, revoked).

### API Key Authentication
Generate: cryptographically random, prefixed with service identifier (sk_live_abc123). Store: hash in database (bcrypt recommended). Rate limit: per key with tiered quotas. Revoke: immediate invalidation, audit reason. Scope: restrict to specific resources and actions. Rotate: optional periodic rotation for high-security keys.

## Rate Limiting

### Algorithm Comparison
Sliding Window Log: most accurate (tracks every request timestamp), most memory. Sliding Window Counter: accurate, memory efficient (default choice). Token Bucket: allows bursts, easy to understand. Fixed Window: simple but allows edge case bursts at window boundaries.

### Configuration
```yaml
rate_limits:
  free_tier:
    requests_per_minute: 10
    burst: 20
    window: 60
  basic_tier:
    requests_per_minute: 100
    burst: 200
  premium_tier:
    requests_per_minute: 1000
    burst: 2000
  per_endpoint:
    login: 5 per minute
    search: 30 per minute
    data_export: 2 per minute
  global:
    requests_per_minute: 10000
    burst: 15000
```

### Response Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1716388800
Retry-After: 45
```
429 Too Many Requests with JSON body: `{"error":"RATE_LIMITED","retry_after":45}`.

## Request Signing

### HMAC Signature
Client: sign `HTTP method + URI + body hash + timestamp` with shared secret. Include in `X-Signature` and `X-Timestamp` headers. Server: recompute signature, compare, reject if >5 min timestamp drift. Prevents replay attacks, tampering, and unauthorized sources. Pattern: AWS Signature V4 as reference implementation.

### Implementation
```typescript
const signature = crypto
  .createHmac('sha256', secret)
  .update(method + path + bodyHash + timestamp)
  .digest('hex');
headers['X-Signature'] = signature;
headers['X-Timestamp'] = timestamp;
```

## WAF Configuration

### OWASP ModSecurity CRS
Rule categories: 920000 (protocol enforcement), 921000 (HTTP protection), 930000 (LFI attacks), 931000 (RCE attacks), 932000 (RCE via injection), 933000 (PHP injection), 941000 (XSS), 942000 (SQL injection), 943000 (session fixation). Paranoia level: 1 for production (low false positives), 4 for testing (maximum coverage). Custom rules for API-specific attacks.

### API-Specific WAF Rules
Block requests with no Accept header. Enforce Content-Type: application/json for POST/PUT/PATCH. Reject oversized payloads (>1MB). Block parameter pollution (duplicate params with different values). Rate limit by endpoint pattern (`/api/v1/login`, `/api/v1/search`). Block known bad IP ranges and ASNs. Geo-block for admin endpoints.

## Input Validation

### Schema Validation (Zod)
```typescript
const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100).trim(),
  age: z.number().int().positive().max(150).optional(),
  role: z.enum(['user', 'admin']).default('user')
});

function validate(schema: ZodSchema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        details: result.error.flatten().fieldErrors
      });
    }
    req.validatedBody = result.data;
    next();
  };
}
```

### Validation Rules
Content-Type enforcement, Content-Length limits (1MB max), schema validation for all request bodies, string length limits (min/max), numeric range checks (min/max), allowed enum values, regex format validation (email, phone, UUID).

## Audit Logging

### Audit Event Schema
```json
{
  "timestamp": "2026-05-22T12:00:00Z",
  "eventType": "AUTH_LOGIN",
  "userId": "user_abc123",
  "clientIp": "203.0.113.42",
  "resource": "/api/v1/orders",
  "action": "POST",
  "statusCode": 201,
  "userAgent": "Mozilla/5.0..."
}
```

### Events to Audit
Authentication attempts (success and failure). Privilege escalation (role change, permission grant). Data access to sensitive endpoints (PII, financial). Configuration changes (rate limits, WAF rules). API key creation and revocation. Rate limit threshold breaches. WAF rule triggers.
