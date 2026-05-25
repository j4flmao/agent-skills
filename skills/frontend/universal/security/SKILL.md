---
name: frontend-security
description: >
  Use this skill when the user says 'XSS', 'CSP', 'CSRF', 'SRI', 'secure cookies', 'security headers', 'frontend security', 'sanitize input', 'content security policy', 'cross-site scripting', 'cross-site request forgery', or when auditing frontend security. This skill enforces: CSP headers blocking inline scripts by default, SRI on all external resources, HttpOnly/Secure/SameSite cookies, CSRF tokens on state-changing requests, and output encoding to prevent XSS. Works with any frontend framework. Do NOT use for: backend authentication, server-side SQL injection, network security.
version: "1.0.0"
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

## Rules
- CSP must use `'strict-dynamic'` for modern apps — no whitelist-based CSP.
- All external resources must have `integrity` attribute with SRI hash.
- Cookies with session data: HttpOnly + Secure + SameSite=Strict.
- Never render user input as HTML without DOMPurify.
- CSRF token on every POST/PUT/DELETE from the browser.
- `dangerouslySetInnerHTML` is banned unless paired with DOMPurify.

## References
- `references/web-security-headers.md` — full security header guide with configs
- `references/xss-prevention.md` — XSS types, sanitization libraries, encoding context
- `references/xss-protection.md` — XSS types, framework escaping, DOMPurify, context encoding, URL validation, CSP as XSS defense
- `references/csp-implementation.md` — CSP directives, strict CSP, nonce/hash, reporting, framework integration, third-party directives

## Handoff
No artifact produced.
Next skill: `authentication` — integrate CSRF with auth token flow.
Carry forward: CSP nonce strategy, cookie config, CSRF token source.
