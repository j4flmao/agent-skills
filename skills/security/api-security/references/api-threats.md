# API Threats

## OWASP API Top 10 (2023)

### API1: Broken Object Level Authorization
Risk: user can access/modify another user's objects. Mitigation: validate user owns resource — `userId` must match JWT sub claim. Use UUIDs not sequential IDs. Test by modifying object ID in request.

### API2: Broken Authentication
Risk: compromised credentials, weak token implementation. Mitigation: enforce strong password policy, rate-limit login attempts, implement MFA, use short-lived JWTs (15 min), rotate refresh tokens.

### API3: Broken Object Property Level Authorization
Risk: excessive data exposure — API returns more fields than the client needs. Mitigation: use response schemas per endpoint (not generic models), never return password hashes, internal IDs, or PII unless explicitly needed.

### API4: Unrestricted Resource Consumption
Risk: DoS via expensive queries, large payloads, rate limit abuse. Mitigation: paginate list endpoints, limit request body size (e.g., 1MB), rate limit per client, timeout expensive operations.

### API5: Broken Function Level Authorization
Risk: regular user can access admin endpoints. Mitigation: RBAC with least privilege, deny by default, test all roles against all endpoints, use declarative access control (e.g., Spring Security method annotations).

### API6: Unrestricted Access to Sensitive Business Flows
Risk: automated abuse of business processes (scalping, account creation spam). Mitigation: CAPTCHA for sensitive flows, rate-limit by IP/account, anomaly detection on business operations.

### API7: Server Side Request Forgery
Risk: API fetches user-supplied URLs — attacker makes server access internal resources. Mitigation: validate URL against allowlist, block private IP ranges, disable redirect following, use URL parsing library.

### API8: Security Misconfiguration
Risk: missing security headers, debug endpoints enabled, CORS misconfigured. Mitigation: security headers scan, disable debug mode in production, restrict CORS to known origins, automate config audits.

### API9: Improper Inventory Management
Risk: old API versions running unpatched, undocumented endpoints exposed. Mitigation: maintain API inventory (OpenAPI spec), retire old versions with deprecation notice, scan for undocumented endpoints via DAST.

### API10: Unsafe Consumption of APIs
Risk: API consuming external API that is compromised or returns malicious data. Mitigation: validate external API responses against schema, timeout external calls (e.g., 5s), sanitize data before processing.

## Common Vulnerabilities

### Injection Attacks
SQL injection: parameterized queries always, never string concatenation. NoSQL injection: use query builders, validate operators. Command injection: avoid shell commands, use Node child_process with array args. LDAP injection: escape special characters, use safe APIs.

### JWT Attacks
Algorithm confusion: enforce RS256/ES256 — reject `alg: none`. Weak secret: use strong asymmetric keys, not `secret123`. Token theft: short expiry, bind token to client IP/user-agent, use refresh token rotation.

### Excessive Data Exposure
Filter at API layer, not in client. Use GraphQL field-level permissions. Never return auto-increment IDs, internal timestamps, or database columns unfiltered.

### Mass Assignment
Bind only allowed fields, not the entire request body. Use DTOs/input schemas per endpoint. Whitelist fields that can be updated.

### Logging and Monitoring Gaps
Audit every auth decision and privilege escalation. Monitor failed login rate, unusual endpoint access patterns, payload sizes, response times.
