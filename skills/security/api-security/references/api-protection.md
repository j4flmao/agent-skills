# API Protection

## Authentication Patterns

### JWT Authentication
```typescript
// JWT validation middleware
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
Claims: `sub` (user ID), `iss` (issuer), `aud` (audience), `exp` (expiry), `iat` (issued at), `jti` (token ID), `scope` (permissions).

### OAuth2 Flows
Authorization Code + PKCE: for SPAs and mobile apps. Client Credentials: for machine-to-machine API access. Resource Owner Password: legacy, not recommended. Refresh Token: rotate on use, one-time use, bound to client.

### API Key Authentication
Generate: cryptographically random, prefixed with service identifier. Store: hash in database (bcrypt or SHA-256). Rate limit: per key with tiered quotas. Revoke: immediate invalidation, audit reason.

## Rate Limiting

### Algorithm Comparison
- Sliding Window Log: most accurate, most memory
- Sliding Window Counter: accurate, memory efficient (default)
- Token Bucket: allows bursts, easy to understand
- Fixed Window: simple but allows edge case bursts

### Configuration
```yaml
rate_limits:
  free_tier:
    requests_per_minute: 10
    burst: 20
    window: 60
  premium_tier:
    requests_per_minute: 100
    burst: 200
    window: 60
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

## WAF Configuration

### OWASP ModSecurity CRS
Rules: 920000 (protocol enforcement), 921000 (HTTP protection), 930000 (LFI attacks), 931000 (RCE attacks), 932000 (RCE via injection), 933000 (PHP injection), 941000 (XSS), 942000 (SQL injection), 943000 (session fixation). Paranoia level: 1 (low false positives) for production, 4 (max rules) for testing.

### API-Specific Rules
- Block requests with no accept header
- Enforce content-type: application/json for POST/PUT
- Reject oversized payloads (>1MB)
- Block parameter pollution (duplicate params with different values)
- Rate limit by endpoint pattern

## Input Validation

### Schema Validation
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
- Content-Type enforcement
- Content-Length limits
- Schema validation for all request bodies
- String length limits
- Numeric range checks
- Allowed enum values
- Regex patterns for format validation (email, phone, UUID)

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
- Authentication attempts (success and failure)
- Privilege escalation
- Data access to sensitive endpoints
- Configuration changes
- API key creation/revocation
- Rate limit threshold breaches
- WAF rule triggers
