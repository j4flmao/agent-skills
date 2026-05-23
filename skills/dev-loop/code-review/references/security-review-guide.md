# Security Review Guide

## Threat Modeling Process

### STRIDE Methodology

| Category | Definition | Example |
|----------|------------|---------|
| **S**poofing | Impersonating another user or system | Token theft, session hijacking |
| **T**ampering | Modifying data in transit or at rest | Man-in-the-middle, data corruption |
| **R**epudiation | Denying an action occurred | Missing audit logs, unsigned actions |
| **I**nformation Disclosure | Exposing sensitive data to unauthorized parties | Leaky APIs, misconfigured CORS |
| **D**enial of Service | Disrupting service availability | Resource exhaustion, infinite loops |
| **E**levation of Privilege | Gaining unauthorized access | IDOR, CSRF, privilege escalation |

### Data Flow Diagram Review

For every new feature, verify data flows:

```
User → API Gateway → Auth Service → Application → Database
  │          │             │              │             │
  │    HTTPS/TLS     Token Validation   Input Valid.  Parameterized
  │    Certificate   Rate Limiting     Authz Check    Queries
```

### Trust Boundary Checklist

- [ ] All external inputs validated (HTTP, message queues, file uploads)
- [ ] Authentication at every service boundary (not just edge)
- [ ] Internal service calls use mTLS or service mesh auth
- [ ] Secrets never cross trust boundaries in plaintext

## OWASP Top 10 Deep Check

### A01: Broken Access Control

```typescript
// VULNERABLE — IDOR
app.get('/api/users/:id', (req, res) => {
  const user = db.users.findById(req.params.id) // No check!
  res.json(user)
})

// FIXED — ownership check
app.get('/api/users/:id', authenticate, (req, res) => {
  const user = db.users.findByIdAndUserId(req.params.id, req.user.id)
  if (!user) return res.status(403).json({ error: 'forbidden' })
  res.json(user)
})
```

**Review checklist:**
- [ ] Every object access checks ownership or permission
- [ ] No reliance on hidden IDs or obfuscation
- [ ] POST/PUT/PATCH validate user can modify the resource
- [ ] Admin endpoints check admin role, not just existence
- [ ] Rate limiting on bulk operations

### A03: Injection (SQL, NoSQL, LDAP, OS)

```typescript
// VULNERABLE
const query = `SELECT * FROM users WHERE email = '${email}'`

// FIXED
const result = await db.query('SELECT * FROM users WHERE email = $1', [email])
```

**Review checklist:**
- [ ] Zero string concatenation in query building
- [ ] ORM used with parameterized queries
- [ ] Dynamic table/column names never come from user input
- [ ] No eval(), setTimeout(string), or Function(string)
- [ ] No shell command construction with user input

### A06: Vulnerable Components

```bash
# Audit commands by ecosystem
npm audit                    # Node.js
pip-audit                   # Python
cargo audit                 # Rust
govulncheck ./...           # Go
mvn dependency-check:check  # Java
bundler-audit               # Ruby
```

**Review checklist:**
- [ ] `npm audit` / equivalent returns 0 critical or high
- [ ] All dependencies pinned (no `^` or `~` ranges)
- [ ] Transitive dependencies reviewed for known vulnerabilities
- [ ] Docker base images use specific digests, not tags
- [ ] CI fails on high/critical severity advisories

## Secrets Detection Patterns

### High-Risk Patterns

```regex
# API keys and tokens
(AKIA|ASIA)[A-Z0-9]{16}           # AWS Access Key
ghp_[A-Za-z0-9]{36}              # GitHub PAT
sk-[A-Za-z0-9]{32,}              # OpenAI/Stripe
xox[bpras]-[A-Za-z0-9]{10,}       # Slack tokens
-----BEGIN (RSA|EC|OPENSSH) PRIVATE KEY-----  # Private keys
```

### Common Leak Locations

- `.env` files committed to git
- Dockerfiles with hardcoded API keys
- CI/CD config with plaintext credentials
- Test fixtures with production-like secrets
- Documentation/examples with real tokens
- npm package bundle includes `.env`

### Prevention

```bash
# Pre-commit hook
#!/bin/sh
git diff --cached --name-only | xargs grep -l 'sk-[A-Za-z0-9]\|ghp_' && {
  echo "ERROR: Potential secret in staged files"
  exit 1
}
```

## Authentication & Session Review

- [ ] Password hashing: bcrypt (cost >= 12), argon2id, or scrypt
- [ ] No homegrown crypto — use well-audited libraries
- [ ] JWT: signed (RS256/ES256), not just encoded, short expiry (< 15 min)
- [ ] Refresh tokens: rotation, revocation, stored server-side
- [ ] Session cookies: httpOnly, Secure, SameSite=Strict/Lax
- [ ] Login rate limiting: N attempts per IP/account per window
- [ ] Account lockout after N failed attempts
- [ ] MFA on sensitive operations (password change, admin actions)
- [ ] Password reset tokens: single-use, short expiry, no timing leak

## Input Validation Principles

```typescript
// VALIDATE at the edge, SANITIZE before use, NEVER TRUST
function createUserHandler(req: Request, res: Response) {
  // 1. Validate structure
  const schema = z.object({
    email: z.string().email(),
    age: z.number().min(1).max(150),
    role: z.enum(['user', 'admin']),
  })
  const parsed = schema.parse(req.body)

  // 2. Sanitize for context
  const safeEmail = parsed.email.toLowerCase().trim()

  // 3. Authorize
  if (parsed.role === 'admin' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'forbidden' })
  }

  // 4. Process
  const user = await createUser(safeEmail, parsed.age, parsed.role)
  res.status(201).json(user)
}
```

## Security Headers Baseline

```typescript
// Express middleware
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'")
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
  next()
})
```

## CI/CD Security Gates

```yaml
# .github/workflows/security.yml
name: Security Scan
on: [pull_request]
jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: SAST
        uses: github/codeql-action/analyze@v3
      - name: Dependency scan
        run: npm audit --audit-level=high
      - name: Secrets scan
        uses: trufflesecurity/trufflehog@v3
      - name: Container scan
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: '${{ env.IMAGE }}'
```

## Vulnerability Severity Classification

| Severity | Definition | SLA |
|----------|------------|-----|
| **Critical** | Remote code execution, auth bypass, data exfiltration | Fix within 24 hours |
| **High** | Privilege escalation, sensitive data exposure, IDOR | Fix within 72 hours |
| **Medium** | Information disclosure (non-sensitive), CSRF, missing headers | Fix within 2 weeks |
| **Low** | Missing best practices, hardening improvements | Backlog |
