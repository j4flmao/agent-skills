# OWASP Top 10 (2021) — Exploitation Scenarios & Fixes

## A01: Broken Access Control
**Scenario:** User modifies URL from `/api/orders/123` to `/api/orders/456` and accesses another user's order.
**Fix:** Verify ownership or permissions on every object access. Do not rely on ID obfuscation.
```typescript
// BAD
app.get('/api/orders/:id', (req, res) => {
  const order = db.orders.findById(req.params.id)
  res.json(order)
})
// GOOD
app.get('/api/orders/:id', (req, res) => {
  const order = db.orders.findByIdAndUserId(req.params.id, req.user.id)
  if (!order) return res.status(403).json({ error: 'access_denied' })
  res.json(order)
})
```

## A02: Cryptographic Failures
**Scenario:** Passwords stored in MD5; credit card numbers transmitted over HTTP.
**Fix:** Use bcrypt/argon2 for passwords. Enforce TLS everywhere. Do not roll your own crypto.
```typescript
const hash = await bcrypt.hash(password, 12)
const match = await bcrypt.compare(input, hash)
```

## A03: Injection
**Scenario:** SQL query built via string interpolation with user input.
**Fix:** Parameterized queries or ORM. Never concatenate user input into SQL/NoSQL queries.
```typescript
// BAD
db.query(`SELECT * FROM users WHERE email = '${email}'`)
// GOOD
db.query('SELECT * FROM users WHERE email = $1', [email])
```

## A04: Insecure Design
**Scenario:** Password reset endpoint has no rate limiting — attacker brute-forces reset tokens.
**Fix:** Rate limit auth endpoints. Require current password for email changes. Implement MFA.
```typescript
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 })
app.use('/auth/reset-password', limiter)
```

## A05: Security Misconfiguration
**Scenario:** Production server has debug endpoints enabled, default credentials, CORS set to `*`.
**Fix:** Disable debug mode. Change all default credentials. Set strict CORS. Apply security headers.

## A06: Vulnerable and Outdated Components
**Scenario:** Application uses a library with known CVE (e.g., Log4j, older Express).
**Fix:** Run `npm audit` / `cargo audit` / `govulncheck` in CI. Pin exact versions. Subscribe to security advisories.

## A07: Identification and Authentication Failures
**Scenario:** No lockout policy — attacker brute-forces passwords indefinitely.
**Fix:** Account lockout after N attempts. Rate limit login. MFA for sensitive actions.
```typescript
if (failedAttempts > 5) { await lockAccount(email); return res.status(429).json({ error: 'account_locked' }) }
```

## A08: Software and Data Integrity Failures
**Scenario:** CI/CD pipeline downloads unsigned third-party binaries.
**Fix:** Verify checksums and signatures. Use trusted registries. Sign your own artifacts.

## A09: Security Logging and Monitoring Failures
**Scenario:** Intrusion detected 6 months after the fact — no logging of auth failures.
**Fix:** Log all security events (login, failed auth, permission changes). Structured JSON logs. Centralized log aggregation. Alert on anomalies.

## A10: Server-Side Request Forgery (SSRF)
**Scenario:** User provides a URL that the server fetches, pointing to internal metadata endpoint (`http://169.254.169.254/latest/meta-data/`).
**Fix:** Allowlist outbound URLs. Block private IP ranges. Use a dedicated HTTP client with restricted network access.
```typescript
const allowedHosts = new Set(['api.stripe.com', 'api.github.com'])
if (!allowedHosts.has(parsedUrl.hostname)) throw new Error('disallowed_host')
```
