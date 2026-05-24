# BFF Auth and Session Reference

## Session Management

### Session Store Options

| Store | Persistence | Performance | Best For |
|-------|-------------|-------------|----------|
| Memory | Lost on restart | Fastest | Development, single instance |
| Redis | Durable (RDB/AOF) | Fast | Production, multi-instance |
| Database | Fully durable | Slower | When Redis not available |
| Signed cookies | Client-side | No server storage | Stateless sessions |

### Redis Session Store
```typescript
import RedisStore from 'connect-redis';
import session from 'express-session';
import { Redis } from 'ioredis';

const redisClient = new Redis({
  host: process.env.REDIS_HOST,
  port: 6379,
  enableAutoPipelining: true,
});

const sessionMiddleware = session({
  store: new RedisStore({ client: redisClient, prefix: 'sess:' }),
  secret: process.env.SESSION_SECRET,
  name: '__Host-session',   // __Host- prefix = secure + path=/ + domain-locked
  cookie: {
    secure: true,           // HTTPS only
    httpOnly: true,         // No JS access
    sameSite: 'strict',     // CSRF protection
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: '/',
  },
  rolling: true,            // Refresh session on each request
  resave: false,
  saveUninitialized: false,
});
```

## Token Exchange

BFF acts as the token handler: exchanges authorization codes for tokens, never exposes tokens to the browser.

```typescript
// OAuth2 Authorization Code Flow + PKCE (BFF as Token Handler)
class BFFAuthHandler {
  private tokenStore = new Map<string, TokenSet>();

  // Step 1: Initiate login
  async initiateLogin(req: Request, res: Response) {
    const state = crypto.randomUUID();
    const codeVerifier = generatePKCEVerifier();
    const codeChallenge = await generatePKCEChallenge(codeVerifier);

    // Store state + verifier in session (server-side, not cookie)
    req.session.oauthState = { state, codeVerifier };
    req.session.save();

    const authUrl = buildAuthUrl({
      client_id: process.env.OAUTH_CLIENT_ID,
      redirect_uri: `${req.protocol}://${req.hostname}/api/auth/callback`,
      response_type: 'code',
      scope: 'openid profile email',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    res.redirect(authUrl);
  }

  // Step 2: Handle callback — exchange code for tokens (SERVER-SIDE ONLY)
  async handleCallback(req: Request, res: Response) {
    const { code, state } = req.query;
    const storedState = req.session.oauthState;

    if (state !== storedState.state) {
      return res.status(403).json({ error: 'State mismatch — possible CSRF' });
    }

    // Exchange authorization code for tokens (server-side, never exposed to client)
    const tokenResponse = await fetch('https://auth.example.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: `${req.protocol}://${req.hostname}/api/auth/callback`,
        client_id: process.env.OAUTH_CLIENT_ID,
        client_secret: process.env.OAUTH_CLIENT_SECRET,
        code_verifier: storedState.codeVerifier,
      }),
    });

    const tokens = await tokenResponse.json();
    // Store tokens in server-side session — NEVER send to client
    req.session.tokens = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
      idToken: tokens.id_token,
    };
    req.session.oauthState = undefined;  // Clean up
    await req.session.save();

    // Issue session cookie to browser (not the access token)
    res.redirect('/dashboard');
  }
}
```

## Refresh Token Rotation

```typescript
class TokenRefresher {
  async refreshAccessToken(session: SessionData): Promise<boolean> {
    if (!session.tokens?.refreshToken) return false;

    // Check if token is expired or about to expire
    if (Date.now() < (session.tokens.expiresAt - 60_000)) return true;

    try {
      const response = await fetch('https://auth.example.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: session.tokens.refreshToken,
          client_id: process.env.OAUTH_CLIENT_ID,
          client_secret: process.env.OAUTH_CLIENT_SECRET,
        }),
      });

      const tokens = await response.json();

      // Rotate refresh token: old token is invalidated
      session.tokens = {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,  // NEW refresh token
        expiresAt: Date.now() + tokens.expires_in * 1000,
      };

      return true;
    } catch (err) {
      logger.error('Token refresh failed', { error: err });
      session.tokens = undefined;
      return false;
    }
  }
}
```

## Cookie Security

### Cookie Attributes

```yaml
cookie_security:
  session_cookie:
    name: "__Host-session"
    attributes:
      secure: true         # Only sent over HTTPS
      httpOnly: true       # Inaccessible to JavaScript
      sameSite: strict     # Not sent on cross-site requests
      path: "/"            # Required for __Host- prefix
      domain: ""           # Not set (required for __Host- prefix)
      maxAge: 86400        # 24 hours
      priority: high       # Chrome high-priority cookie
```

### CSRF Protection
```typescript
// BFF issues CSRF token via session (not cookie)
function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  const headerToken = req.headers['x-csrf-token'] as string;
  const sessionToken = req.session.csrfToken;

  if (!headerToken || !sessionToken || headerToken !== sessionToken) {
    return res.status(403).json({ error: 'CSRF token mismatch' });
  }

  next();
}

// Generate CSRF token on login
app.post('/api/auth/login', async (req, res) => {
  const user = await authenticate(req.body);
  req.session.userId = user.id;
  req.session.csrfToken = crypto.randomUUID();
  await req.session.save();
  res.json({ csrfToken: req.session.csrfToken });
});
```

## BFF as Token Handler Pattern

```
                         No tokens in browser!
┌──────────┐  session cookie  ┌──────────────────┐  access token   ┌──────────────┐
│ Browser  │ ◄──────────────► │      BFF         │ ◄─────────────► │ Auth Provider│
│ (SPA)    │                  │ (Token Handler)   │  refresh token  │              │
└──────────┘                  └──────────────────┘                 └──────────────┘
                                    │
                                    │ access token
                                    ▼
                              ┌──────────────┐
                              │  Backend API  │
                              └──────────────┘
```

### Advantages
- Tokens never exposed to client-side JavaScript (XSS safe)
- Refresh token rotation without client involvement
- Centralized session management (logout across devices)
- Uniform auth for web, mobile, and API clients
- Cookie-based auth with browser's built-in CSRF protections

## BFF Auth Best Practices

- **Never send tokens to the browser**: BFF stores all tokens server-side
- **Use `__Host-` cookie prefix**: Enforces secure + path=/ + no domain
- **Short session TTL**: 15-60 minutes, refresh via BFF
- **Rotate refresh tokens**: Old refresh token is invalidated on each refresh
- **Bind sessions to IP**: Verify IP hasn't changed significantly between requests
- **Logout invalidates everywhere**: Clear server session + token revocation
- **Rate limit auth endpoints**: /login, /refresh, /logout need rate limiting
