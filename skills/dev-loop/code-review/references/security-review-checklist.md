# Security Review Checklist

## Authentication & Authorization
- [ ] Authentication enforced on all endpoints
- [ ] No hardcoded credentials, API keys, or tokens in code
- [ ] JWT validation includes signature, expiry, issuer, audience
- [ ] Role-based access control (RBAC) checked on every protected route
- [ ] Privilege escalation paths identified and blocked
- [ ] Session management — secure cookies, HttpOnly, SameSite, expiry
- [ ] Multi-factor authentication for sensitive operations
- [ ] OAuth 2.0 / OIDC flow validated — no CSRF in redirect URIs

## Input Validation
- [ ] All user input validated (type, length, format, range)
- [ ] SQL/NoSQL injection prevented — parameterized queries only
- [ ] XSS prevention — output encoding, CSP headers, sanitization
- [ ] Command injection — no shell execution with user input
- [ ] File upload — type validation, size limit, malware scanning, path traversal
- [ ] SSRF — URL allowlist, no internal network exposure
- [ ] XML external entity (XXE) protection
- [ ] Deserialization — type allowlist, no unsafe deserialization

## Data Protection
- [ ] Sensitive data encrypted at rest (AES-256) and in transit (TLS 1.3)
- [ ] PII masked in logs and error responses
- [ ] Secrets stored in vault/secret manager, not config files
- [ ] Database encryption — TDE or column-level encryption for sensitive fields
- [ ] Backup encryption and secure offsite storage
- [ ] Data retention and deletion policies implemented

## API Security
- [ ] Rate limiting applied per user/IP/endpoint
- [ ] CORS configured restrictively (origin allowlist)
- [ ] API versioning to prevent backward compatibility attacks
- [ ] Request size limits enforced
- [ ] Webhook payloads validated and signed
- [ ] GraphQL depth limiting and query cost analysis
- [ ] Pagination limits to prevent data scraping

## Dependency Security
- [ ] All dependencies scanned for known vulnerabilities
- [ ] No deprecated or unmaintained packages
- [ ] Lock files committed (package-lock.json, yarn.lock, Cargo.lock)
- [ ] Supply chain attacks — package integrity verified
- [ ] SBOM generated for production artifacts

## Logging & Monitoring
- [ ] Security-relevant events logged (auth, authorization failures, data changes)
- [ ] No sensitive data in logs (passwords, tokens, PII)
- [ ] Log injection prevention — sanitize log inputs
- [ ] Alerts configured for security events (auth failures, rate limit breaches)
- [ ] Audit trail for privileged operations

## Infrastructure Security
- [ ] Network segmentation — least privilege for service-to-service communication
- [ ] Container images scanned for vulnerabilities
- [ ] Secrets injected at runtime, not baked into images
- [ ] TLS termination configured correctly (no weak ciphers)
- [ ] WAF rules applied for common web attacks
- [ ] Security groups / firewall rules restrict access to necessary ports
