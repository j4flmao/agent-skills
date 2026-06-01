# Auth Patterns Fundamentals

## Authentication vs Authorization

| Concept | Question | Mechanism |
|---------|----------|-----------|
| Authentication | Who are you? | Password, JWT, OAuth, SAML, WebAuthn |
| Authorization | What can you do? | RBAC, ABAC, ACL, permissions |

A user must ALWAYS be authenticated before authorization checks can run.

## Token Types

| Token | Storage | Lifetime | Use Case |
|-------|---------|----------|----------|
| Access Token (JWT) | Memory (JS), httpOnly cookie | 15 min | API authorization |
| Refresh Token | httpOnly cookie, secure storage | 7 days | Get new access token |
| ID Token (OIDC) | Client only | 1 hour | User identity info |
| Session ID | httpOnly cookie | 24 hours | Session-based auth |
| API Key | Server env / secrets manager | Months/years | M2M communication |

## Token Security Rules

- Access tokens in memory (SPA): XSS vulnerable but short-lived
- Refresh tokens in httpOnly cookies: XSS protected, CSRF risk
- API keys in environment variables: NEVER in code or client-side
- Rotate secrets regularly: 90 days for API keys, on compromise immediately

## Common Auth Flows

| Flow | Client | Security Level | Complexity |
|------|--------|---------------|------------|
| Session + Cookie | Server-rendered web | High (CSRF protected) | Low |
| JWT + Refresh | SPA, Mobile | High (with httpOnly) | Medium |
| OAuth2 + PKCE | SPA, Mobile | High (no client secret) | High |
| Client Credentials | M2M Services | Medium | Low |
| API Key | M2M, 3rd party | Low (static) | Low |

## Password Storage

- Hash: bcrypt (cost >= 12) or argon2id (memory=19MB, time=2, par=1)
- Salt: built into bcrypt/argon2 (auto-generates per-password)
- Pepper: optional, stored in secrets manager, not in DB
- NEVER: MD5, SHA1, SHA256 (fast = easy to brute force), plaintext

```
Input → bcrypt(plain + salt, cost=12) → $2b$12$... (60 chars)
```

## Brute Force Protection

| Layer | Mechanism | Threshold |
|-------|-----------|-----------|
| IP | Rate limit per IP | 10 attempts/min |
| Account | Lockout after N failures | 5 attempts, 15 min lockout |
| Global | Gradual delay | +1s delay per failure |
| CAPTCHA | After threshold | reCAPTCHA v3 |

## Multi-Factor Authentication

| Factor | Example | Security |
|--------|---------|----------|
| Something you know | Password | Base |
| Something you have | TOTP code, SMS, hardware key | Medium-High |
| Something you are | Fingerprint, Face ID | High |

Use at least 2 factors for admin actions, password changes, and sensitive data access.
