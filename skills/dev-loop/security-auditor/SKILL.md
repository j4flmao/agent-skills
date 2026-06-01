---
name: dev-loop-security-auditor
description: >
  Use when the user asks about security auditing, vulnerability scanning, security review, dependency vulnerabilities, SAST, DAST, penetration testing, or security best practices. Do NOT use for: code review (dev-loop-code-review), or performance profiling (dev-loop-performance-profiler).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [dev-loop, security, auditing, vulnerabilities]
---

# Security Auditor

## Purpose
Systematically identify, assess, and remediate security vulnerabilities in applications — including dependency vulnerabilities, code-level flaws, misconfigurations, and authentication/authorization weaknesses — using automated scanning tools and manual review techniques.

## Agent Protocol

### Trigger
Exact user phrases: "security audit", "vulnerability scan", "security review", "dependency check", "SAST", "DAST", "penetration test", "CVE", "OWASP", "security assessment", "threat modeling".

### Input Context
- Application type (web app, API, mobile, desktop, CLI, library)
- Language and framework (affects vulnerability patterns)
- Deployment environment (cloud, on-prem, hybrid, air-gapped)
- Regulatory requirements (SOC2, HIPAA, PCI-DSS, GDPR, FedRAMP)
- Authentication method (OAuth2, SAML, API keys, JWT, session cookies)
- Data sensitivity (PII, financial, health, credentials, tokens)
- Existing security measures (WAF, IDS, rate limiting, encryption)
- Recent security incidents or CVEs

### Output Artifact
Security audit report with identified vulnerabilities by severity, remediation steps, and priority.

### Completion Criteria
- [ ] Dependency vulnerability scan completed
- [ ] SAST scan completed and findings reviewed
- [ ] OWASP Top 10 assessment performed
- [ ] Authentication and authorization reviewed
- [ ] API security tested (rate limiting, input validation, CORS)
- [ ] Sensitive data exposure checked (secrets, PII, tokens)
- [ ] Configuration security reviewed
- [ ] Remediation plan with priorities and owners
- [ ] Automated security checks added to CI/CD

### Max Response Length
250 lines.

## Framework/Methodology

### Security Audit Decision Tree
```
What is the audit scope?
├── Web application → OWASP Top 10 + dependency scan + SAST
│   ├── Auth review (session management, MFA, password policies)
│   ├── Input validation (XSS, SQL injection, CSRF, SSRF)
│   ├── API security (rate limiting, CORS, JWT, GraphQL depth)
│   └── Infrastructure (WAF, TLS, headers, CSP)
├── API / microservice → API security testing
│   ├── Authentication (JWT, OAuth2, API keys, mTLS)
│   ├── Authorization (RBAC, ABAC, scope validation)
│   ├── Input validation (schema validation, injection)
│   └── Rate limiting + DoS protection
├── Library / package → Dependency + SAST scan
│   ├── Transitive dependencies (supply chain)
│   ├── Code quality scanning (semgrep, CodeQL)
│   └── Malicious package detection
├── Infrastructure → Configuration review
│   ├── Cloud security (IAM, S3 buckets, security groups)
│   ├── Container security (image scan, runtime, registry)
│   └── Network security (TLS, firewall, VPN)
└── Mobile app → OWASP Mobile Top 10
    ├── Data storage (keychain, SharedPreferences, SQLite)
    ├── Network (certificate pinning, HTTPS)
    └── Code protection (obfuscation, root detection)
```

### OWASP Top 10 (2021)
```
A01: Broken Access Control
A02: Cryptographic Failures
A03: Injection (SQL, NoSQL, OS, LDAP)
A04: Insecure Design
A05: Security Misconfiguration
A06: Vulnerable and Outdated Components
A07: Identification and Authentication Failures
A08: Software and Data Integrity Failures
A09: Security Logging and Monitoring Failures
A10: Server-Side Request Forgery (SSRF)
```

## Workflow

### Step 1: Dependency Vulnerability Scan

```bash
# npm audit
npm audit                    # List vulnerabilities
npm audit --audit-level=high # Only show high/critical
npm audit fix                # Auto-fix non-breaking updates
npm audit fix --force        # Force update (may break API)

# Better: npm audit + snyk
npx snyk test                # Deep dependency analysis
npx snyk monitor             # Continuous monitoring

# pip
pip-audit                    # Scan Python dependencies
safety check                 # Alternative Python scanner

# cargo (Rust)
cargo audit                  # Audit Cargo.lock for CVEs
cargo deny check advisories  # More comprehensive (also license check)

# go
govulncheck ./...            # Go vulnerability scanner
nancy go.sum                 # Go dependency vulnerability scanner

# .NET
dotnet list package --vulnerable  # List vulnerable NuGet packages

# Docker
docker scout quick <image>   # Docker image vulnerability scan
trivy image <image>          # Trivy container scanner
```

### Step 2: SAST (Static Application Security Testing)

```yaml
tools:
  semgrep:
    description: "Multi-language SAST with custom rules"
    usage: "semgrep --config=auto --config=./.semgrep/ ."
    strengths: "Custom rules, CI-friendly, fast"
  codeql:
    description: "GitHub's deep code analysis"
    usage: "codeql database create --language=typescript ./db && codeql analyze ./db --format=sarifv2"
    strengths: "Deep flow analysis, accurate"
  eslint-plugin-security:
    description: "ESLint plugin for Node.js security"
    usage: "npx eslint --plugin security ."
    strengths: "Linter integration, easy setup"
  bandit:
    description: "Python SAST"
    usage: "bandit -r src/ -f json"
    strengths: "Python-specific patterns"
  gosec:
    description: "Go security checker"
    usage: "gosec ./..."
    strengths: "Go native, finds hardcoded creds"
```

```yaml
# .semgrep/rules/security.yaml
rules:
  - id: no-hardcoded-secrets
    patterns:
      - pattern-either:
          - pattern: "apiKey = \"...\""
          - pattern: "password = \"...\""
          - pattern: "secret = \"...\""
      - pattern-not: "password = \"\""
    message: "Hardcoded secret detected"
    severity: ERROR

  - id: no-sql-concatenation
    patterns:
      - pattern: "SELECT ... WHERE ... = '$...VALUE'"
    message: "SQL injection risk: use parameterized queries"
    severity: ERROR
```

### Step 3: Authentication and Authorization Review

```yaml
# JWT security checklist
jwt_security:
  algorithm:
    check: "Use RS256 or ES256 (asymmetric), NOT HS256 or 'none'"
    fix: 'Set algorithm whitelist: { algorithms: ["RS256"] }'
  expiry:
    check: "Token expiry is set and reasonable (< 15 min for access tokens)"
    fix: "Set exp claim, use refresh tokens for long sessions"
  secret:
    check: "JWT secret is not in source code"
    fix: "Use env vars, vault, or KMS"
  validation:
    check: "All claims validated (iss, aud, exp, nbf)"
    fix: "Validate all required claims on every request"

# OAuth2 security checklist
oauth2_security:
  redirect_uri:
    check: "Strict redirect URI validation (exact match, not prefix)"
    fix: 'Must match exactly: "https://app.example.com/callback"'
  state_parameter:
    check: "State parameter used to prevent CSRF"
    fix: "Generate and validate random state value per request"
  pkce:
    check: "PKCE enabled for public clients (SPA, mobile)"
    fix: "Use S256 code challenge method"
```

### Step 4: API Security Testing

```bash
# API security testing with OWASP ZAP or HTTPie + custom scripts
# Test for:
# 1. Rate limiting
for i in $(seq 1 100); do
  curl -s -o /dev/null -w "%{http_code}\n" \
    https://api.example.com/login \
    -d "username=admin&password=test"
done
# Look for: 429 Too Many Requests after threshold

# 2. IDOR (Insecure Direct Object Reference)
curl https://api.example.com/users/1
curl https://api.example.com/users/2
# Try: different user IDs, UUIDs, sequential access
# Expected: 403 for unauthorized access

# 3. SQL injection
curl "https://api.example.com/users?id=1' OR '1'='1"
curl "https://api.example.com/users?id=1; DROP TABLE users--"
# Expected: 400 or 500, NOT returning all users

# 4. Input validation (XSS)
curl -X POST https://api.example.com/profile \
  -d 'name=<script>alert(1)</script>'
# Expected: Sanitized or rejected with 400

# 5. JWT manipulation
# Try with modified algorithm: change alg from RS256 to HS256
# Use 'none' algorithm
# Use expired token
```

### Step 5: CI/CD Security Integration

```yaml
# .github/workflows/security-scan.yml
name: Security Scan
on:
  pull_request:
  schedule:
    - cron: '0 6 * * 1'  # Weekly full scan

jobs:
  dependency-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm audit --audit-level=high
        continue-on-error: true  # Don't block PRs, but flag

  sast:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Semgrep SAST
        uses: semgrep/semgrep-action@v1
        with:
          config: p/default

  secrets-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: TruffleHog secrets scan
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.repository.default_branch }}
          head: HEAD
```

### Step 6: Remediation Prioritization

```yaml
# CVSS v3 severity levels
severity:
  critical: "9.0-10.0 — Fix within 24 hours"
  high: "7.0-8.9 — Fix within 7 days"
  medium: "4.0-6.9 — Fix within 30 days"
  low: "0.1-3.9 — Fix within 90 days"

# Prioritization matrix
priority_matrix:
  - exploitability: "High (public exploit, no auth required)"
    impact: "High (RCE, data exfiltration)"
    priority: "CRITICAL — fix NOW"

  - exploitability: "High (CVE with PoC)"
    impact: "Medium (XSS, directory traversal)"
    priority: "HIGH — fix within sprint"

  - exploitability: "Low (requires auth, complex attack)"
    impact: "Low (info disclosure, fingerprinting)"
    priority: "LOW — fix when convenient"
```

## Common Pitfalls

| Pitfall | Description | Prevention |
|---------|-------------|------------|
| Ignoring transitive dependencies | Direct deps are safe, sub-deps are vulnerable | Use `npm audit --recursive`, `pip-audit` |
| False positives from scanners | Wasting time on non-exploitable findings | Triage findings, suppress with evidence |
| No reproducible scan | Different results each run | Lock dependency versions, pin scanner version |
| Only scanning at release | Vulnerabilities introduced between releases | PR-level scanning + weekly full scans |
| No secrets scanning in CI | Hardcoded credentials committed | Pre-commit hooks + CI secrets scanner |
| Ignoring container images | App is clean, base image is vulnerable | Scan all container layers |
| Missing dependency lock files | Non-deterministic installs, different vulns | Commit lock files (package-lock.json, Cargo.lock) |
| Over-relying on scanners | Automated tools miss business logic flaws | Manual review for access control, auth |

## Best Practices

| Practice | Rationale |
|----------|-----------|
| Shift security left | Catch vulnerabilities earlier in development |
| Automate dependency scanning | Every PR, every commit — not just releases |
| Use lock files | Deterministic installs, auditable dependencies |
| Segment scanning by severity | Critical = block PR, Low = report only |
| Pin base image versions | Avoid unexpected OS-level vulnerabilities |
| Scan container images | App + OS dependencies both matter |
| Implement WAF rules | Defense in depth for web apps |
| Regular penetration testing | Automated tools miss business logic flaws |
| Secrets in environment, not code | KMS, Vault, or secret manager for all secrets |
| Monitor for new CVEs | Subscribe to security advisories for dependencies |

## References
  - references/security-auditor-advanced.md — Security Auditor Advanced Topics
  - references/security-auditor-api.md — API Security Testing Reference
  - references/security-auditor-fundamentals.md — Security Auditor Fundamentals
  - references/security-auditor-remediation.md — Security Remediation Reference
  - references/security-auditor-tools.md — Security Tools Reference
## Handoff
Hand off to `dev-loop-code-review` for secure code review. Hand off to `dev-loop-tech-debt-tracker` for security debt tracking.
