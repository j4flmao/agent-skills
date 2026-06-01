# Auth Patterns Advanced

## Token Rotation and Reuse Detection

Refresh token rotation prevents stolen tokens from being reused:

```typescript
class TokenRotationService {
  async refresh(refreshToken: string): Promise<TokenPair> {
    const stored = await this.store.findToken(refreshToken);

    if (!stored || stored.revokedAt) {
      // Token reuse detected — attacker and legitimate user may both have token
      await this.revokeAllUserTokens(stored?.userId);
      await this.securityAlert('REFRESH_TOKEN_REUSE', {
        userId: stored?.userId,
        tokenFamily: stored?.familyId,
      });
      throw new Error('Refresh token reuse detected. All sessions invalidated.');
    }

    // Rotate: revoke old, issue new
    await this.store.revokeToken(refreshToken);

    const newAccess = this.generateAccessToken(stored.userId);
    const newRefresh = this.generateRefreshToken(stored.userId, stored.familyId);

    await this.store.saveToken({
      token: newRefresh,
      userId: stored.userId,
      familyId: stored.familyId,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });

    return { accessToken: newAccess, refreshToken: newRefresh };
  }
}
```

## OAuth2 Flows in Depth

| Flow | Client Secret | Redirect URI | Best For |
|------|--------------|--------------|----------|
| Authorization Code | Yes | Yes | Server-rendered web apps |
| Authorization Code + PKCE | No (or yes) | Yes | SPAs, mobile apps |
| Client Credentials | Yes | No | M2M, server-to-server |
| Resource Owner Password | Yes | No | Legacy apps (avoid) |
| Device Code | No | No | CLI, IoT, TV apps |

### PKCE (Proof Key for Code Exchange)
```typescript
// SPA generates code_verifier and code_challenge
const codeVerifier = base64url(crypto.randomBytes(32));
const codeChallenge = base64url(sha256(codeVerifier));

// Authorization request
window.location = `https://auth.example.com/authorize?
  response_type=code&
  client_id=spa-client&
  redirect_uri=https://app.example.com/callback&
  code_challenge=${codeChallenge}&
  code_challenge_method=S256`;

// Token request (includes code_verifier)
POST /token
{
  grant_type: 'authorization_code',
  code: 'auth_code_from_redirect',
  code_verifier: codeVerifier,
  redirect_uri: 'https://app.example.com/callback',
}
```

## JWKS (JSON Web Key Set)

For RS256/ES256 token verification:

```typescript
// JWKS endpoint
app.get('/.well-known/jwks.json', (req, res) => {
  res.json({
    keys: [
      {
        kty: 'RSA',
        kid: 'key-2024-01',
        use: 'sig',
        alg: 'RS256',
        n: 'base64url-encoded-modulus',
        e: 'AQAB',
      },
    ],
  });
});

// Key rotation: add new key, keep old until tokens expire
const JWKS = {
  keys: [
    { kid: 'key-2024-02', ...newKey },  // New signing key
    { kid: 'key-2024-01', ...oldKey },  // Old key (verify only, not sign)
  ],
};
```

## Session Management

### Session Fixation Prevention
```typescript
app.post('/login', async (req, res) => {
  const user = await authenticate(req.body);

  // Regenerate session ID on login
  req.session.regenerate((err) => {
    req.session.userId = user.id;
    req.session.role = user.role;
    req.session.createdAt = Date.now();
    res.json({ success: true });
  });
});
```

### Session Hijacking Detection
```typescript
app.use((req, res, next) => {
  if (req.session.userId) {
    // Detect unusual access patterns
    if (req.session.lastIp && req.session.lastIp !== req.ip) {
      logger.warn('Session IP changed', {
        userId: req.session.userId,
        oldIp: req.session.lastIp,
        newIp: req.ip,
        userAgent: req.headers['user-agent'],
      });
      // Force re-authentication on sensitive actions
      req.session.requiresReauth = true;
    }
    req.session.lastIp = req.ip;
    req.session.lastAccess = Date.now();
  }
  next();
});
```

## Passwordless Authentication

### Magic Link
```typescript
async function sendMagicLink(email: string): Promise<void> {
  const token = crypto.randomBytes(32).toString('hex');
  await redis.set(`magic:${token}`, email, 'EX', 900); // 15 min expiry

  await emailService.send({
    to: email,
    subject: 'Sign in to Example App',
    body: `Click to sign in: https://app.example.com/auth/magic?token=${token}`,
  });
}
```

### WebAuthn (Passkeys)
- Uses public key cryptography — no shared secrets
- Biometric or PIN verification on device
- Resistant to phishing (bound to origin)
- Growing browser and platform support
