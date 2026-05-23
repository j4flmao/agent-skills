# Security Audit Checklist

## Authentication & Authorization

### Authentication
- [ ] Password hashing with bcrypt (cost >= 12), argon2id, or scrypt
- [ ] No MD5, SHA1, or unsalted hashes for passwords
- [ ] Brute force protection on login (rate limiting, account lockout)
- [ ] MFA available for admin and sensitive actions
- [ ] Password reset tokens: single-use, short expiry (15 min), cryptographically random
- [ ] Account enumeration prevention: consistent error messages for existent/non-existent users
- [ ] Session management: httpOnly, Secure, SameSite cookies
- [ ] Session timeout after inactivity (15-30 min for sensitive apps)
- [ ] JWT: signed with RS256/ES256 (not just base64-encoded), short expiry (< 15 min)
- [ ] Refresh tokens: rotation, server-side storage, revocation
- [ ] API key rotation policy and expiration

### Authorization
- [ ] Every endpoint has explicit authorization check (not UI hiding)
- [ ] Object-level access control (IDOR prevention) — users can't access other users' data
- [ ] Role-based or attribute-based access control implemented
- [ ] Principle of least privilege — no excessive permissions
- [ ] No hardcoded admin API keys or backdoors
- [ ] CORS properly configured (not `Access-Control-Allow-Origin: *` for authenticated endpoints)
- [ ] Rate limiting on all endpoints (differentiated per user/IP)

## Input Validation & Output Encoding

### Injection Prevention
- [ ] All SQL queries use parameterized statements or ORM
- [ ] No string concatenation in NoSQL queries, LDAP queries, or shell commands
- [ ] No eval(), setTimeout(string), or Function(string) with user input
- [ ] Path traversal prevention — file operations use allowlisted paths
- [ ] Command injection prevention — use child_process with array args (not shell strings)

### Input Validation
- [ ] Every user-facing input validated: type, length, format, range
- [ ] Upload validation: file type (magic bytes, not extension), size limit, scan for malware
- [ ] Server-side validation in addition to client-side (never trust the client)
- [ ] Structured input parsing (JSON schema, Zod, Pydantic) rather than manual parsing
- [ ] GraphQL depth limiting and query cost analysis

### Output Encoding
- [ ] XSS prevention: context-aware encoding for HTML, JS, CSS, URL
- [ ] Content-Type headers correct (no content-type sniffing)
- [ ] CSP headers set: `script-src 'self'`, `object-src 'none'`, etc.
- [ ] JSON output: no user data in error messages, no stack traces

## Data Protection

### Encryption
- [ ] TLS 1.2+ enforced everywhere (no HTTP for sensitive data)
- [ ] HSTS header set with `includeSubDomains`
- [ ] PII encrypted at rest (database-level or application-level encryption)
- [ ] Encryption keys managed through KMS or vault (not in code or config files)
- [ ] Secrets never in code, config files, or environment variables in plaintext

### Data Handling
- [ ] Credit card/PII: no logging, no storage without explicit business need
- [ ] Data retention and deletion policies implemented
- [ ] Database backups encrypted
- [ ] Secrets rotated on a schedule
- [ ] `.env` files excluded from git via `.gitignore`
- [ ] `.gitignore` includes common secret file patterns

## Network & Infrastructure

### Network Security
- [ ] Internal services not exposed to public internet
- [ ] Database ports firewalled from public access
- [ ] API gateway handles TLS termination
- [ ] Service-to-service authentication (mTLS or service mesh)
- [ ] DDoS protection (rate limiting, WAF, CDN)
- [ ] Internal endpoints admin-only (debug, health, metrics)

### Container Security
- [ ] Container runs as non-root user
- [ ] Base images pinned to specific versions (not `latest`)
- [ ] Image scanned for vulnerabilities in CI
- [ ] Read-only root filesystem where possible
- [ ] Security context: no privileged mode, no host network access
- [ ] Secrets injected at runtime, not baked into images

### Cloud Security
- [ ] IAM roles with least privilege (no wildcard `*` permissions)
- [ ] S3 buckets not publicly accessible unless explicitly required
- [ ] Security groups restrictive (allow only necessary ports)
- [ ] CloudTrail / audit logging enabled
- [ ] Infrastructure defined as code (Terraform, CloudFormation) — not manual provisioning

## Dependency Management

- [ ] `npm audit` / `pip-audit` / `cargo audit` / `govulncheck` run in CI
- [ ] Zero known critical or high severity vulnerabilities
- [ ] Dependencies pinned (no `^`, `~`, or `*` ranges)
- [ ] Transitive dependencies reviewed for critical CVEs
- [ ] Lockfile (`package-lock.json`, `Cargo.lock`, `go.sum`) committed
- [ ] Dependabot/Renovate enabled for automated updates
- [ ] Unused dependencies removed
- [ ] Deprecated or unmaintained libraries identified and replaced

## Security Monitoring

### Logging
- [ ] Security events logged: login success, login failure, access denied, permission changes
- [ ] No sensitive data in logs (passwords, tokens, PII, credit cards)
- [ ] Structured logging (JSON) for automated analysis
- [ ] Logs centralized (ELK, Loki, CloudWatch, Splunk)
- [ ] Log retention policy defined and enforced
- [ ] Audit trail for data access and modifications

### Alerting
- [ ] Alert on: repeated auth failures, unusual traffic patterns, new admin accounts
- [ ] Incident response runbook defined
- [ ] On-call rotation for security incidents
- [ ] Automated response for critical events (IP blocking, account suspension)

## Security Headers

```nginx
# Minimum headers checklist
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

## Audit Evidence Collection

For each finding, document:
- **Affected component**: exact file, endpoint, or resource
- **Vulnerability class**: broken access control, injection, etc.
- **Severity**: critical / high / medium / low
- **Exploitation scenario**: how an attacker could exploit it
- **Proof of concept**: curl command, request/response, or code snippet
- **Remediation**: specific fix with code example
- **Verification**: how to confirm the fix works

## Scan Automation

```yaml
name: Security Audit
on:
  schedule:
    - cron: '0 6 * * 1'  # Weekly Monday
  push:
    branches: [main]
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: SAST
        uses: github/codeql-action/analyze@v3
      - name: Dependency check
        run: npm audit --audit-level=high
      - name: Secrets scan
        uses: trufflesecurity/trufflehog@v3
        with:
          extra_args: --only-verified
      - name: Container scan
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'myapp:latest'
          severity: 'CRITICAL,HIGH'
```
