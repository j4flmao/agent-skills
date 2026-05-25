# OAuth2 Flows

## OAuth2 Grant Types

| Grant Type | Use Case | Refresh Token | Security Level |
|------------|----------|---------------|----------------|
| Authorization Code | Web app, mobile app (with PKCE) | Yes | Highest |
| Authorization Code + PKCE | Native mobile, SPA | Yes | High (no client secret needed) |
| Client Credentials | M2M, server-to-server | No | Medium (requires client secret) |
| Resource Owner Password | Legacy, trusted first-party | Yes | Low (password exposed) |
| Device Code | Smart TVs, CLI, IoT | No | Medium |
| Implicit (deprecated) | Legacy SPA | No | Low (token in URL) |

## Authorization Code Flow (with PKCE)

```
┌─────────┐          ┌───────────┐          ┌──────────┐
│ Client  │          │   Backend │          │   Auth   │
│  (SPA)  │          │   (API)   │          │  Server  │
└────┬────┘          └─────┬─────┘          └────┬─────┘
     │                     │                     │
     │  1. Auth Request    │                     │
     │  + code_challenge   │────────────────────►│
     │                     │                     │
     │  2. Auth Code       │                     │
     │◄──────────────────────────────────────────│
     │                     │                     │
     │  3. Code + verifier │                     │
     │────────────────────►│                     │
     │                     │  4. Token Request   │
     │                     │  + code_verifier    │────►
     │                     │                     │◄────
     │                     │  5. Access Token    │
     │                     │◄────────────────────│
     │  6. Access Token    │                     │
     │◄────────────────────│                     │
     │                     │                     │
     │  7. API Request     │                     │
     │  + Bearer Token     │────────────────────►│
     │                     │                     │
```

## PKCE Implementation

```typescript
// Client-side: Generate code challenge
function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = crypto.randomBytes(32)
    .toString('base64url');

  const codeChallenge = crypto.createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  return { codeVerifier, codeChallenge };
}

// Client-side: Start authorization
async function startOAuthFlow(): Promise<void> {
  const { codeVerifier, codeChallenge } = generatePKCE();

  // Store verifier temporarily
  sessionStorage.setItem('code_verifier', codeVerifier);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: 'your-client-id',
    redirect_uri: 'https://app.example.com/callback',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    scope: 'openid profile email',
    state: crypto.randomUUID(), // Anti-CSRF
  });

  window.location.href = `https://auth.example.com/authorize?${params}`;
}

// Client-side: Exchange code for token
async function exchangeCode(code: string): Promise<TokenResponse> {
  const codeVerifier = sessionStorage.getItem('code_verifier');
  sessionStorage.removeItem('code_verifier');

  const response = await fetch('https://auth.example.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: 'your-client-id',
      redirect_uri: 'https://app.example.com/callback',
      code,
      code_verifier: codeVerifier,
    }),
  });

  return response.json();
}
```

## Client Credentials Flow

```typescript
// Server-side: M2M authentication
class ClientCredentialsClient {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(
    private tokenEndpoint: string,
    private clientId: string,
    private clientSecret: string,
    private scopes: string[],
  ) {}

  async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry - 60000) {
      return this.accessToken; // Return cached token
    }

    const response = await fetch(this.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        scope: this.scopes.join(' '),
      }),
    });

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + data.expires_in * 1000;
    return this.accessToken!;
  }
}
```

## Token Validation Middleware

```typescript
class OAuth2Middleware {
  constructor(
    private jwksClient: JwksClient,
    private expectedIssuer: string,
    private expectedAudience: string,
  ) {}

  async validateToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing access token' });
    }

    const token = authHeader.slice(7);

    try {
      // Decode token header to get key ID
      const header = jwt.decode(token, { complete: true })?.header;
      if (!header?.kid) throw new Error('Missing key ID');

      // Fetch public key from JWKS endpoint
      const signingKey = await this.jwksClient.getSigningKey(header.kid);
      const publicKey = signingKey.getPublicKey();

      // Verify token
      const payload = jwt.verify(token, publicKey, {
        algorithms: ['RS256'],
        issuer: this.expectedIssuer,
        audience: this.expectedAudience,
      }) as JwtPayload;

      // Attach user info to request
      req.user = {
        id: payload.sub,
        roles: payload.realm_access?.roles || [],
        scopes: (payload.scope || '').split(' '),
      };

      next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token', detail: err.message });
    }
  }
}
```

## Scope-Based Authorization

```typescript
// Authorization middleware
function requireScope(scope: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.scopes.includes(scope)) {
      return res.status(403).json({
        error: 'Insufficient scope',
        required: scope,
        granted: req.user?.scopes,
      });
    }
    next();
  };
}

// Route usage
router.post('/orders', requireScope('write:orders'), orderController.create);
router.get('/orders', requireScope('read:orders'), orderController.list);

// Resource-based authorization
function requireResourceAccess(resourceType: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user.id;
    const resourceId = req.params.id;

    const hasAccess = await authorizationService.check({
      userId,
      resourceType,
      resourceId,
      action,
      scopes: req.user.scopes,
      roles: req.user.roles,
    });

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };
}
```

## OAuth2 Provider Comparison

| Provider | Protocol | Grant Types | JWKS | Pricing |
|----------|----------|-------------|------|---------|
| Auth0 | OIDC + OAuth2 | All | Yes | Free tier (7K users) |
| Keycloak | OIDC + OAuth2 | All | Yes | Open source |
| Cognito | OIDC + OAuth2 | Auth Code, Client Credentials | Yes | Pay per MAU |
| Firebase Auth | OIDC | Auth Code, Custom | Yes | Free tier |
| Okta | OIDC + OAuth2 | All | Yes | Free tier (1K users) |
| Azure AD | OIDC + OAuth2 | All | Yes | Included with Azure |

## Token Structure

```json
{
  "iss": "https://auth.example.com/",
  "sub": "user_abc123",
  "aud": "api.example.com",
  "exp": 1717234567,
  "iat": 1717148167,
  "scope": "openid profile email write:orders",
  "realm_access": {
    "roles": ["customer", "premium"]
  },
  "resource_access": {
    "order-api": {
      "roles": ["order:write", "order:read"]
    }
  },
  "email": "user@example.com",
  "email_verified": true,
  "name": "John Doe"
}
```

## Best Practices

- Use PKCE for all public clients (SPA, mobile) — never use implicit flow
- Store client secrets securely (environment variables, secret manager)
- Validate token signature, issuer, audience, and expiry on every request
- Use short-lived access tokens (15 min) with refresh tokens for rotation
- Implement token revocation (blacklist on logout, short TTL)
- Log all auth failures with correlation ID
- Rotate client secrets regularly (every 90 days)
- Use JWKS endpoints for public key discovery (no hardcoded keys)
