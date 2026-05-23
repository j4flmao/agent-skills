# Auth Flows

## OAuth 2.0 Authorization Code + PKCE

This is the recommended flow for SPAs. PKCE ensures the authorization code cannot be exchanged by an attacker even if intercepted.

### Flow Steps
1. Client generates `code_verifier` (random 43-128 char string) and `code_challenge = base64url(sha256(code_verifier))`
2. Client redirects to `authorize` endpoint with `code_challenge`, `code_challenge_method=S256`, `state`
3. Auth server authenticates user, stores `code_challenge`, redirects back with `code` and `state`
4. Client validates `state` matches, sends `code` + `code_verifier` to `/token` endpoint
5. Server verifies `sha256(code_verifier) === stored code_challenge`, returns `access_token` + `refresh_token`

```typescript
// PKCE challenge generation
async function generatePKCE(): Promise<{ verifier: string; challenge: string }> {
  const verifier = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 128)

  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  return { verifier, challenge }
}
```

## Implicit Flow (DEPRECATED)

Do not use. The implicit flow returns the access token as a URL fragment. It is vulnerable to access token interception via referrer headers, browser history, and compromised service workers. Use Authorization Code + PKCE instead.

## Auth Code Flow (Backend-Handled)

For apps with a backend API layer that can securely hold a `client_secret`:

1. Frontend redirects to auth server → user authenticates → redirects to backend callback
2. Backend exchanges `code` + `client_secret` for tokens
3. Backend sets httpOnly cookie with session token
4. Frontend receives session cookie — no access to raw tokens
5. Backend handles all token refresh transparently

This is the most secure SPA approach because tokens never enter the browser's JavaScript context. The backend acts as an OAuth client and manages the token lifecycle.

## Passwordless / Magic Link

### Flow
1. User enters email
2. Server sends email with one-time link containing `token` param
3. User clicks link → frontend reads `token` from URL
4. Frontend sends `token` to `/auth/verify` endpoint
5. Server validates token, returns JWT pair

```typescript
// Magic link verification
function useMagicLink() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    if (token) {
      verifyMagicLink(token).then((session) => {
        authContext.login(session)
        router.replace('/dashboard') // remove token from URL
      })
    }
  }, [])
}
```

**Security**: Magic links are single-use and expire in 15 minutes. Rate-limit requests to 3 per email per hour.

## Multi-Factor Authentication (MFA)

### TOTP MFA Flow
1. User completes first factor (password)
2. Server returns `mfa_required: true` + `mfa_token`
3. Frontend shows TOTP input screen
4. User enters 6-digit code from authenticator app
5. Frontend sends `{ mfa_token, code }` to `/auth/mfa/verify`
6. Server returns access/refresh tokens on success

```typescript
interface MFAResponse {
  mfa_required: boolean
  mfa_token?: string
  methods?: ('totp' | 'sms' | 'email')[]
}

// MFA challenge screen
if (loginResponse.mfa_required) {
  setStep('mfa')
  setMfaToken(loginResponse.mfa_token)
}

async function verifyMFA(code: string) {
  const session = await api.post('/auth/mfa/verify', { mfa_token, code })
  login(session)
}
```

### Recovery Codes
On MFA enrollment, generate 8-10 single-use recovery codes. Display them once and allow download as text file. Each code consumed on use. Invalidate all on re-enrollment.

## Single Sign-On (SSO)

### OIDC Discovery
```typescript
// Fetch OpenID Connect discovery document
const discovery = await fetch(`${ISSUER}/.well-known/openid-configuration`).then(r => r.json())
// Use discovery.authorization_endpoint, discovery.token_endpoint, discovery.jwks_uri
```

### SSO Initiation
```typescript
function initiateSSO(provider: 'google' | 'microsoft' | 'github' | 'saml') {
  const { verifier, challenge } = await generatePKCE()
  sessionStorage.setItem('pkce_verifier', verifier)

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: `${window.location.origin}/auth/callback`,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state: crypto.randomUUID(),
    scope: 'openid profile email',
    connection: provider, // Auth0-specific
  })

  window.location.href = `${ISSUER}/authorize?${params}`
}
```

## Session Timeout & Idle Detection

```typescript
function useIdleTimeout(timeoutMinutes: number = 30) {
  const { logout } = useAuth()
  const lastActivity = useRef(Date.now())

  useEffect(() => {
    const reset = () => { lastActivity.current = Date.now() }
    window.addEventListener('mousemove', reset)
    window.addEventListener('keydown', reset)
    window.addEventListener('scroll', reset)
    window.addEventListener('click', reset)

    const interval = setInterval(() => {
      if (Date.now() - lastActivity.current > timeoutMinutes * 60 * 1000) {
        logout()
      }
    }, 10000)

    return () => {
      window.removeEventListener('mousemove', reset)
      window.removeEventListener('keydown', reset)
      window.removeEventListener('scroll', reset)
      window.removeEventListener('click', reset)
      clearInterval(interval)
    }
  }, [logout, timeoutMinutes])
}
```

## Auth Flow Decision Tree

```
Auth method?
├── Credentials (email + password)
│   └── Use: custom JWT with refresh rotation
├── Social login (Google, GitHub, etc.)
│   └── Use: OAuth PKCE → accept tokens or exchange for app session
├── Enterprise (SSO, SAML, OIDC)
│   └── Use: OAuth PKCE with OIDC discovery
├── Passwordless / Magic link
│   └── Use: one-time token email link
└── MFA required?
    ├── TOTP → authenticator app codes
    ├── SMS → phone verification
    └── Recovery → single-use backup codes
```
