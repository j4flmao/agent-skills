---
name: security-api-security
description: >
  Use this skill when asked about API security, OWASP API Top 10, rate limiting, API authentication, JWT security, OAuth2, API key management, API gateway, WAF, API abuse, request signing, or API threat modeling. This skill enforces: OWASP API Top 10 threat modeling, authentication/authorization patterns (JWT, OAuth2, API keys), rate limiting with tiered policies (token bucket, sliding window, per-user/per-endpoint), input validation and WAF rules, request signing, and audit logging. Do NOT use for: web application security (XSS, CSRF), network security (TLS, mTLS), or container security.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [security, backend, phase-10]
---

# Security API Security

## Purpose
Design comprehensive API security controls covering
OWASP API Top 10 threat modeling, authentication
(JWT, OAuth2, API keys), rate limiting (token bucket,
sliding window, per-user/per-endpoint), input validation
(JSON schema, allowlist), WAF rules (ModSecurity CRS),
request signing, and audit logging.

## Agent Protocol

### Trigger
Exact user phrases: "API security", "OWASP API Top 10",
"rate limiting", "API auth", "JWT security", "OAuth2",
"API gateway", "WAF", "API abuse", "API threat modeling",
"API protection", "API authentication", "API authorization",
"API keys", "OAuth2 API", "API gateway config",
"request signing", "API audit", "GraphQL security".

### Input Context
Before activating, verify:
- API style (REST, GraphQL, gRPC) and framework
- Authentication mechanism (JWT, OAuth2, session, API keys)
- API gateway (Kong, APIGW, Envoy, Nginx, AWS Gateway)
- Deployment environment and traffic patterns
- Compliance requirements (GDPR, PCI, SOC 2)
- Number of API consumers and tiers

### Output Artifact
API security checklist with threat model,
protection configuration, monitoring setup.

### Response Format
```yaml
# Threat model table
# Rate limit policy
# WAF rules
# Auth middleware config
# Audit log schema
```

No preamble. No postamble. No explanations. No filler/hedging/transitions.
Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Threat model completed against OWASP API Top 10
- [ ] Authentication mechanism selected and configured
- [ ] Authorization model with least privilege defined
- [ ] Rate limiting policy with tiered quotas
- [ ] Input validation rules for all endpoints
- [ ] WAF rules for API-specific attacks
- [ ] Audit logging and abuse monitoring configured
- [ ] Request signing for critical operations

### Max Response Length
300 lines of configuration and policy.

## Workflow

### Step 1: Threat Modeling (OWASP API Top 10)
Map each resource against OWASP API Top 10:

API1: Broken object-level authorization.
Check user owns resource via JWT sub claim.
Use UUIDs, not sequential IDs.

API2: Broken authentication.
Weak JWT, no MFA, no login rate limit.
Enforce strong passwords, short-lived tokens.

API3: Excessive data exposure.
Return only needed fields per endpoint.
Never return password hashes or internal IDs.

API4: Rate limiting.
No throttling leads to DoS.
Paginate lists, limit body size, rate limit.

API5: Broken function-level auth.
Deny by default, test all roles against all endpoints.

API6: Mass assignment.
Use DTOs, whitelist updatable fields only.

API7: Security misconfiguration.
CORS misconfigured, debug endpoints exposed.
Audit configs, disable debug in production.

API8: Injection.
SQL, NoSQL, command injection.
Parameterized queries, input validation.

API9: Improper asset management.
Old API versions running unpatched.
Maintain OpenAPI spec inventory.

API10: Unsafe consumption.
API consuming compromised external service.
Validate external responses, timeout calls.

### Step 2: Authentication
JWT: RS256 or ES256 asymmetric signing.
Access token: 15 min expiry.
Refresh token: 7 days with rotation.
Claims: sub, iss, aud, exp, iat, jti, scope.
Validate signature, expiry, issuer, audience on every request.

OAuth2 flows:
Authorization Code + PKCE for SPAs.
Client Credentials for M2M.
Device grant for CLI tools.
Rotate refresh tokens on each use.

API keys:
Cryptographically random, prefixed identifier.
Hashed at rest with bcrypt.
Rate-limited per key with tiered quotas.
Revocable with immediate invalidation.
Scoped to specific resources and actions.

Ban: basic auth, session cookies, JWT with alg: none.

### Step 3: Authorization
RBAC: roles assigned to users, permissions assigned to roles.
Deny by default, whitelist allowed actions.

ABAC: attribute-based fine-grained access.
Check resource owner, region, tier, time.

API gateway: validate JWT, extract scopes.
Pass claims upstream via request headers.

Service layer: check resource ownership.
`userId == resource.ownerId`.
Validate actions against role matrix.

Policy-as-code: OPA for cross-cutting authorization.
Organization-level and multi-resource policies.

Test: every role against every endpoint in CI.
Automated authorization fuzzing.
Regression test for each access control change.

### Step 4: Rate Limiting
Algorithms:
Sliding window log: most accurate, most memory.
Sliding window counter: accurate, efficient (default).
Token bucket: allows bursts, easy to understand.
Fixed window: simple but edge case bursts.

Per client: by API key, IP, or JWT sub claim.
Tiers: free (10/min), basic (100/min), premium (1000/min).
Burst: 2x rate with 503 on sustained overage.

Per endpoint: login (5/min), search (30/min), export (2/min).
Global: 10000 req/min per gateway instance.

Response: 429 Too Many Requests.
Headers: Retry-After, X-RateLimit-Limit, X-RateLimit-Remaining.

Distributed: Redis-based counter with consistent hashing.

### Step 5: Input Validation and WAF
Validation rules:
- Content-Type enforcement (application/json)
- Content-Length limits (1MB max)
- Schema validation (JSON Schema, Zod, Pydantic)
- String length limits (min and max)
- Numeric range checks
- Allowed enum values
- Regex format (email, phone, UUID)

Reject:
SQL injection patterns, NoSQL operators ($where, $gt).
XML external entities, path traversal (../).
Oversized payloads, parameter pollution.

WAF: OWASP ModSecurity CRS.
Paranoia level 1 for production (low false positives).
Paranoia level 4 for testing (maximum coverage).

API-specific WAF rules:
Block requests without Accept header.
Enforce Content-Type for POST/PUT.
Reject oversized payloads.
Block parameter pollution.
Rate limit by endpoint pattern.
Geo-block for admin endpoints.

### Step 6: Request Signing
For critical operations: payment, data deletion, config changes.

HMAC-based signing:
Client signs method + URI + body hash + timestamp.
Uses HMAC-SHA256 with shared secret.
Server recomputes and compares.
Reject if timestamp drift exceeds 5 minutes.

Prevents replay attacks, tampering, unauthorized source.
Middleware at gateway or service mesh sidecar.
Reference pattern: AWS Signature V4.

### Step 7: Audit Logging and Abuse Monitoring
Audit events:
Auth decisions (success, failure, reason).
Privilege escalation.
Sensitive data access.
Configuration changes.
API key creation and revocation.
Rate limit breaches.
WAF rule triggers.

Schema: timestamp, eventType, userId, clientIp,
resource, action, statusCode, userAgent, requestId.

Storage: append-only immutable log.
90 days hot retention, 1 year cold.

Alerts:
- Failed auth rate above 10%
- Over 100 429 responses per minute
- Unusual payload sizes
- New endpoint access patterns
- Geolocation anomalies

Dashboard: auth failure heatmap, rate limit hits,
top abused endpoints, WAF trigger trends.

## API Security Implementation Examples

### Express.js JWT Authentication Middleware
```javascript
const jwt = require('jsonwebtoken');

function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_PUBLIC_KEY, {
      algorithms: ['RS256'],
      issuer: 'https://auth.example.com',
      audience: 'api.example.com',
    });
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' });
  }
}
```

### Python FastAPI Rate Limiting with SlowAPI
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.get("/api/resource")
@limiter.limit("100/minute")
async def get_resource(request: Request):
    return {"data": "resource"}

@app.post("/api/login")
@limiter.limit("5/minute")
async def login(request: Request):
    return {"token": "..."}
```

### Go API Gateway JWT Validation
```go
func jwtMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        tokenStr := extractBearerToken(r)
        if tokenStr == "" {
            http.Error(w, "Missing token", http.StatusUnauthorized)
            return
        }
        claims := &Claims{}
        token, err := jwt.ParseWithClaims(tokenStr, claims, keyFunc)
        if err != nil || !token.Valid {
            http.Error(w, "Invalid token", http.StatusForbidden)
            return
        }
        ctx := context.WithValue(r.Context(), "user", claims)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
```

### Python Input Validation with Pydantic
```python
from pydantic import BaseModel, Field, EmailStr
from typing import Optional

class CreateUserRequest(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=100)
    age: int = Field(..., ge=0, le=150)
    role: str = Field(..., pattern="^(admin|user|viewer)$")

@app.post("/api/users")
async def create_user(user: CreateUserRequest):
    return {"id": uuid4(), **user.model_dump()}
```

## API Security Anti-Patterns

### Anti-Pattern: JWT with alg: none
JWT library configured to accept `alg: none` allows attackers to forge arbitrary tokens. Always enforce a specific algorithm (RS256 or ES256). Never accept `alg: none`. Validate algorithm on every token parse.

### Anti-Pattern: Sequential Numeric IDs
Using auto-increment IDs (1, 2, 3, ...) in URLs enables enumeration attacks: `GET /api/users/1`, `/api/users/2`. Use UUID v4 or ULID for all resource identifiers. Enforce object-level authorization checks.

### Anti-Pattern: Overly Permissive CORS
Setting `Access-Control-Allow-Origin: *` or reflecting the Origin header without validation allows any website to make cross-origin requests. Restrict to specific origins. Do not allow credentials with wildcard origins.

### Anti-Pattern: Rate Limiting at Application Only
Rate limiting implemented in application code can be bypassed by attacking the application server directly. Enforce rate limits at the API gateway or reverse proxy level (Nginx, Kong, Envoy). Application-level limits are defense-in-depth.

### Anti-Pattern: Returning Stack Traces
Detailed error messages and stack traces in API responses reveal implementation details, library versions, and code paths. Always return generic error messages to clients. Log detailed errors server-side.

### Anti-Pattern: No API Version Strategy
Changing API behavior without versioning breaks existing clients. Use URL prefix (`/api/v1/`, `/api/v2/`) or header-based versioning (`Accept: application/vnd.api+json;version=2`). Maintain deprecated versions with sunset headers.

### Anti-Pattern: Unauthenticated Health/Admin Endpoints
Health check, metrics, and admin endpoints exposed without authentication. `/actuator`, `/health`, `/metrics`, `/swagger-ui.html` leak information. Secure all endpoints including operational ones.

## API Security Maturity Model

### Level 1: Basic
- Basic auth or API keys
- No rate limiting
- No input validation
- No audit logging
- Default CORS policy

### Level 2: Standard
- JWT authentication (RS256)
- Rate limiting per endpoint
- Input validation with schema
- Basic CORS restrictions
- Request logging

### Level 3: Advanced
- OAuth2 with PKCE
- RBAC/ABAC authorization
- Rate limiting per user + per endpoint (distributed)
- WAF with API-specific rules
- Request signing for critical operations
- Audit logging with alerting

### Level 4: Optimized
- Zero-trust API architecture
- Behavioral anomaly detection
- Adaptive rate limiting (ML-based)
- API security mesh (service mesh + WAF + API gateway)
- Automated threat response
- Continuous API discovery and shadow API detection

## API Security Operations

### Daily Operations
- Monitor rate limit breach alerts
- Review auth failure spikes (may indicate credential stuffing)
- Check WAF block trends for new attack patterns
- Verify API gateway health

### Weekly Operations
- Review audit logs for suspicious access patterns
- Analyze rate limit hit distribution by consumer tier
- Tune WAF rules for false positives
- Review new API endpoints added in last week

### Monthly Operations
- OWASP API Top 10 review for all new endpoints
- Rotate API keys for privileged consumers
- Review and update rate limit tiers
- Penetration test of critical API endpoints
- API inventory reconciliation (discover shadow APIs)

### Incident Response
1. Detect: rate limit breach, auth failure spike, WAF block surge, anomalous payload patterns
2. Assess: identify affected endpoints, consumer, data potentially exposed
3. Contain: revoke compromised keys, block IP/subnet, enable maintenance mode for affected endpoints
4. Investigate: audit logs, WAF logs, gateway access logs
5. Remediate: patch vulnerability, update WAF rules, rotate all affected credentials
6. Post-mortem: write incident report, update threat model, improve detection rules

## Rules
- No hardcoded secrets, API keys, or tokens in code
- JWT validated on every request — signature, expiry, issuer
- Rate limits enforced at gateway, not application
- Input validation rejects early, fails securely
- Audit logs include every auth decision
- Default deny for endpoints unless explicitly permitted
- API versioning: never remove old versions without migration
- Sensitive data filtered from responses by default
- Request signing for idempotent-critical endpoints
- OWASP API Top 10 review on every new endpoint

## References
  - references/api-auth-patterns.md — API Authentication Patterns
  - references/api-protection.md — API Protection
  - references/api-security-advanced.md — Api Security Advanced Topics
  - references/api-security-fundamentals.md — Api Security Fundamentals
  - references/api-security-testing.md — API Security Testing Patterns
  - references/api-threats.md — API Threats
  - references/graphql-security.md — GraphQL Security
  - references/oauth2-deep-dive.md — OAuth2 Deep Dive
## Handoff
`security-sast-dast` for API-specific DAST scanning
`backend-api-design` for endpoint design and versioning
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