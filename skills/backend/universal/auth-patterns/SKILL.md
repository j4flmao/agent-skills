---
name: backend-auth-patterns
description: >
  Use this skill when the user says 'auth', 'authentication', 'authorization', 'JWT', 'OAuth', 'RBAC', 'permissions', 'login', 'session', 'refresh token', 'guard', 'middleware auth', or when implementing or reviewing authentication and authorization. This skill enforces: JWT structure and validation, refresh token rotation, OAuth2/OIDC flows, RBAC vs ABAC decision, middleware placement, and password security. Applies to any backend stack. Do NOT use for: specific OAuth provider implementation details, frontend auth UI, or passwordless login flows.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, security, auth, phase-2, universal]
---

# Backend Auth Patterns

## Purpose
Implement authentication and authorization that is secure by default. Every endpoint must have an auth check. No secrets in code. No plaintext passwords.

## Agent Protocol

### Trigger
Exact user phrases: "auth", "authentication", "authorization", "JWT", "OAuth", "RBAC", "permissions", "login", "session", "refresh token", "guard", "middleware auth", "access control", "secure endpoint".

### Input Context
Before activating, verify:
- The application type is known (SPA, mobile, M2M, server-rendered).
- The security requirements level is known (basic auth, enterprise SSO, API-key M2M).
- Existing auth infrastructure (if any) is described.

### Output Artifact
No file output. Produces auth design as text.

### Response Format
```
Auth strategy: {strategy name}
Rationale: {one sentence}
Token structure: {claims}
Auth middleware: {location and logic}
Authorization model: {model name and role/permission list}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick. No explanations of auth theory.

### Completion Criteria
- [ ] Auth strategy selected based on application type.
- [ ] Token structure defined with minimum viable claims.
- [ ] Refresh token rotation specified.
- [ ] Authorization model defined (RBAC or ABAC).
- [ ] Auth middleware placement specified (Infrastructure layer).
- [ ] Password hashing algorithm specified (bcrypt/argon2).
- [ ] Brute force protection specified.
- [ ] No secrets hardcoded in any code example.

### Max Response Length
Auth design: 12 lines maximum.

## Workflow

### Step 1: Choose Auth Strategy
| Application Type | Strategy | Token Type |
|-----------------|----------|------------|
| SPA (browser) | JWT + Refresh Token | Access in memory, Refresh in httpOnly cookie |
| Mobile app | JWT + Refresh Token | Both in secure storage |
| M2M service | API Key or Client Credentials | Static key or short-lived JWT |
| Server-rendered app | Session + Cookie | Session ID in signed cookie |
| Third-party login | OAuth2 / OIDC | Delegated to provider |
| Enterprise SSO | OIDC with SAML | Delegated to IdP |

### Step 2: JWT Implementation
Token claims (minimum):
```json
{
  "sub": "user-uuid",
  "role": "admin",
  "iat": 1700000000,
  "exp": 1700086400
}
```

Rules:
- Asymmetric signing (RS256/ES256) for multi-service architectures. Symmetric (HS256) only for single-service monoliths.
- Claims are minimal: subject, role, issued-at, expires. No secrets or PII in claims.
- Access token expiry: 15 minutes. Refresh token expiry: 7 days.
- Refresh token is single-use. Rotate on every refresh. If a used refresh token is presented again, invalidate ALL tokens for that user (token reuse detection).

### Step 3: Refresh Token Flow
```
1. Client sends access_token + refresh_token
2. Server validates signature and expiry of both
3. If access_token expired but refresh_token valid:
   a. Issue new access_token (15 min)
   b. Rotate refresh_token (issue new, invalidate old)
   c. Return both
4. If a consumed refresh_token is reused:
   a. Invalidate ALL refresh tokens for that user
   b. Log security event
   c. Require re-authentication
```

### Step 4: Authorization Model
RBAC (Role-Based Access Control):
- Default for most applications. Simple, auditable.
- Roles: admin, manager, user, guest.
- Each role has a set of permissions.
- Guard checks: does the user's role have this permission?

ABAC (Attribute-Based Access Control):
- Use when RBAC is insufficient (multi-tenant, document-level permissions).
- Policy engine evaluates: user attributes + resource attributes + environment.
- More flexible but significantly more complex.

### Step 5: Auth Middleware
- Auth middleware belongs in Infrastructure layer. Not in Domain. Not in Application.
- Auth decisions (permissions) belong in Application layer use cases.
- Domain entities have no auth logic.
- Password hashing: bcrypt with cost factor >= 10, or argon2id.
- Rate limit auth endpoints: login 5 requests/minute, register 2 requests/minute.

## Rules
- Never store plaintext passwords. Always hash with bcrypt (cost >= 10) or argon2id.
- JWTs are short-lived. 15 minutes for access tokens. 7 days maximum for refresh tokens.
- Every request is validated server-side. The client is never trusted to provide identity.
- For browser apps: use httpOnly, Secure, SameSite=Strict cookies for refresh tokens. Do NOT store tokens in localStorage.
- Log every auth failure with: timestamp, user ID (if available), IP address, failure reason. Never log the password or token.
- Brute force protection on login is mandatory. IP-based rate limiting. Account lockout after 5 failures.

## References
  - references/auth-oauth2.md — OAuth2 Flows
  - references/auth-passwordless.md — Passwordless Authentication
  - references/auth-testing.md — Authentication Testing
  - references/jwt-oauth-guide.md — JWT & OAuth Guide
  - references/oidc-flows.md — OIDC Flows
  - references/rbac-abac.md — RBAC vs ABAC
## Handoff
No artifact produced.
Next skill: backend-testing — test auth flows, verify auth middleware, test rate limiting.
Carry forward: auth strategy, token structure, authorization model, middleware implementation details.
