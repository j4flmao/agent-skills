# API Threats

## OWASP API Top 10 (2023)

### API1: Broken Object Level Authorization
Risk: user accesses or modifies another user's objects.
By changing object IDs in requests, attackers can access
data they shouldn't see.

Mitigation: validate `userId` from JWT `sub` claim
matches resource owner. Use UUIDs instead of sequential
IDs to prevent enumeration. Test by modifying object ID
in authenticated requests across different roles.

### API2: Broken Authentication
Risk: compromised credentials, weak token implementation,
no MFA, credential stuffing.

Mitigation: enforce strong password policy (min 12 chars).
Rate-limit login: 5/min per IP, 10/min per user.
Implement MFA for sensitive actions.
Use short-lived JWTs: 15 min access, 7 day refresh.
Rotate refresh tokens on each use.

### API3: Broken Object Property Level Authorization
Risk: API returns more fields than needed.
Excessive data exposure leaks sensitive information.

Mitigation: use response schemas per endpoint.
Never return password hashes, internal IDs, or PII.
Filter at API layer, not in client.
Use GraphQL field-level permissions.
Define response DTOs with only needed fields.

### API4: Unrestricted Resource Consumption
Risk: DoS via expensive queries, large payloads,
rate limit abuse.

Mitigation: paginate all list endpoints.
Cursor-based pagination preferred.
Limit request body size to 1MB max.
Rate limit per client and per endpoint.
Set query complexity limits for GraphQL.
Timeout expensive operations at 30s max.

### API5: Broken Function Level Authorization
Risk: regular user can access admin endpoints.

Mitigation: RBAC with least privilege.
Deny by default for all endpoints.
Test every role against every endpoint in CI.
Use declarative access control.
Admin endpoints on separate subdomain.

### API6: Unrestricted Access to Sensitive Business Flows
Risk: automated abuse — scalping, account spam,
fake engagement, promo abuse.

Mitigation: CAPTCHA for sensitive flows.
Rate-limit by IP and account.
Anomaly detection on business operations.
Velocity checks on purchases and account creation.

### API7: Server Side Request Forgery
Risk: API fetches user-supplied URLs.
Attacker makes server access internal resources.

Mitigation: validate URL against allowlist.
Block private IP ranges: 10.x, 172.16-31.x, 192.168.x.
Disable redirect following.
Use URL parsing library to prevent protocol smuggling.

### API8: Security Misconfiguration
Risk: missing security headers, debug endpoints,
CORS misconfigured, default credentials.

Mitigation: run security headers scan.
Disable debug mode and error traces in production.
Restrict CORS to known origins.
Automate config audits with CSP scanner.
Disable unused HTTP methods.

### API9: Improper Inventory Management
Risk: old API versions running unpatched.
Undocumented endpoints exposed.

Mitigation: maintain API inventory via OpenAPI spec.
Keep spec in sync with deployment.
Retire old versions with deprecation notice and sunset date.
Run DAST to detect undocumented endpoints.
Version URL path or use header.

### API10: Unsafe Consumption of APIs
Risk: API consumes compromised external service.
Malicious data returned and processed.

Mitigation: validate external responses against schema.
Timeout external calls at 5s max.
Circuit breaker for external dependencies.
Sanitize data before processing.
Pin external API versions.

## Common Vulnerabilities

### Injection Attacks
SQL injection: parameterized queries always.
Never string concatenation. Use ORM query builders.

NoSQL injection: validate operators.
Block `$where`, `$gt`, `$ne` in user input.

Command injection: avoid shell commands.
Use language-native APIs with array arguments.

LDAP injection: escape special characters.
Test all input points with injection fuzzing.

### JWT Attacks
Algorithm confusion: enforce RS256 or ES256.
Explicitly reject `alg: none`.
Reject symmetric algorithms for asymmetric setups.

Weak secret: use strong asymmetric keys.
2048-bit RSA or P-256 ECDSA minimum.

Token theft: short expiry of 15 min.
Bind token to client with JTI claim and fingerprint.
Use refresh token rotation (one-time use).

### Mass Assignment
Bind only allowed fields, not entire request body.
Use DTOs or input schemas per endpoint.
Whitelist updatable fields.
Never bind `role`, `isAdmin`, `accountBalance`.
Test by sending unexpected fields in requests.

### Excessive Data Exposure
Filter at API layer, never in client.
Use response schemas with only needed fields.
Never return auto-increment IDs or internal timestamps.
Implement GraphQL field-level permissions.

### Logging and Monitoring Gaps
Audit every auth decision and privilege escalation.
Monitor: failed login rate, unusual endpoint access,
payload sizes, slow response times (probing indicator).
Alert on: >10% auth failure rate, >100 429/min,
requests to undocumented endpoints.
