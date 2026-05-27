# OAuth2 Deep Dive

## Grant Types

### Authorization Code + PKCE
```
Client App                          Auth Server                    Resource Server
    |                                    |                              |
    |--- Authorization Request -------->|                              |
    |   (response_type=code,            |                              |
    |    client_id, redirect_uri,        |                              |
    |    code_challenge=S256,            |                              |
    |    code_challenge_method=S256,     |                              |
    |    state)                         |                              |
    |                                    |                              |
    |<-- Auth Code (via redirect) ------|                              |
    |                                    |                              |
    |--- Token Request ---------------->|                              |
    |   (grant_type=authorization_code, |                              |
    |    code, code_verifier,           |                              |
    |    redirect_uri, client_id)       |                              |
    |                                    |                              |
    |<-- Access Token + Refresh Token --|                              |
    |                                    |                              |
    |--- API Request (Bearer token) --->|------------------------------>|
    |                                    |                              |
    |<-- Response ----------------------|<------------------------------|
```

### PKCE Code Challenge Generation
```typescript
import crypto from 'crypto';

function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = crypto.randomBytes(32)
    .toString('base64url')
    .replace(/[^a-zA-Z0-9\-._~]/g, '');

  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  return { codeVerifier, codeChallenge };
}

function generateState(): string {
  return crypto.randomBytes(16).toString('hex');
}
```

### Authorization Code Flow (SPA)
```typescript
interface AuthCodeFlowParams {
  authorizationEndpoint: string;
  tokenEndpoint: string;
  clientId: string;
  redirectUri: string;
  scope: string;
}

class AuthorizationCodeFlow {
  private codeVerifier: string;
  private state: string;

  async initiateLogin(params: AuthCodeFlowParams): Promise<void> {
    this.state = generateState();
    const { codeVerifier, codeChallenge } = generatePKCE();
    this.codeVerifier = codeVerifier;

    // Store state and code verifier in session
    sessionStorage.setItem('oauth_state', this.state);
    sessionStorage.setItem('oauth_code_verifier', this.codeVerifier);

    const authUrl = new URL(params.authorizationEndpoint);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', params.clientId);
    authUrl.searchParams.set('redirect_uri', params.redirectUri);
    authUrl.searchParams.set('scope', params.scope);
    authUrl.searchParams.set('state', this.state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    window.location.href = authUrl.toString();
  }

  async exchangeCode(
    code: string,
    returnedState: string,
    params: AuthCodeFlowParams
  ): Promise<TokenResponse> {
    const savedState = sessionStorage.getItem('oauth_state');
    if (returnedState !== savedState) {
      throw new Error('State mismatch — possible CSRF attack');
    }

    const codeVerifier = sessionStorage.getItem('oauth_code_verifier');
    if (!codeVerifier) {
      throw new Error('Code verifier not found in session');
    }

    const response = await fetch(params.tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: params.redirectUri,
        client_id: params.clientId,
        code_verifier: codeVerifier,
      }),
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.status}`);
    }

    const tokens: TokenResponse = await response.json();
    this.storeTokens(tokens);
    return tokens;
  }

  private storeTokens(tokens: TokenResponse): void {
    // Store access token in memory only (not localStorage)
    // Store refresh token in httpOnly secure cookie
    window.__tokens = {
      accessToken: tokens.access_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
    };
  }
}
```

### Client Credentials Flow (M2M)
```typescript
interface ClientCredentialsParams {
  tokenEndpoint: string;
  clientId: string;
  clientSecret: string;
  scope: string;
}

async function getClientCredentialsToken(
  params: ClientCredentialsParams
): Promise<TokenResponse> {
  const response = await fetch(params.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: params.clientId,
      client_secret: params.clientSecret,
      scope: params.scope,
    }),
  });

  if (!response.ok) {
    throw new Error(`Client credentials grant failed: ${response.status}`);
  }

  return response.json();
}

// Token cache for M2M
class ClientCredentialsCache {
  private cache: Map<string, { token: string; expiresAt: number }> = new Map();

  async getToken(params: ClientCredentialsParams): Promise<string> {
    const cacheKey = `${params.clientId}:${params.scope}`;
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now() + 60000) {
      return cached.token;
    }

    const response = await getClientCredentialsToken(params);
    this.cache.set(cacheKey, {
      token: response.access_token,
      expiresAt: Date.now() + response.expires_in * 1000,
    });

    return response.access_token;
  }
}
```

### Device Grant Flow
```
1. Client requests device code
   POST /device_authorization
   { client_id, scope }

2. Server returns
   { device_code, user_code, verification_uri, interval }

3. User visits verification_uri, enters user_code

4. Client polls token endpoint
   POST /token
   { grant_type: "urn:ietf:params:oauth:grant-type:device_code",
     device_code, client_id }

5. Server returns tokens when user completes authorization
```

```typescript
interface DeviceAuthResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete: string;
  expires_in: number;
  interval: number;
}

async function startDeviceFlow(
  tokenEndpoint: string,
  clientId: string,
  scope: string
): Promise<DeviceAuthResponse> {
  const response = await fetch(`${tokenEndpoint}/device_authorization`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, scope }),
  });

  return response.json();
}

async function pollForToken(
  tokenEndpoint: string,
  clientId: string,
  deviceCode: string,
  interval: number
): Promise<TokenResponse> {
  const poll = async (): Promise<TokenResponse> => {
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        device_code: deviceCode,
        client_id: clientId,
      }),
    });

    if (response.status === 400) {
      const error = await response.json();
      if (error.error === 'authorization_pending') {
        await sleep(interval * 1000);
        return poll();
      }
      if (error.error === 'slow_down') {
        await sleep((interval + 5) * 1000);
        return poll();
      }
      throw new Error(`Device flow error: ${error.error}`);
    }

    return response.json();
  };

  return poll();
}
```

### Implicit Grant (Deprecated)
```
⚠ IMPLICIT GRANT IS DEPRECATED
Reason: Access token in URL fragment, cannot be secured.
Use Authorization Code + PKCE instead.

Migration path:
1. Check if auth server supports PKCE
2. Update SPA to use authorization code flow
3. Enable PKCE enforcement on auth server
4. Monitor for implicit grant usage and block
```

## Token Exchange

### Token Exchange Flow
```typescript
interface TokenExchangeParams {
  tokenEndpoint: string;
  clientId: string;
  clientSecret: string;
  subjectToken: string;
  subjectTokenType: string;
  requestedTokenType: string;
  audience?: string;
  scope?: string;
}

async function exchangeToken(
  params: TokenExchangeParams
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
    client_id: params.clientId,
    client_secret: params.clientSecret,
    subject_token: params.subjectToken,
    subject_token_type: params.subjectTokenType,
    requested_token_type: params.requestedTokenType,
  });

  if (params.audience) body.set('audience', params.audience);
  if (params.scope) body.set('scope', params.scope);

  const response = await fetch(params.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.status}`);
  }

  return response.json();
}

// Usage: Exchange an access token for a down-scoped token
const downscopedToken = await exchangeToken({
  tokenEndpoint: 'https://auth.example.com/token',
  clientId: 'my-client',
  clientSecret: process.env.CLIENT_SECRET!,
  subjectToken: originalAccessToken,
  subjectTokenType: 'urn:ietf:params:oauth:token-type:access_token',
  requestedTokenType: 'urn:ietf:params:oauth:token-type:access_token',
  scope: 'read:orders', // More restricted scope
});
```

## Refresh Token Rotation

### Refresh Token Rotation
```typescript
interface TokenStore {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

class RefreshTokenManager {
  private currentRefreshToken: string | null = null;

  async refreshAccessToken(
    tokenEndpoint: string,
    clientId: string,
    refreshToken: string
  ): Promise<TokenStore> {
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
      }),
    });

    const tokens = await response.json();

    if (!response.ok) {
      // Refresh token revoked or expired
      if (response.status === 400 && tokens.error === 'invalid_grant') {
        this.currentRefreshToken = null;
        throw new Error('Session expired — re-authentication required');
      }
      throw new Error(`Refresh failed: ${response.status}`);
    }

    // Rotate: old refresh token is invalidated, new one issued
    this.currentRefreshToken = tokens.refresh_token;

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
    };
  }

  // Detect refresh token reuse (possible theft)
  async handleRefreshTokenReuse(
    tokenEndpoint: string,
    clientId: string,
    reusedRefreshToken: string
  ): Promise<void> {
    // Rotate all issued tokens for this client
    await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: reusedRefreshToken,
        client_id: clientId,
      }),
    });

    // Log security event
    console.error('Refresh token reuse detected — possible token theft');
    await logSecurityEvent('refresh_token_reuse', { clientId });
    await revokeAllTokensForClient(clientId);
    await notifyUserOfTokenRevocation(clientId);
  }
}
```

## Token Introspection

### Introspect Token
```typescript
interface IntrospectionResponse {
  active: boolean;
  scope?: string;
  client_id?: string;
  username?: string;
  token_type?: string;
  exp?: number;
  iat?: number;
  nbf?: number;
  sub?: string;
  aud?: string[];
  iss?: string;
  jti?: string;
}

async function introspectToken(
  introspectionEndpoint: string,
  token: string,
  clientId: string,
  clientSecret: string,
  tokenTypeHint: string = 'access_token'
): Promise<IntrospectionResponse> {
  const response = await fetch(introspectionEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      token,
      token_type_hint: tokenTypeHint,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    throw new Error(`Introspection failed: ${response.status}`);
  }

  return response.json();
}
```

## Token Revocation

### Revoke Token
```typescript
async function revokeToken(
  revocationEndpoint: string,
  token: string,
  clientId: string,
  clientSecret?: string,
  tokenTypeHint: string = 'access_token'
): Promise<void> {
  const body = new URLSearchParams({
    token,
    token_type_hint: tokenTypeHint,
    client_id: clientId,
  });

  if (clientSecret) body.set('client_secret', clientSecret);

  const response = await fetch(revocationEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  // RFC 7009: Server may respond with 200 even if token was invalid
  if (response.status !== 200) {
    throw new Error(`Revocation failed: ${response.status}`);
  }
}

// Comprehensive session cleanup
async function logoutUser(
  userId: string,
  sessions: string[]
): Promise<void> {
  const results = await Promise.allSettled(
    sessions.map((token) =>
      revokeToken(
        'https://auth.example.com/revoke',
        token,
        'my-client',
        process.env.CLIENT_SECRET
      )
    )
  );

  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length > 0) {
    console.error(`${failed.length} token revocations failed`);
  }

  await db.query(
    'UPDATE user_sessions SET revoked_at = NOW() WHERE user_id = $1',
    [userId]
  );
}
```

## Scopes Best Practices

### Scope Design Patterns
```yaml
# Resource-based scopes
scopes:
  read:orders: "View order details"
  write:orders: "Create and modify orders"
  delete:orders: "Cancel and remove orders"
  read:users: "View user profiles"
  write:users: "Update user profiles"

# Functional scopes  
  admin: "Full administrative access"
  billing: "Access billing and invoices"
  support: "Customer support operations"

# Infrastructure scopes
  audit: "Read audit logs"
  metrics: "Read service metrics"
  webhooks: "Manage webhook subscriptions"
```

### Scope Validation
```typescript
function validateScopes(
  tokenScopes: string[],
  requiredScopes: string[]
): boolean {
  return requiredScopes.every((scope) => {
    if (scope.includes(':')) {
      // Exact match for specific scope
      return tokenScopes.includes(scope);
    }
    // Wildcard: token has 'admin' which covers all
    if (scope.endsWith(':*') && tokenScopes.includes('admin')) {
      return true;
    }
    return tokenScopes.includes(scope);
  });
}

// Middleware
function requireScopes(...requiredScopes: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const tokenScopes = req.token.scope?.split(' ') || [];

    if (!validateScopes(tokenScopes, requiredScopes)) {
      return res.status(403).json({
        error: 'insufficient_scope',
        message: `Required scopes: ${requiredScopes.join(', ')}`,
      });
    }

    next();
  };
}
```

## OAuth2 in Microservices

### Gateway Token Validation
```typescript
// API Gateway middleware for JWT validation
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const jwks = jwksClient({
  jwksUri: 'https://auth.example.com/.well-known/jwks.json',
  cache: true,
  cacheMaxAge: 86400000, // 24h
  rateLimit: true,
});

async function validateToken(token: string): Promise<TokenPayload> {
  const decoded = jwt.decode(token, { complete: true });

  if (!decoded || !decoded.header.kid) {
    throw new Error('Invalid token — missing kid');
  }

  const signingKey = await jwks.getSigningKey(decoded.header.kid);
  const publicKey = signingKey.getPublicKey();

  return jwt.verify(token, publicKey, {
    algorithms: ['RS256', 'ES256'],
    issuer: 'https://auth.example.com/',
    audience: 'https://api.example.com',
    clockTolerance: 30, // 30s clock skew tolerance
  }) as TokenPayload;
}

// Gateway middleware
async function gatewayAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'missing_token' });
    return;
  }

  try {
    const token = authHeader.slice(7);
    const payload = await validateToken(token);
    req.token = payload;

    // Forward user context to downstream services
    req.headers['x-user-id'] = payload.sub;
    req.headers['x-user-scopes'] = payload.scope?.join(',') || '';
    req.headers['x-session-id'] = payload.jti;

    next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError'
      ? 'token_expired'
      : 'invalid_token';
    res.status(401).json({ error: message });
  }
}
```

### Service-to-Service (Client Credentials)
```typescript
// Service A calling Service B
class ServiceClient {
  private tokenCache: ClientCredentialsCache = new ClientCredentialsCache();

  async callServiceB(endpoint: string): Promise<Response> {
    const token = await this.tokenCache.getToken({
      tokenEndpoint: 'https://auth.example.com/token',
      clientId: process.env.SERVICE_A_CLIENT_ID!,
      clientSecret: process.env.SERVICE_A_CLIENT_SECRET!,
      scope: 'read:service-b',
    });

    return fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }
}
```

## OAuth2 vs API Keys

| Aspect | OAuth2 | API Keys |
|--------|--------|----------|
| Identity | Represents a user/actor | Represents an application |
| Scoping | Fine-grained scopes | Typically broad access |
| Rotation | Short-lived tokens, rotation built-in | Manual rotation |
| Revocation | Immediate per-token | Per-key (may have propagation delay) |
| Audit | Per-request user identification | App-level identification only |
| Complexity | Higher | Lower |
| Use case | User-facing, delegated access | Server-to-server, simple scripts |

### Hybrid Approach
```typescript
// Support both OAuth2 and API keys
async function authenticateRequest(
  req: Request
): Promise<{ type: 'oauth2' | 'apikey'; identity: string; scopes: string[] }> {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'];

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const payload = await validateToken(token);
    return {
      type: 'oauth2',
      identity: payload.sub,
      scopes: payload.scope?.split(' ') || [],
    };
  }

  if (apiKey) {
    const keyInfo = await validateApiKey(apiKey as string);
    return {
      type: 'apikey',
      identity: keyInfo.appId,
      scopes: keyInfo.scopes,
    };
  }

  throw new AuthenticationError('No authentication provided');
}
```

## Common Pitfalls

### CORS Misconfiguration
```typescript
// ❌ Bad: Overly permissive CORS
app.use(cors({ origin: true, credentials: true }));

// ✅ Good: Strict origin allowlist
const allowedOrigins = [
  'https://app.example.com',
  'https://admin.example.com',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  maxAge: 600,
}));
```

### Redirect URI Validation
```typescript
// ❌ Bad: Pattern matching allows open redirect
function validateRedirectUri(uri: string): boolean {
  return uri.startsWith('https://myapp.com'); // Can be exploited
  // https://myapp.com.evil.com/ would pass!
}

// ✅ Good: Exact match with allowed list
const ALLOWED_REDIRECT_URIS = new Set([
  'https://myapp.com/auth/callback',
  'https://myapp.com/mobile/callback',
]);

function validateRedirectUri(uri: string): boolean {
  try {
    const parsed = new URL(uri);
    // Also validate no fragment in redirect URI
    if (parsed.hash) return false;
    return ALLOWED_REDIRECT_URIS.has(uri);
  } catch {
    return false;
  }
}
```

### State Parameter
```typescript
// ❌ Bad: No state parameter
const authUrl = `${authEndpoint}?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}`;

// ✅ Good: State parameter with cryptographic strength
function buildAuthUrl(params: AuthUrlParams): string {
  const state = crypto.randomBytes(32).toString('hex');

  const url = new URL(params.authEndpoint);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', params.clientId);
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('state', state);

  // Store state for verification
  sessionStorage.setItem('oauth_state', state);

  return url.toString();
}

// Verify state on callback
function verifyState(returnedState: string): boolean {
  const savedState = sessionStorage.getItem('oauth_state');
  sessionStorage.removeItem('oauth_state');
  return crypto.timingSafeEqual(
    Buffer.from(returnedState),
    Buffer.from(savedState)
  );
}
```

### CSRF via Mix-Up Attack
```typescript
// Ensure client_id matches what was expected
function validateCallback(params: CallbackParams): void {
  if (params.client_id !== EXPECTED_CLIENT_ID) {
    throw new Error('Client ID mismatch — possible mix-up attack');
  }

  if (params.state !== sessionStorage.getItem('oauth_state')) {
    throw new Error('State mismatch — possible CSRF');
  }
}
```

## Key Points
- Authorization Code + PKCE is the only secure flow for SPAs and mobile apps
- Implicit grant is deprecated — never use it in new implementations
- Client credentials is for server-to-server communication without user context
- Device grant is for input-constrained devices (CLI, smart TVs)
- Always rotate refresh tokens and detect reuse patterns
- Token introspection allows resource servers to validate tokens without shared keys
- Scope design should follow resource:action conventions with least privilege
- Gateway token validation centralizes auth logic and forwards user context
- Validate redirect URIs with exact matching, never pattern matching
- State parameter with cryptographic randomness prevents CSRF in auth code flow
- API keys are simpler but less secure — prefer OAuth2 for user-facing APIs
