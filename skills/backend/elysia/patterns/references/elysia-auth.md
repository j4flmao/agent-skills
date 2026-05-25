# Elysia Auth Patterns

## JWT Authentication

```typescript
import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';

// Setup JWT plugin
const app = new Elysia()
  .use(jwt({
    name: 'jwt',
    secret: process.env.JWT_SECRET!,
    exp: '7d',
  }))
  .post('/auth/login', async ({ body, jwt }) => {
    const user = await authenticate(body.email, body.password);
    if (!user) throw new Error('Invalid credentials');

    const token = await jwt.sign({
      sub: user.id,
      role: user.role,
    });

    return { token, user: { id: user.id, email: user.email } };
  }, {
    body: t.Object({
      email: t.String({ format: 'email' }),
      password: t.String({ minLength: 8 }),
    }),
  });
```

## Auth Guard with Derive

```typescript
// Auth guard plugin — scoped to protect routes
export const authGuard = new Elysia({ name: 'authGuard' })
  .derive({ as: 'scoped' }, async ({ jwt, headers }) => {
    const auth = headers['authorization'];
    if (!auth?.startsWith('Bearer ')) {
      throw new Error('Missing or invalid authorization header');
    }

    const token = auth.slice(7);
    const payload = await jwt.verify(token);
    if (!payload) throw new Error('Invalid or expired token');

    return {
      user: {
        id: payload.sub as string,
        role: payload.role as string,
      },
    };
  });

// Protected routes
const protectedRoutes = new Elysia()
  .use(authGuard)
  .get('/orders', ({ user }) => getOrders(user.id), {
    detail: { tags: ['Orders'] },
  })
  .post('/orders', ({ body, user }) => createOrder(body, user.id), {
    body: createOrderSchema,
  });

app.use(protectedRoutes);
```

## Role-based Access Control

```typescript
// Role guard using derive
export const requireRole = (roles: string[]) =>
  new Elysia({ name: `roleGuard:${roles.join(',')}` })
    .derive({ as: 'scoped' }, async ({ user }) => {
      if (!user) throw new Error('Authentication required');
      if (!roles.includes(user.role)) {
        throw new Error(`Requires one of roles: ${roles.join(', ')}`);
      }
      return {};
    });

// Usage
const adminRoutes = new Elysia()
  .use(authGuard)
  .use(requireRole(['admin']))
  .get('/admin/users', () => getAllUsers());

app.use(adminRoutes);
```

## API Key Auth

```typescript
export const apiKeyGuard = new Elysia({ name: 'apiKeyGuard' })
  .derive({ as: 'scoped' }, async ({ headers }) => {
    const apiKey = headers['x-api-key'];
    if (!apiKey) throw new Error('API key required');

    const client = await validateApiKey(apiKey);
    if (!client) throw new Error('Invalid API key');

    return { client: { id: client.id, name: client.name } };
  });

app.group('/api/v1', (app) =>
  app.use(apiKeyGuard)
    .get('/products', () => listProducts())
    .post('/products', ({ body }) => createProduct(body))
);
```

## Session-based Auth

```typescript
import { cookie } from '@elysiajs/cookie';

const sessionAuth = new Elysia()
  .use(cookie())
  .derive({ as: 'scoped' }, async ({ cookie: { session }, jwt }) => {
    if (!session) throw new Error('Session required');

    const payload = await jwt.verify(session);
    if (!payload) throw new Error('Invalid session');

    return {
      user: { id: payload.sub as string, role: payload.role as string },
    };
  });

app.post('/auth/login', async ({ jwt, cookie: { session } }) => {
  const token = await jwt.sign({ sub: user.id, role: user.role });
  session?.set({
    value: token,
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 604800, // 7 days
  });
});
```

## OAuth2 Integration

```typescript
import { oauth2 } from '@elysiajs/oauth2';

const app = new Elysia()
  .use(oauth2({
    Google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect: 'http://localhost:3000/auth/google/callback',
      scope: ['openid', 'email', 'profile'],
    },
  }))
  .get('/auth/google', ({ oauth2 }) => oauth2.authorize('Google'))
  .get('/auth/google/callback', async ({ oauth2, jwt }) => {
    const { tokens } = await oauth2.retrieveAuthorization('Google', { code, state });
    const userInfo = await fetchUserInfo(tokens.accessToken);
    const token = await jwt.sign({ sub: userInfo.id, email: userInfo.email });
    return { token };
  });
```

## Auth Decision Matrix

| Pattern | Use Case | Complexity |
|---------|----------|------------|
| JWT Bearer | SPA, mobile apps | Low |
| Session cookie | Server-rendered apps | Medium |
| API Key | Service-to-service | Low |
| OAuth2 | Third-party auth | High |
| Basic Auth | Dev/testing only | Minimal |
