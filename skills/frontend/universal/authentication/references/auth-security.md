# Auth Security

## Token Storage Security Comparison

| Storage | XSS Resilient | CSRF Resilient | Persists Refresh | Use Case |
|---------|---------------|----------------|-----------------|----------|
| httpOnly cookie | Yes | Yes (SameSite) | Yes | Production apps |
| In-memory | Yes | N/A (no auto-send) | No | High-security SPAs |
| localStorage | No | N/A | Yes | Low-sensitivity, prototyping |
| sessionStorage | No | N/A | No (tab-scoped) | Short-lived sessions |
| Memory + httpOnly refresh | Yes | Yes | Yes | Best practice SPA |

## CSRF Protection

```typescript
// Double-submit cookie pattern
// 1. Server sets non-session cookie with random value
Set-Cookie: XSRF-TOKEN=abc123; SameSite=Strict; Secure; Path=/

// 2. Client reads cookie and sends as header
const xsrfToken = getCookie('XSRF-TOKEN')
await fetch('/api/transfer', {
  method: 'POST',
  headers: { 'X-XSRF-TOKEN': xsrfToken },
  credentials: 'include',
  body: JSON.stringify({ amount, to }),
})
```

Server validates `X-XSRF-TOKEN` header matches the cookie. Both values must be present and equal.

## SameSite Cookie Attributes

| Attribute | CSRF Protection | Limitation |
|-----------|----------------|------------|
| `Strict` | Best | Breaks cross-site navigation (e.g., link from email) |
| `Lax` | Good (default) | Allows top-level GET navigation |
| `None` | None | Requires Secure; no CSRF protection |

## OAuth State Parameter

```typescript
function initiateOAuth() {
  const state = crypto.randomUUID()
  sessionStorage.setItem('oauth_state', state)

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  })
  window.location.href = `${AUTH_URL}?${params}`
}

function handleCallback(url: string) {
  const params = new URLSearchParams(url.split('?')[1])
  const returnedState = params.get('state')
  const storedState = sessionStorage.getItem('oauth_state')

  if (returnedState !== storedState) {
    throw new Error('State mismatch — possible CSRF attack')
  }
  sessionStorage.removeItem('oauth_state')
}
```

## Login Rate Limiting

```typescript
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>()

function checkRateLimit(identifier: string): boolean {
  const now = Date.now()
  const record = loginAttempts.get(identifier)

  if (record && record.lockedUntil > now) {
    return false // still locked
  }

  if (record && record.count >= 3) {
    record.lockedUntil = now + 30000 // 30s lockout
    return false
  }

  return true
}

function recordAttempt(identifier: string) {
  const record = loginAttempts.get(identifier) ?? { count: 0, lockedUntil: 0 }
  record.count++
  loginAttempts.set(identifier, record)
}
```

## Session Fingerprinting

```typescript
function getSessionFingerprint(): string {
  const components = [
    navigator.userAgent,
    navigator.language,
    new Date().getTimezoneOffset(),
    // screen color depth, etc. — avoid PII
  ]
  return components.join('||')
}

// Send fingerprint with auth requests
// Server compares fingerprint — mismatch may indicate token theft
```

## Security Headers for Auth Pages

| Header | Value | Purpose |
|--------|-------|---------|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` | Enforce HTTPS |
| `X-Frame-Options` | `DENY` | Prevent clickjacking on login |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `Referrer-Policy` | `no-referrer` | Never leak tokens in Referer |
| `Cache-Control` | `no-store` | Never cache auth pages |

## Auth Error Messages

```typescript
// Never reveal which part of credentials is wrong
// ❌ "User not found"
// ❌ "Incorrect password"
// ✅ "Invalid email or password"

// Generic error for all auth failures
const AUTH_ERROR = 'Authentication failed. Please check your credentials.'
```

## Secure Logout

```typescript
async function secureLogout() {
  // 1. Invalidate server-side session
  await api.post('/auth/logout')

  // 2. Clear all local tokens
  tokenStore.clear()
  authContext.reset()

  // 3. Clear all app storage
  localStorage.clear()
  sessionStorage.clear()

  // 4. Redirect and prevent back-button access
  window.location.replace('/login?logged_out=true')
}
```

## Token Theft Detection

| Signal | Action |
|--------|--------|
| Token used from different IP | Revoke all sessions, email alert |
| Token used from different user-agent | Revoke, require re-authentication |
| Refresh token reused (replay) | Revoke all tokens for family |
| Abnormal request frequency | Require step-up auth |
| Token decoded but invalid signature | Ignore (likely malformed request) |
