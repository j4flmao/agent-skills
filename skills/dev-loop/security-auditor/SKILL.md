---
name: security-auditor
description: >
  Use this skill when the user says 'security review', 'security audit', 'is this
  secure', 'OWASP', 'SQL injection', 'XSS', 'CSRF', 'secrets', 'vulnerability',
  'penetration', 'hardening', or when reviewing application security. Covers:
  OWASP Top 10 (2021) checklist, secrets detection, auth validation, input
  sanitization, dependency auditing, and security hardening. Works with any
  language/stack. Do NOT use this for: general code review (use code-review),
  performance issues, or compliance documentation.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [dev-loop, security, phase-4]
---

# Security Auditor

## Purpose
Systematically review application security against the OWASP Top 10 and common vulnerability patterns.

## Agent Protocol

### Trigger
Exact user phrases: "security review", "security audit", "is this secure", "OWASP", "SQL injection", "XSS", "CSRF", "secrets", "vulnerability", "penetration", "hardening".

### Input Context
Before activating, verify:
- The code, config, or deployment to audit is provided.
- The language/stack is known (for stack-specific security checks).
- The deployment context (internal vs external-facing) is clear.

### Output Artifact
No file output. This skill produces a security audit report.

### Response Format
Answer exactly:
```
## Security Audit: {scope}
### Findings
| # | Severity | Category | Finding | File | Fix |
|---|----------|----------|---------|------|-----|
| 1 | CRITICAL | A01 | ... | path:line | ... |
### Summary
- Critical: {n} | High: {n} | Medium: {n} | Low: {n}
- Action items: {list}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick. No explanation of OWASP categories.

### Completion Criteria
This skill is complete when:
- [ ] OWASP Top 10 checklist has been checked.
- [ ] Secrets have been scanned for.
- [ ] Dependency audit has been run.
- [ ] Every finding has severity, impact, exploitation scenario, and fix.
- [ ] Critical and High findings are clearly actionable.

### Max Response Length
60 lines.

## Quick Start
Run through the OWASP Top 10 checklist. Check for hardcoded secrets. Verify input validation and auth on every endpoint. Run dependency audit.

## When to Use This Skill
- Before deployment to production
- When adding authentication/authorization
- After integrating third-party dependencies
- Responding to security incidents
- Regular security review cadence

## Core Workflow

### Step 1: OWASP Top 10 Checklist (2021)

**A01: Broken Access Control**
- [ ] Every endpoint has auth check (not just UI hiding)
- [ ] Role/permission checks on admin endpoints
- [ ] No IDOR (Insecure Direct Object Reference) — users can't access other users' data

**A02: Cryptographic Failures**
- [ ] No MD5/SHA1 for passwords (use bcrypt/argon2)
- [ ] TLS/HTTPS everywhere — no plain HTTP for sensitive data
- [ ] Secrets not hardcoded — use environment variables or vault

**A03: Injection**
- [ ] All queries use parameterized statements (no string interpolation in SQL)
- [ ] Input validation on all user-facing inputs (type, length, format)
- [ ] ORM used instead of raw SQL (when possible)

**A04: Insecure Design**
- [ ] Rate limiting on auth endpoints
- [ ] Principle of least privilege applied
- [ ] Secure defaults (no debugging endpoints in production)

**A05: Security Misconfiguration**
- [ ] No default credentials
- [ ] Security headers set (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)
- [ ] Error pages don't leak stack traces

**A06: Vulnerable Components**
- [ ] Run `npm audit` / `cargo audit` / `govulncheck`
- [ ] No dependencies with known CVEs
- [ ] Pinned version numbers (not ranges)

**A07: Auth Failures**
- [ ] Brute force protection on login
- [ ] Session management secure (httpOnly cookies, proper expiry)
- [ ] MFA where applicable

**A08: Data Integrity Failures**
- [ ] Signed/verified data (JWTs, webhook payloads)
- [ ] CI/CD pipeline integrity checks

**A09: Logging Failures**
- [ ] Security events logged (login, access denied, permission changes)
- [ ] No sensitive data in logs (passwords, tokens, PII)

**A10: SSRF (Server Side Request Forgery)**
- [ ] Outbound URLs validated/allowlisted
- [ ] Internal network not accessible from public endpoints

### Step 2: Secrets Detection
Scan codebase for:
- API keys, tokens, passwords committed to git
- `.env` files committed to repository
- Hardcoded connection strings
- AWS/GCP/Azure keys

**Fix**: Use environment variables, secret managers (Vault, AWS Secrets Manager), or `.env` with `.gitignore`.

### Step 3: Dependency Audit
```bash
# Node.js
npm audit

# Rust
cargo audit

# Go
govulncheck ./...

# Python
pip audit

# Java
mvn dependency-check:check
```

### Step 4: Security Headers Checklist
```nginx
# Minimum headers for production
add_header Content-Security-Policy "default-src 'self'; script-src 'self'";
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
add_header X-Frame-Options "DENY";
add_header X-Content-Type-Options "nosniff";
add_header Referrer-Policy "strict-origin-when-cross-origin";
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()";
```

## Rules & Constraints
- Every security finding must include: severity, impact, exploitation scenario, and fix
- Assume external-facing endpoints are already compromised — defense in depth
- Never hardcode secrets — not even in tests or documentation
- Security is not a one-time activity — it's part of every code review
- If in doubt, go with the more restrictive option (principle of least privilege)
- Log security events but never log sensitive data — find the balance

## Output Format
```
## Security Audit: {scope}
### Findings
| # | Severity | Category | Finding | File | Fix |
|---|----------|----------|---------|------|-----|
| 1 | CRITICAL | A01 | ... | path:line | ... |
### Summary
- Critical: {n} | High: {n} | Medium: {n} | Low: {n}
- Action items: {list}
```

## References
- `references/audit-checklist.md` — Audit Checklist
- `references/owasp-top10.md` — Owasp Top10
- `references/remediation-guide.md` — Remediation Guide
- `references/security-audit-automation.md` — Security Audit Automation

## Handoff
After completing this skill:
- Next skill: **performance-profiler** — if performance also needs review
- Pass context: security findings, critical/high severity items
