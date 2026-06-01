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

## Auth Strategy Decision Trees

### Auth Provider Decision Tree
```
Team size and requirements?
  |-- Solo / small team, need quick setup -->
  |     |-- Want hosted auth UI? --> Clerk or Auth0
  |     |-- Want database integration? --> Supabase Auth
  |     |-- Need social login quick? --> Firebase Auth
  |-- Mid-size team, need control -->
  |     |-- Using AWS? --> Cognito
  |     |-- Need enterprise SSO? --> Auth0 or Azure AD B2C
  |     |-- Want self-hosted? --> Keycloak or Supertokens
  |-- Large enterprise -->
        |-- Have identity provider? --> OIDC federation
        |-- Building custom? --> Custom JWT with OAuth2
```

### Token Storage Decision Tree
```
Is the app a production SPA with sensitive data?
  |-- YES --> Can the API set httpOnly cookies?
  |     |-- YES --> httpOnly cookie (best security)
  |     |-- NO  --> In-memory + refresh token rotation
  |-- NO  --> Is it a low-sensitivity app or prototype?
        |-- YES --> localStorage (acceptable for low-risk)
        |-- NO  --> sessionStorage (tab-scoped, moderate security)

Auth token in localStorage?
  |-- Risk: XSS → token theft
  |-- Mitigation: short expiry, CSP headers, input sanitization
  |-- Recommendation: Never for production banking/health/enterprise apps
```

### Route Protection Strategy Decision Tree
```
Route type?
  |-- Public (landing, marketing, login) → no guard
  |-- Authenticated only (dashboard, profile) → auth guard
  |-- Role-restricted (admin panel) → auth guard + role/perm check
  |-- Guest-only (login/signup when logged in) → redirect to home
```

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

```typescript
// Complete auth context with session recovery
const AuthContext = createContext<AuthState & AuthActions | null>(null)

function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isLoading: true, // start loading — check for existing session
  })

  // Session recovery on mount
  useEffect(() => {
    const storedUser = sessionStorage.getItem('auth_user')
    const storedToken = sessionStorage.getItem('auth_token')
    if (storedUser && storedToken) {
      setState({
        user: JSON.parse(storedUser),
        accessToken: storedToken,
        isAuthenticated: true,
        isLoading: false,
      })
    } else {
      setState(s => ({ ...s, isLoading: false }))
    }
  }, [])

  const getAccessToken = useCallback(async () => {
    try {
      const newToken = await refreshAccessToken()
      return newToken
    } catch {
      logout()
      return null
    }
  }, [])

  const login = useCallback(async (credentials: Credentials) => {
    const { accessToken, refreshToken, user } = await api.post('/auth/login', credentials)
    tokenStorage.setRefreshToken(refreshToken)
    setState({ user, accessToken, isAuthenticated: true, isLoading: false })
  }, [])

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout') } catch { /* ignore */ }
    tokenStorage.clear()
    setState({ user: null, accessToken: null, isAuthenticated: false, isLoading: false })
  }, [])

  return (
    <AuthContext.Provider value={{ ...state, login, logout, getAccessToken }}>
      {children}
    </AuthContext.Provider>
  )
}

function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
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

// Role-based guard
function AdminRoute({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth()

  if (isLoading) return <Spinner />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user?.role !== 'admin') return <Navigate to="/forbidden" replace />
  return <>{children}</>
}
```

### 5. Token Refresh Interceptor
```typescript
// Axios interceptor for automatic token refresh
let isRefreshing = false
let failedQueue: Array<{ resolve: Function; reject: Function }> = []

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (token) prom.resolve(token)
    else prom.reject(error)
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Only retry 401s that haven't been retried
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    // If already refreshing, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then(token => {
        originalRequest.headers.Authorization = `Bearer ${token}`
        return api(originalRequest)
      })
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      const { accessToken } = await refreshAccessToken()
      processQueue(null, accessToken)
      originalRequest.headers.Authorization = `Bearer ${accessToken}`
      return api(originalRequest)
    } catch (refreshError) {
      processQueue(refreshError, null)
      logout() // force re-login
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
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

### 8. Session Recovery & Token Rotation
```typescript
// Proactive token refresh — refresh before expiry, not after
function useTokenRefresh(expiresIn: number, threshold = 60_000) {
  const { getAccessToken, isAuthenticated } = useAuth()
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (!isAuthenticated) return

    // Refresh 60s before expiry
    const refreshDelay = Math.max(0, expiresIn - threshold)

    refreshTimeoutRef.current = setTimeout(async () => {
      await getAccessToken()
    }, refreshDelay)

    return () => clearTimeout(refreshTimeoutRef.current)
  }, [isAuthenticated, expiresIn, getAccessToken])
}

// Concurrent tab session management
function useSessionSync() {
  useEffect(() => {
    // Listen for logout events from other tabs
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'auth_logout') {
        window.location.href = '/login'
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])
}
```

### 9. MFA / 2FA Integration
```typescript
type MfaStep = 'verify' | 'enroll' | 'challenge'
type MfaMethod = 'totp' | 'sms' | 'email' | 'recovery-code'

interface MfaState {
  required: boolean
  step: MfaStep
  method: MfaMethod
  verified: boolean
}

function useMfa() {
  const [mfa, setMfa] = useState<MfaState>({
    required: false,
    step: 'verify',
    method: 'totp',
    verified: false,
  })

  const verifyCode = async (code: string) => {
    await api.post('/auth/mfa/verify', { code, method: mfa.method })
    setMfa(prev => ({ ...prev, verified: true }))
  }

  const enrollTotp = async () => {
    const { secret, qrCode } = await api.post('/auth/mfa/enroll', { method: 'totp' })
    return { secret, qrCode }
  }

  return { mfa, verifyCode, enrollTotp }
}
```

### 10. Security Considerations
- **XSS Protection**: CSP headers prevent inline script injection. Validate redirect_uri on OAuth callback.
- **CSRF Protection**: SameSite=Strict cookies prevent cross-origin requests. State parameter in OAuth prevents CSRF on redirect.
- **Token Storage**: Never store access tokens in localStorage if the app handles sensitive data. Use httpOnly cookies (set by server) or in-memory storage.
- **Refresh Token Rotation**: Issue a new refresh token on every refresh request. Invalidate the old one. This limits the window for stolen refresh tokens.
- **Rate Limiting**: Implement exponential backoff for failed login attempts. Lock account after N failed attempts.
- **Silent Authentication**: Use iframes or service workers for silent token renewal without user interaction. Handle third-party cookie restrictions gracefully.

### 11. Provider-Specific Patterns

#### Custom JWT with Backend
```typescript
// Login
const login = async (email: string, password: string) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!response.ok) throw new ApiError('Invalid credentials', response.status)

  // Server sets httpOnly cookie for access token
  // Returns refresh token (short-lived, client-side)
  const { refreshToken, user } = await response.json()
  sessionStorage.setItem('refreshToken', refreshToken)
  return user
}
```

#### Auth0
```typescript
import { useAuth0 } from '@auth0/auth0-react'

function Profile() {
  const { user, isAuthenticated, isLoading, loginWithRedirect, logout, getAccessTokenSilently } = useAuth0()

  if (isLoading) return <Spinner />
  if (!isAuthenticated) return <button onClick={() => loginWithRedirect()}>Log in</button>

  return <div>Welcome, {user.name}</div>
}
```

#### Supabase
```typescript
import { createClient, User } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

function useSupabaseAuth() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const loginWithGoogle = () => supabase.auth.signInWithOAuth({ provider: 'google' })
  const loginWithEmail = (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password })
  const logout = () => supabase.auth.signOut()

  return { user, loginWithGoogle, loginWithEmail, logout }
}
```

## Common Pitfalls
1. **Storing tokens in localStorage for sensitive apps**: Vulnerable to XSS. Use httpOnly cookies or in-memory.
2. **Not handling token refresh race conditions**: Multiple simultaneous 401s each trigger refresh. Use isRefreshing flag.
3. **Implicit OAuth flow**: Deprecated and insecure. Always use PKCE.
4. **Missing loading state**: Flash of login page when session exists. Always check auth state before rendering.
5. **Not invalidating server session on logout**: Token remains valid until expiry. Call logout endpoint.
6. **Hardcoded redirect URIs**: OAuth callback URIs must be validated against a whitelist.
7. **No session recovery on tab close**: In-memory tokens are lost on refresh. Use httpOnly cookies or refresh token.
8. **Missing CORS configuration**: Auth endpoints must allow credentials (cookies) from the SPA origin.

## Compared With

| Provider | Auth Methods | Social Login | MFA | SSO | Pricing |
|----------|-------------|--------------|-----|-----|---------|
| Auth0 | OIDC, OAuth2, SAML | 50+ providers | Yes | Yes | Free tier: 7K users |
| Clerk | OIDC, OAuth2 | 10+ providers | Yes | Yes | Free tier: 5K users |
| Supabase | OAuth2, email/pw | 10+ providers | Yes | No | Free tier: 50K users |
| Firebase | OAuth2, email/pw, phone | 10+ providers | Yes | No | Free tier: 10K auth |
| Cognito | OIDC, SAML, OAuth2 | Social + SAML | Yes | Yes | Per MAU pricing |
| Custom JWT | Email/password | Manual | Manual | Manual | Infrastructure cost |

## Performance
1. Auth provider SDKs add 10-50KB to bundle. Consider lazy loading auth-heavy pages.
2. Token refresh is one network roundtrip (~100-300ms). Use proactive refresh to mask latency.
3. Route guards must render loading state instantly to prevent layout shift.
4. OAuth redirects lose React state. Persist redirect URL in sessionStorage before redirect.

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
  - references/auth-flows.md — Auth Flows
  - references/auth-providers.md — Auth Providers
  - references/auth-security.md — Auth Security
  - references/auth-ui-patterns.md — Authentication UI Patterns
  - references/oauth-pkce-flow.md — OAuth PKCE Flow
  - references/token-management.md — Token Management
## Handoff
No artifact produced unless requested.
Next skill: `frontend-security` — CSP headers, XSS prevention for auth pages.
Carry forward: auth provider, token storage strategy, route guard pattern, refresh strategy.
