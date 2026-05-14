# Security Review Checklist

## Design Phase

### Authentication
- [ ] Password policy: min 12 chars, complexity, hashing (bcrypt/argon2)
- [ ] MFA enforced for admin roles
- [ ] Session management: secure cookie flags (HttpOnly, Secure, SameSite)
- [ ] Token lifecycle: short-lived access tokens, refresh token rotation
- [ ] Rate limiting on auth endpoints (login, register, password reset)

### Authorization
- [ ] RBAC or ABAC model defined
- [ ] Principle of least privilege enforced
- [ ] Vertical access control (admin vs user)
- [ ] Horizontal access control (user A cannot access user B's data)
- [ ] API keys scoped to specific permissions

### Data
- [ ] Data classification: public, internal, confidential, restricted
- [ ] Encryption at rest (AES-256 for sensitive data)
- [ ] Encryption in transit (TLS 1.2+)
- [ ] PII minimization: collect only what is needed
- [ ] Data retention and deletion policy

## Development Phase

### Code Review
- [ ] No hardcoded secrets, keys, tokens
- [ ] Input validation on all public endpoints
- [ ] Output encoding (prevent XSS)
- [ ] Parameterized queries (prevent SQL injection)
- [ ] No eval/exec with user input
- [ ] File upload validation (type, size, path traversal)
- [ ] CSRF tokens for state-changing operations
- [ ] Secure headers: HSTS, CSP, X-Frame-Options, X-Content-Type-Options

### Dependency
- [ ] All dependencies scanned (Snyk, Dependabot, Trivy)
- [ ] No known critical vulnerabilities
- [ ] License compliance reviewed
- [ ] Dependency pinning (lock files committed)

## Testing Phase

### SAST
- [ ] All code paths scanned (SonarQube, Semgrep, CodeQL)
- [ ] Zero critical/high findings
- [ ] Medium findings have remediation plan

### DAST
- [ ] OWASP Top 10 scan completed
- [ ] API endpoints tested for IDOR
- [ ] Authentication/authorization bypass tested

### Dependency Scan
- [ ] CVE scan on all dependencies
- [ ] Container image scan (Trivy, Grype)
- [ ] IaC scan (Checkov, tfsec)
