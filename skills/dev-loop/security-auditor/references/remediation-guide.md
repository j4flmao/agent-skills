# Security Remediation Guide

## Prioritization Framework

### CVSS Scoring Reference

| Severity | CVSS Range | Response SLA |
|----------|-----------|-------------|
| Critical | 9.0-10.0 | 24 hours |
| High | 7.0-8.9 | 72 hours |
| Medium | 4.0-6.9 | 2 weeks |
| Low | 0.1-3.9 | Next sprint |

### Remediation Priority Matrix

| Impact on Users | Exploitability | Priority | Action |
|----------------|---------------|----------|--------|
| Data exposure | Easy | Critical | Patch immediately, rotate credentials, notify affected |
| Service outage | Easy | Critical | Deploy fix, WAF rule, feature flag off |
| Data exposure | Hard | High | Schedule fix, monitor for exploitation |
| Performance degradation | Easy | High | Deploy fix this sprint |
| Minor info disclosure | Hard | Medium | Backlog, fix within 2 weeks |
| Missing best practice | — | Low | Add to hardening backlog |

## Remediation by Vulnerability Class

### A01: Broken Access Control

**Problem:** Missing authorization checks on endpoints.

```typescript
// Detection
// Look for endpoints that don't check user identity or role
app.get('/api/orders/:id', (req, res) => {
  const order = db.orders.findById(req.params.id)  // No ownership check!
  res.json(order)
})

// Fix
app.get('/api/orders/:id', authenticate, authorize('read:orders'), async (req, res) => {
  const order = await db.orders.findByIdAndUserId(req.params.id, req.user.id)
  if (!order) return res.status(403).json({ error: 'forbidden' })
  res.json(order)
})
```

**Verification:**
- [ ] Attempt to access another user's resource
- [ ] Attempt unauthenticated access to authenticated-only endpoints
- [ ] Attempt admin actions with user-level token

### A02: Cryptographic Failures

**Problem:** Weak crypto, missing TLS, secrets in code.

```typescript
// BAD: MD5, static IV, hardcoded key
const hash = crypto.createHash('md5').update(password).digest('hex')
const cipher = crypto.createCipheriv('aes-256-cbc', 'hardcoded-key-32-bytes!', 'static-iv-16-b')

// GOOD: bcrypt, proper key management
const hash = await bcrypt.hash(password, 12)
const key = await vault.getSecret('encryption-key')
const iv = crypto.randomBytes(16)
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
```

**Verification:**
- [ ] Check TLS certificate validity and minimum version (1.2+)
- [ ] Run SSL Labs test on public endpoints
- [ ] Scan codebase with regex for secret patterns

### A03: Injection (SQL, NoSQL, LDAP, OS)

**Problem:** String interpolation in queries.

```typescript
// BAD: SQL injection
const query = `SELECT * FROM users WHERE email = '${email}'`
db.query(query)

// FIX: Parameterized query
db.query('SELECT * FROM users WHERE email = $1', [email])
```

**Verification:**
- [ ] Search for string concatenation/ interpolation in SQL queries
- [ ] Test with SQL injection payloads: `' OR 1=1 --`
- [ ] Verify ORM uses parameterized queries (check query logs)

**Escape for other contexts:**
```typescript
// Shell command — use array form
exec('ls', ['-la', safePath])  // NOT exec(`ls -la ${userInput}`)

// HTML output — use DOMPurify
const safeHtml = DOMPurify.sanitize(userHtml)

// JSON/JS injection — use JSON.stringify or structured serialization
res.json({ message: userMessage })  // NOT res.send(`<script>${userMessage}</script>`)
```

### A06: Vulnerable Components

**Problem:** Outdated dependencies with known CVEs.

```bash
# Detection
npm audit --audit-level=high
pip-audit
cargo audit

# Fix
npm update vulnerable-package
npm audit fix
# If no fix exists: add override in package.json
```

```json
{
  "overrides": {
    "transitive-dep": "2.0.0"
  }
}
```

**Verification:**
- [ ] Re-run `npm audit` to confirm zero critical/high findings
- [ ] Verify the fix doesn't break integration tests
- [ ] Check if breaking changes require code updates

### A07: Authentication Failures

**Problem:** Weak authentication mechanisms.

```typescript
// BAD: No rate limiting, no lockout
app.post('/login', async (req, res) => {
  const user = await db.users.findByEmail(req.body.email)
  if (!user || !await bcrypt.compare(req.body.password, user.password)) {
    return res.status(401).json({ error: 'invalid_credentials' })
  }
  // ...generate token
})

// FIX: Rate limiting + lockout + consistent messages
app.post('/login', loginLimiter, async (req, res) => {
  const user = await db.users.findByEmail(req.body.email)
  if (!user) return res.status(401).json({ error: 'invalid_credentials' })

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return res.status(429).json({ error: 'account_locked' })
  }

  if (!await bcrypt.compare(req.body.password, user.password)) {
    user.failedAttempts++
    if (user.failedAttempts >= 5) user.lockedUntil = addMinutes(new Date(), 15)
    await user.save()
    return res.status(401).json({ error: 'invalid_credentials' })  // Same message
  }

  user.failedAttempts = 0
  user.lockedUntil = null
  await user.save()
  // ...generate token
})
```

### A09: Logging & Monitoring Failures

**Problem:** Insufficient logging to detect and investigate security incidents.

```typescript
// BAD: Logging sensitive data
logger.info(`User logged in: ${email}, token: ${token}`)

// FIX: Log events, not secrets
logger.info({
  event: 'login_success',
  userId: user.id,
  ip: req.ip,
  userAgent: req.headers['user-agent'],
  timestamp: new Date().toISOString(),
})
```

**Verification:**
- [ ] Search log statements for potential PII/secret exposure
- [ ] Verify log aggregation system is working
- [ ] Check log retention and rotation policies

## Remediation Steps for Common Findings

### API key in git history

```bash
# 1. Revoke the key immediately
# 2. Remove from git
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch path/to/file" \
  --prune-empty --tag-name-filter cat -- --all

# 3. Force push
git push origin --force --all

# 4. Notify team to delete local clones and re-clone
# 5. Add .gitignore rule to prevent recurrence
```

### Missing security headers

```typescript
// Express helmet middleware covers most headers
import helmet from 'helmet'
app.use(helmet())

// Or set manually
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'")
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
  next()
})
```

### Default credentials

```bash
# Find hardcoded credentials
grep -rn 'password\|secret\|token\|api_key' --include='*.{ts,js,py,go,rs,yaml,yml,json,toml}' \
  --exclude-dir=node_modules --exclude-dir=.git --exclude='*lock*'

# Fix: move to environment variables or secret manager
```

### Open S3 bucket

```bash
# Detect
aws s3api get-bucket-acl --bucket my-bucket
aws s3api get-public-access-block --bucket my-bucket

# Fix
aws s3api put-public-access-block --bucket my-bucket \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

# Audit complete account
aws s3 ls | while read bucket; do
  aws s3api get-public-access-block --bucket "$bucket" 2>/dev/null || echo "$bucket: NO BLOCK"
done
```

## Post-Remediation Verification

- [ ] Fix deployed to all affected environments
- [ ] Vulnerability scan re-run: confirmed fixed
- [ ] Regression tests pass
- [ ] Security regression test added
- [ ] Incident report documented (if applicable)
- [ ] Root cause addressed to prevent recurrence
- [ ] Team notified of lessons learned

## Remediation Metrics

| Metric | Target |
|--------|--------|
| Time to remediate critical | < 24 hours |
| Time to remediate high | < 72 hours |
| Recurrence rate | < 5% within 6 months |
| Scanning coverage | 100% of production services |
| Security debt items | < 10 items at any time |
