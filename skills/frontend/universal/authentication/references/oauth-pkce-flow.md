# OAuth PKCE Flow

## Authorization Code Flow with PKCE

```typescript
interface PKCEParams {
  codeVerifier: string
  codeChallenge: string
  state: string
}

function generatePKCE(): PKCEParams {
  const codeVerifier = generateRandomString(128)
  const codeChallenge = base64URLEncode(
    sha256(codeVerifier)
  )
  const state = generateRandomString(32)

  return { codeVerifier, codeChallenge, state }
}

function generateRandomString(length: number): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array)
    .map(byte => charset[byte % charset.length])
    .join('')
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder()
  return crypto.subtle.digest('SHA-256', encoder.encode(plain))
}

function base64URLEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}
```

## Authorization Request

```typescript
interface AuthorizationRequest {
  response_type: string
  client_id: string
  redirect_uri: string
  code_challenge: string
  code_challenge_method: string
  state: string
  scope: string
}

function buildAuthorizationUrl(
  authEndpoint: string,
  clientId: string,
  redirectUri: string,
  scope: string
): { url: string; state: string; codeVerifier: string } {
  const { codeVerifier, codeChallenge, state } = generatePKCE()

  const params: AuthorizationRequest = {
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
    scope,
  }

  const url = new URL(authEndpoint)
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })

  return { url: url.toString(), state, codeVerifier }
}
```

## Token Exchange

```typescript
interface TokenRequest {
  grant_type: string
  code: string
  redirect_uri: string
  client_id: string
  code_verifier: string
}

interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  scope: string
  id_token?: string
}

async function exchangeCodeForToken(
  tokenEndpoint: string,
  code: string,
  codeVerifier: string,
  clientId: string,
  redirectUri: string
): Promise<TokenResponse> {
  const body: TokenRequest = {
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: codeVerifier,
  }

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(Object.entries(body)),
  })

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.status}`)
  }

  return response.json()
}
```

## Token Refresh

```typescript
interface RefreshRequest {
  grant_type: string
  refresh_token: string
  client_id: string
}

async function refreshToken(
  tokenEndpoint: string,
  refreshToken: string,
  clientId: string
): Promise<TokenResponse> {
  const body: RefreshRequest = {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
  }

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(Object.entries(body)),
  })

  if (!response.ok) {
    throw new Error('Token refresh failed')
  }

  return response.json()
}
```

## Secure Token Storage

```typescript
class SecureTokenManager {
  private memoryStore: Map<string, TokenResponse> = new Map()
  private useHttpOnly = true

  setTokens(tokens: TokenResponse): void {
    this.memoryStore.set('tokens', tokens)
  }

  getAccessToken(): string | null {
    return this.memoryStore.get('tokens')?.access_token ?? null
  }

  clearTokens(): void {
    this.memoryStore.delete('tokens')
  }

  hasValidToken(): boolean {
    const tokens = this.memoryStore.get('tokens')
    if (!tokens) return false
    return Date.now() < Date.parse(tokens.expires_in.toString())
  }
}
```

## Key Points

- Use PKCE flow for all public clients (SPAs, mobile apps)
- Never store client_secret in client-side code
- Generate cryptographic random values for code_verifier and state
- Use SHA-256 for code challenge generation
- Validate state parameter to prevent CSRF attacks
- Store tokens in memory, never in localStorage or sessionStorage
- Implement silent token refresh with iframes or service workers
- Handle token expiry with automatic refresh logic
- Revoke tokens on logout to prevent reuse
- Log all token operations for security auditing
- Support multiple OAuth providers with consistent interfaces
- Implement proper error handling for auth failures
