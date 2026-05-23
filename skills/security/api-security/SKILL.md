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
- `references/api-threats.md`
  OWASP API Top 10, common vulnerabilities, threat modeling
- `references/api-protection.md`
  Auth patterns, rate limiting, WAF, input validation,
  request signing, audit

## Handoff
`security-sast-dast` for API-specific DAST scanning
`backend-api-design` for endpoint design and versioning
