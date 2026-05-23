# Token Management

## JWT Structure

A JWT has three base64url-encoded parts separated by dots: `header.payload.signature`.

```
header:  {"alg":"RS256","typ":"JWT","kid":"abc123"}
payload: {"sub":"user_123","iat":1700000000,"exp":1700003600,"scope":"openid profile email","roles":["admin"]}
```

Decode without verification for debugging: `atob(token.split('.')[1])`.

## Token Storage Options

### httpOnly Cookie (Recommended)
```
Set-Cookie: access_token=<jwt>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=900
Set-Cookie: refresh_token=<jwt>; HttpOnly; Secure; SameSite=Strict; Path=/api/auth; Max-Age=604800
```

- No JavaScript access → immune to XSS token theft
- Automatically sent on same-origin requests
- Refresh token cookie scoped to `/api/auth` only
- Server reads cookie, validates, and responds

### In-Memory Storage (Good)
```typescript
let inMemoryToken: { accessToken: string; refreshToken: string } | null = null

export const tokenStore = {
  get: () => inMemoryToken,
  set: (tokens: typeof inMemoryToken) => { inMemoryToken = tokens },
  clear: () => { inMemoryToken = null },
}
```

- Tokens lost on page reload → must use refresh token or redirect to login
- Safe from XSS (no DOM access to memory)
- Requires refresh token in httpOnly cookie

### localStorage with Prefix (Moderate)
```typescript
const PREFIX = 'app_auth_'

export const tokenStore = {
  get: () => ({
    accessToken: localStorage.getItem(`${PREFIX}access_token`),
    refreshToken: localStorage.getItem(`${PREFIX}refresh_token`),
  }),
  set: ({ accessToken, refreshToken }: { accessToken: string; refreshToken: string }) => {
    localStorage.setItem(`${PREFIX}access_token`, accessToken)
    localStorage.setItem(`${PREFIX}refresh_token`, refreshToken)
  },
  clear: () => {
    localStorage.removeItem(`${PREFIX}access_token`)
    localStorage.removeItem(`${PREFIX}refresh_token`)
  },
}
```

- Vulnerable to XSS — any injected script can read tokens
- Use only for prototyping or low-sensitivity apps
- Prefix keys to avoid collisions with other apps on same origin

## Token Refresh Rotation

### Basic Refresh
```typescript
let refreshPromise: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise  // deduplicate concurrent refreshes

  refreshPromise = api.post('/auth/refresh', {
    refreshToken: tokenStore.get()?.refreshToken,
  }).then((res) => {
    tokenStore.set({ accessToken: res.accessToken, refreshToken: res.refreshToken })
    return res.accessToken
  }).finally(() => {
    refreshPromise = null
  })

  return refreshPromise
}
```

### Refresh Token Rotation (Best Practice)
Each refresh request issues a new refresh token and invalidates the old one. If a refresh token is reused (stolen token scenario), all sessions are revoked.

```typescript
async function refreshWithRotation(): Promise<string> {
  const res = await api.post('/auth/refresh', {
    refreshToken: currentRefreshToken,
  })
  // Server response includes new refresh token AND invalidates old one
  tokenStore.set({ accessToken: res.accessToken, refreshToken: res.refreshToken })
  return res.accessToken
}
```

### Automatic Refresh Interceptor
```typescript
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    originalRequest._retry = true

    try {
      const newToken = await refreshAccessToken()
      originalRequest.headers.Authorization = `Bearer ${newToken}`
      return api(originalRequest)
    } catch {
      // Refresh failed — force logout
      tokenStore.clear()
      window.location.href = '/login?session_expired=true'
      return Promise.reject(error)
    }
  }
)
```

## Session Recovery on Page Load

```typescript
async function initializeAuth(): Promise<AuthState> {
  const storedTokens = tokenStore.get()

  if (!storedTokens?.accessToken) {
    return { user: null, isAuthenticated: false, isLoading: false }
  }

  // Check if access token is expired
  const payload = parseJWT(storedTokens.accessToken)
  const isExpired = payload.exp * 1000 < Date.now()

  if (isExpired && storedTokens.refreshToken) {
    try {
      const newAccessToken = await refreshAccessToken()
      const user = await fetchUser(newAccessToken)
      return { user, isAuthenticated: true, isLoading: false }
    } catch {
      return { user: null, isAuthenticated: false, isLoading: false }
    }
  }

  if (!isExpired) {
    const user = await fetchUser(storedTokens.accessToken)
    return { user, isAuthenticated: true, isLoading: false }
  }

  return { user: null, isAuthenticated: false, isLoading: false }
}
```

## JWT Decode (without verification — client-side only)

```typescript
function parseJWT(token: string): Record<string, unknown> | null {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}
```

## Token Expiry Warnings

```typescript
// Warn user 5 minutes before token expiry
function useTokenExpiryWarning() {
  const { getAccessToken } = useAuth()

  useEffect(() => {
    const check = setInterval(async () => {
      const token = await getAccessToken()
      if (!token) return

      const payload = parseJWT(token)
      if (!payload?.exp) return

      const expiresIn = payload.exp * 1000 - Date.now()
      if (expiresIn > 0 && expiresIn < 5 * 60 * 1000) {
        showToast('Your session will expire soon. Save your work.', 'warning')
      }
    }, 60000)

    return () => clearInterval(check)
  }, [getAccessToken])
}
```

## Common Token Issues

| Issue | Symptom | Fix |
|-------|---------|-----|
| Token too large | 413 Request Entity Too Large | Reduce JWT claims, move user data to `/me` endpoint |
| Clock skew | Valid tokens rejected | Allow 30s leeway in server validation (`clockTolerance: 30`) |
| Concurrent refresh | Multiple refresh requests | Deduplicate with `refreshPromise` pattern above |
| Refresh token reuse | All sessions revoked | Implement refresh rotation with family tracking |
| Token in URL (OAuth implicit) | Leaked in server logs | Use PKCE + code flow, never implicit |
| Missing `sub` claim | User identification fails | Always include `sub` as stable user identifier |
| Expired ID token | User profile unavailable | Re-authenticate or fetch from `/userinfo` endpoint |
