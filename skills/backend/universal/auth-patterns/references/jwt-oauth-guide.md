# JWT & OAuth Guide

## JWT Structure
```
header.payload.signature
```

### Header
```json
{"alg": "RS256", "typ": "JWT", "kid": "key-id-1"}
```

### Payload (claims)
```json
{
  "sub": "user-123",
  "iat": 1744560000,
  "exp": 1744646400,
  "scope": "read:orders write:orders"
}
```

## Token Rotation

### Access Token
- Short-lived: 15 minutes
- Sent in Authorization header: `Bearer <token>`
- Stateless — no DB lookup on each request

### Refresh Token
- Long-lived: 7-30 days
- Sent in httpOnly cookie or request body
- Rotated on every use (old token invalidated, new token issued)
- Reuse detection: if a rotated refresh token is used again, invalidate ALL tokens for that user

```typescript
async function rotateRefreshToken(oldToken: string): Promise<Tokens> {
  const stored = await db.refreshToken.findUnique({ where: { token: oldToken } })
  if (!stored) throw new Error('invalid_token')
  if (stored.usedAt) {
    // Reuse detected — invalidate all tokens for this user
    await db.refreshToken.updateMany({ where: { userId: stored.userId }, data: { invalidatedAt: new Date() } })
    throw new Error('token_reuse_detected')
  }
  const newToken = crypto.randomUUID()
  await db.refreshToken.update({ where: { id: stored.id }, data: { usedAt: new Date() } })
  await db.refreshToken.create({ data: { token: newToken, userId: stored.userId, expiresAt: addDays(30) } })
  return { accessToken: signAccessToken(stored.userId), refreshToken: newToken }
}
```

## OAuth2 Flows

| Flow | Use Case |
|------|----------|
| Authorization Code | Server-side web apps |
| PKCE | Mobile / SPA (no client_secret) |
| Client Credentials | Machine-to-machine |
| Device Code | CLI / TV / input-constrained devices |
