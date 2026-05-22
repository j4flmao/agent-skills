---
name: security-api-security
description: >
  Use this skill when asked about API security, OWASP API Top 10, rate limiting, API authentication, JWT security, API gateway, WAF, API abuse, or API threat modeling. This skill enforces: OWASP API Top 10 threat modeling, authentication/authorization patterns (JWT, OAuth2, API keys), rate limiting with tiered policies, input validation and WAF rules, and audit logging. Do NOT use for: web application security (XSS, CSRF), network security (TLS, mTLS), or container security.
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
Design comprehensive API security controls covering threat modeling, auth, rate limiting, input validation, WAF configuration, and monitoring.

## Agent Protocol

### Trigger
Exact user phrases: "API security", "OWASP API Top 10", "rate limiting", "API auth", "JWT security", "API gateway", "WAF", "API abuse", "API threat modeling", "API protection", "API authentication", "API authorization", "API keys", "OAuth2 API", "API gateway config".

### Input Context
Before activating, verify:
- API style (REST, GraphQL, gRPC) and framework (Express, Spring, FastAPI)
- Authentication mechanism (JWT, OAuth2, session, API keys)
- API gateway (Kong, APIGW, Envoy, Nginx)
- Deployment environment and traffic patterns
- Compliance requirements (GDPR, PCI, SOC 2)

### Output Artifact
API security checklist with threat model, protection configuration, monitoring setup.

### Response Format
```yaml
# Threat model table
# Rate limit policy
# WAF rules
# Auth middleware config
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Threat model completed against OWASP API Top 10
- [ ] Authentication mechanism selected and configured
- [ ] Authorization model with least privilege defined
- [ ] Rate limiting policy with tiered quotas
- [ ] Input validation rules for all endpoints
- [ ] WAF rules for API-specific attacks
- [ ] Audit logging and abuse monitoring configured

### Max Response Length
300 lines of configuration and policy.

## Workflow

### Step 1: Threat Modeling (OWASP API Top 10)
Map each API resource against: API1 (broken object-level auth), API2 (broken authentication), API3 (excessive data exposure), API4 (rate limiting), API5 (broken function-level auth), API6 (mass assignment), API7 (security misconfiguration), API8 (injection), API9 (improper asset management), API10 (unsafe consumption of APIs). Document mitigations per risk.

### Step 2: Authentication
JWT: RS256 or ES256 (asymmetric), short expiry (15 min for access, 7 days for refresh), include `iat`, `exp`, `iss`, `sub`, `jti` claims. OAuth2: authorization code flow with PKCE for SPA, client credentials for machine-to-machine. API keys: for external developer access — rate-limited, revocable, scoped to resources. Ban: basic auth, session cookies for APIs.

### Step 3: Authorization
RBAC: roles assigned to users, permissions assigned to roles. ABAC: attribute-based for fine-grained access (resource owner, region, tier). API gateway: validate JWT, extract scopes, pass claims upstream. Service layer: check resource ownership, validate action permissions. Pattern: deny by default, whitelist allowed actions.

### Step 4: Rate Limiting
Per client: by API key, IP, or JWT sub claim. Tiers: free (10 req/min), basic (100 req/min), premium (1000 req/min). Burst: allow 2x rate with 503 on sustained overage. Global: 10000 req/min per gateway instance. Algorithm: sliding window (preferred) or token bucket. Response: `429 Too Many Requests` with `Retry-After` header.

### Step 5: Input Validation and WAF
Validate: content-type, content-length, schema validation (JSON Schema, OpenAPI), string length, numeric ranges, allowed values. Reject: SQL injection patterns, NoSQL injection, XML external entities, path traversal, large payloads. WAF rules: block known attack patterns (ModSecurity CRS), rate limit by endpoint, block anomalous parameters.

### Step 6: Audit and Monitoring
Audit: every auth decision, privilege escalation, data access to sensitive endpoints. Log: timestamp, client IP, user ID, resource, action, status, response size. Monitoring: failed auth rate, 403/429 response rate, unusual payload sizes, new endpoint access patterns. Alert: >10% auth failure rate, >100 429/min, suspicious payload patterns.

## Rules
- No hardcoded secrets, API keys, or tokens in code
- JWT validated on every request — signature, expiry, issuer
- Rate limits enforced at gateway, not application
- Input validation rejects early, fails securely
- Audit logs include every auth decision
- Default deny for endpoints unless explicitly permitted
- API versioning: never remove old versions without migration
- Sensitive data filtered from responses by default

## References
- `references/api-threats.md` — OWASP API Top 10, common vulnerabilities, threat modeling
- `references/api-protection.md` — Auth patterns, rate limiting, WAF, input validation, audit

## Handoff
`security-sast-dast` for API-specific scanning (DAST against endpoints)
`backend-api-design` for endpoint design conventions and versioning
