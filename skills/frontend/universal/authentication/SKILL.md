---
name: frontend-authentication
description: >
  Use this skill when the user says 'auth', 'authentication', 'login', 'signup', 'JWT', 'OAuth', 'OAuth2', 'OpenID Connect', 'route guard', 'protected route', 'auth middleware', 'token storage', 'refresh token', 'session management', 'access token', 'logout', 'SSO', 'magic link', 'passwordless', 'MFA', '2FA'. This skill enforces secure token storage, proper route guard patterns, OAuth flow handling (PKCE, Implicit, Auth Code), refresh token rotation, and session persistence. Works with any frontend framework (React, Vue, Angular, Svelte) and any auth provider (Auth0, Clerk, Supabase, Firebase, Cognito, custom). Do NOT use for: backend auth logic, API token validation, or database-level auth.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, authentication, security, universal]
---

# Frontend Authentication

## Purpose
Implement secure authentication on the frontend: token acquisition, storage, route protection, session refresh, and logout — compatible with any auth provider. Tokens are stored securely. Routes are guarded by middleware or wrapper components. OAuth flows follow PKCE best practices.

## Agent Protocol

### Trigger
Exact phrases: "auth", "authentication", "login", "signup", "JWT", "OAuth", "route guard", "protected route", "token storage", "refresh token", "session", "access token", "logout", "SSO", "magic link", "MFA".

### Input Context
- Framework (React, Vue, Angular, Svelte)
- Auth provider (Auth0, Clerk, Supabase, Firebase, Cognito, custom)
- OAuth or credentials-based flow
- Session strategy (JWT + refresh token vs httpOnly cookie)
- Route protection pattern (middleware, wrapper, guard)

### Output Artifact
Complete auth integration: provider config, auth hook/context, protected route component, token management, login/logout flows.

### Response Format
```
## Strategy
<auth-provider, token-storage, route-guard-pattern>

## Setup
<provider-config, auth-context>

## Implementation
<login, logout, token-refresh, protected-routes>

## Session
<persistence, recovery, timeout>

—
Compression footer: frontend-auth/v1 | provider: <provider> | storage: <httpOnly|memory|localStorage> | routes: <count>
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Login flow completes (credentials, OAuth, or magic link)
- [ ] Tokens stored securely (httpOnly cookie or in-memory, never localStorage for sensitive apps)
- [ ] Route guards redirect unauthenticated users to login
- [ ] Token refresh happens transparently before expiry
- [ ] Logout clears all local tokens and redirects
- [ ] Session persists across page reloads (cookie or refresh token)
- [ ] Auth state available globally via context/provider

### Max Response Length
4096 tokens

## Workflow

### 1. Auth Provider Integration
```typescript
// Auth0
import { Auth0Provider } from '@auth0/auth0-react'
<Auth0Provider domain="dev-xxx.us.auth0.com" clientId="xxx" authorizationParams={{ redirect_uri: window.location.origin }}>
  <App />
</Auth0Provider>

// Supabase
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Custom JWT
const login = async (email: string, password: string) => {
  const { accessToken, refreshToken } = await api.post('/auth/login', { email, password })
  tokenStorage.set({ accessToken, refreshToken })
}
```

### 2. Token Storage Decision
| Storage | Security | Persists Refresh | Use When |
|---------|----------|-----------------|----------|
| httpOnly cookie | Best | Yes | Same-origin API, production apps |
| In-memory | Good | No (must use refresh token) | SPAs with refresh token rotation |
| localStorage with prefix | Moderate | Yes | Low-sensitivity apps, prototyping |
| sessionStorage | Moderate | No (tab-scoped) | Short-lived sessions |

### 3. Auth Context
```typescript
interface AuthState {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

interface AuthActions {
  login: (credentials: Credentials) => Promise<void>
  logout: () => Promise<void>
  getAccessToken: () => Promise<string | null>
}
```

### 4. Route Guards
```typescript
// React component guard
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) return <Spinner />
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />
  return <>{children}</>
}

// React Router loader guard
const protectedLoader = async () => {
  const auth = getAuth()
  if (!auth.isAuthenticated) throw redirect('/login')
  return null
}
```

### 5. Token Refresh Interceptor
```typescript
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      const newToken = await refreshAccessToken()
      originalRequest.headers.Authorization = `Bearer ${newToken}`
      return api(originalRequest)
    }
    return Promise.reject(error)
  }
)
```

### 6. Logout
```typescript
async function logout() {
  await api.post('/auth/logout') // invalidate refresh token server-side
  tokenStorage.clear()
  authContext.reset()
  router.navigate('/login')
}
```

### 7. OAuth with PKCE
```typescript
// Generate code verifier and challenge
const verifier = generateRandomString(64)
const challenge = await sha256(verifier)
localStorage.setItem('code_verifier', verifier)

// Redirect to auth server
window.location.href = `https://auth.example.com/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&code_challenge=${challenge}&code_challenge_method=S256&state=${state}`

// On callback, exchange code for tokens
const { code, state: returnedState } = parseCallbackUrl()
const verifier = localStorage.getItem('code_verifier')
const tokens = await api.post('/auth/token', { code, verifier, redirect_uri: REDIRECT_URI })
```

## Rules
1. Never store access tokens in localStorage for production apps — use httpOnly cookies or in-memory storage.
2. Always use PKCE for OAuth public clients — never the implicit flow.
3. Token refresh is transparent — the app never shows a 401 to the user unless the refresh itself fails.
4. Route guards check both authentication AND authorization (role/permission).
5. Auth state is proven via a global provider/context — never pass tokens through component props.
6. Always handle the loading state (initial auth check) to prevent flash of unauthenticated content.
7. Logout clears tokens locally AND invalidates the server-side session.
8. CSRF tokens are used alongside auth tokens for state-changing requests.
9. Rate-limit login attempts client-side (3 attempts = 30s cooldown) in addition to server limits.
10. OAuth state parameter is always validated on callback to prevent CSRF on the redirect.

## References
- `references/auth-flows.md` — OAuth PKCE, Auth Code flow, passwordless, magic link, MFA, SSO
- `references/token-management.md` — JWT storage, refresh rotation, interceptor patterns, session recovery
- `references/auth-security.md` — CSRF, SameSite, rate limiting, session fingerprinting, secure logout, theft detection
- `references/auth-providers.md` — Auth0, Clerk, Supabase, Firebase, Cognito setup patterns, provider abstraction

## Handoff
No artifact produced unless requested.
Next skill: `frontend-security` — CSP headers, XSS prevention for auth pages.
Carry forward: auth provider, token storage strategy, route guard pattern, refresh strategy.
