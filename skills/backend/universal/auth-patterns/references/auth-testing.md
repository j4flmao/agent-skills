# Authentication Testing

## Overview
Test authentication flows systematically: login, token validation, refresh, logout, password reset, and edge cases like expired tokens and brute force protection.

## Login Flow Tests

```typescript
describe('Login Flow', () => {
  it('logs in with valid credentials', async () => {
    const res = await request(app)
      .post('/v2/auth/login')
      .send({ email: 'user@example.com', password: 'ValidPass123!' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body).toHaveProperty('expiresIn');
  });

  it('rejects invalid email format', async () => {
    const res = await request(app)
      .post('/v2/auth/login')
      .send({ email: 'not-an-email', password: 'ValidPass123!' });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects wrong password', async () => {
    const res = await request(app)
      .post('/v2/auth/login')
      .send({ email: 'user@example.com', password: 'WrongPassword!' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('rejects requests to non-existent user', async () => {
    const res = await request(app)
      .post('/v2/auth/login')
      .send({ email: 'nonexistent@example.com', password: 'SomePass123!' });

    expect(res.status).toBe(401);
    // Should not reveal whether user exists
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });
});
```

## Token Validation Tests

```typescript
describe('Token Validation', () => {
  it('allows access with valid token', async () => {
    const token = await generateTestToken({ userId: 'user_123', roles: ['customer'] });

    const res = await request(app)
      .get('/v2/orders')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it('rejects expired token', async () => {
    const expiredToken = await generateTestToken(
      { userId: 'user_123', roles: ['customer'] },
      { expiresIn: '0s' }
    );

    // Wait for expiry
    await new Promise(r => setTimeout(r, 100));

    const res = await request(app)
      .get('/v2/orders')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('rejects malformed token', async () => {
    const res = await request(app)
      .get('/v2/orders')
      .set('Authorization', 'Bearer not-a-valid-token');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('rejects token with invalid signature', async () => {
    const tamperedToken = await generateTestToken(
      { userId: 'user_123', roles: ['customer'] },
      { secret: 'different-secret' }
    );

    const res = await request(app)
      .get('/v2/orders')
      .set('Authorization', `Bearer ${tamperedToken}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('rejects missing Authorization header', async () => {
    const res = await request(app).get('/v2/orders');
    expect(res.status).toBe(401);
  });
});
```

## Refresh Token Tests

```typescript
describe('Refresh Token Flow', () => {
  it('issues new access token with valid refresh token', async () => {
    const loginRes = await request(app)
      .post('/v2/auth/login')
      .send({ email: 'user@example.com', password: 'ValidPass123!' });

    const refreshRes = await request(app)
      .post('/v2/auth/refresh')
      .send({ refreshToken: loginRes.body.refreshToken });

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.accessToken).toBeDefined();
    expect(refreshRes.body.refreshToken).toBeDefined();
    // Old refresh token should be rotated
    expect(refreshRes.body.refreshToken).not.toBe(loginRes.body.refreshToken);
  });

  it('rejects already-used refresh token (rotation)', async () => {
    const loginRes = await request(app)
      .post('/v2/auth/login')
      .send({ email: 'user@example.com', password: 'ValidPass123!' });

    const { refreshToken } = loginRes.body;

    // First refresh — succeeds
    await request(app)
      .post('/v2/auth/refresh')
      .send({ refreshToken });

    // Second refresh with same token — should fail (already rotated)
    const res = await request(app)
      .post('/v2/auth/refresh')
      .send({ refreshToken });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_REUSED');
  });

  it('rejects expired refresh token', async () => {
    const expiredToken = await generateExpiredRefreshToken('user_123');

    const res = await request(app)
      .post('/v2/auth/refresh')
      .send({ refreshToken: expiredToken });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });
});
```

## Brute Force Protection

```typescript
describe('Brute Force Protection', () => {
  it('locks account after 5 failed attempts', async () => {
    const email = 'user@example.com';

    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/v2/auth/login')
        .send({ email, password: 'WrongPassword!' });
    }

    // Even with correct password, should be locked
    const res = await request(app)
      .post('/v2/auth/login')
      .send({ email, password: 'ValidPass123!' });

    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('ACCOUNT_LOCKED');
  });

  it('rate limits by IP for login endpoint', async () => {
    // Send 6 rapid requests
    const promises = Array(6).fill(null).map(() =>
      request(app)
        .post('/v2/auth/login')
        .send({ email: 'user@example.com', password: 'test' })
    );

    const results = await Promise.all(promises);
    const rateLimited = results.filter(r => r.status === 429);
    expect(rateLimited.length).toBeGreaterThan(0);
  });
});
```

## Test Helper Utilities

```typescript
// Test helpers
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

async function generateTestToken(
  payload: Record<string, unknown>,
  options?: { expiresIn?: string; secret?: string }
): Promise<string> {
  const secret = options?.secret || process.env.JWT_SECRET || 'test-secret';
  const expiresIn = options?.expiresIn || '15m';

  return jwt.sign(payload, secret, {
    issuer: 'test',
    expiresIn,
    jwtid: crypto.randomUUID(),
  });
}

async function generateExpiredRefreshToken(userId: string): Promise<string> {
  return generateTestToken(
    { userId, type: 'refresh' },
    { expiresIn: '-1h' }
  );
}

// Setup: create test user before each test
beforeEach(async () => {
  const hashedPassword = await bcrypt.hash('ValidPass123!', 10);
  await TestUser.create({
    email: 'user@example.com',
    passwordHash: hashedPassword,
    roles: ['customer'],
    emailVerified: true,
  });
});
```

## Key Points
- Test all auth flows: login, token validation, refresh, logout, password reset
- Verify expired, malformed, and tampered tokens are rejected
- Test refresh token rotation (reuse should invalidate all tokens)
- Verify brute force protection locks accounts after threshold
- Use test helpers for generating tokens and setting up test users
