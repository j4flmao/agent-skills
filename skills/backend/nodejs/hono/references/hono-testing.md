# Hono Testing Reference

## Test Setup with Vitest

```typescript
import { test, describe, expect } from 'vitest';
import { Hono } from 'hono';
import { app } from '../src/app';

describe('Hono API', () => {
  let hono: Hono;

  beforeEach(() => {
    hono = app;
  });
});
```

## Using Hono's Test Helper

Hono provides a built-in `test` helper for HTTP testing without a server.

```typescript
import { test as honoTest } from 'hono/testing';

const app = new Hono()
  .get('/health', (c) => c.json({ status: 'ok' }))
  .post('/api/orders', async (c) => {
    const body = await c.req.json();
    return c.json({ id: '123', ...body }, 201);
  });

test('GET /health returns ok', async () => {
  const res = await honoTest(app).request('/health');
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ status: 'ok' });
});

test('POST /api/orders creates order', async () => {
  const res = await honoTest(app).request('/api/orders', {
    method: 'POST',
    body: JSON.stringify({
      customerId: 'cust-1',
      items: [{ sku: 'SKU-001', quantity: 2 }],
    }),
    headers: { 'Content-Type': 'application/json' },
  });

  expect(res.status).toBe(201);
  const data = await res.json();
  expect(data).toHaveProperty('id');
});
```

## Validation Testing

```typescript
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

const orderSchema = z.object({
  customerId: z.string().uuid(),
  items: z.array(z.object({
    sku: z.string().min(1),
    quantity: z.number().int().positive(),
  })).min(1),
});

const app = new Hono()
  .post('/api/orders', zValidator('json', orderSchema), (c) => {
    return c.json({ success: true }, 201);
  });

test('rejects invalid body', async () => {
  const res = await honoTest(app).request('/api/orders', {
    method: 'POST',
    body: JSON.stringify({}),
    headers: { 'Content-Type': 'application/json' },
  });

  expect(res.status).toBe(400);
});

test('rejects empty items', async () => {
  const res = await honoTest(app).request('/api/orders', {
    method: 'POST',
    body: JSON.stringify({
      customerId: '550e8400-e29b-41d4-a716-446655440000',
      items: [],
    }),
    headers: { 'Content-Type': 'application/json' },
  });

  expect(res.status).toBe(400);
});
```

## Auth Testing

```typescript
import { jwt } from 'hono/jwt';

const app = new Hono()
  .use('/api/protected/*', jwt({ secret: 'test-secret' }))
  .get('/api/protected/orders', (c) => {
    const payload = c.get('jwtPayload');
    return c.json({ userId: payload.sub });
  });

test('rejects without token', async () => {
  const res = await honoTest(app).request('/api/protected/orders');
  expect(res.status).toBe(401);
});

test('accepts valid token', async () => {
  const token = await sign({ sub: 'user-1' }, 'test-secret');
  const res = await honoTest(app).request('/api/protected/orders', {
    headers: { Authorization: `Bearer ${token}` },
  });

  expect(res.status).toBe(200);
  const data = await res.json();
  expect(data.userId).toBe('user-1');
});
```

## Middleware Testing

```typescript
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

const app = new Hono()
  .use('*', cors({ origin: 'https://app.example.com' }))
  .use('*', logger())
  .get('/test', (c) => c.text('ok'));

test('cors headers present', async () => {
  const res = await honoTest(app).request('/test', {
    headers: { Origin: 'https://app.example.com' },
  });

  expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://app.example.com');
});

test('cors blocks disallowed origin', async () => {
  const res = await honoTest(app).request('/test', {
    headers: { Origin: 'https://evil.com' },
  });

  expect(res.headers.get('Access-Control-Allow-Origin')).toBeFalsy();
});
```

## Error Handling

```typescript
const app = new Hono()
  .onError((err, c) => {
    console.error(err.message);
    return c.json({ error: 'Internal error' }, 500);
  })
  .notFound((c) => c.json({ error: 'Not found' }, 404))
  .get('/error', () => { throw new Error('Boom'); });

test('404 returns structured error', async () => {
  const res = await honoTest(app).request('/nonexistent');
  expect(res.status).toBe(404);
  expect(await res.json()).toEqual({ error: 'Not found' });
});

test('500 returns structured error', async () => {
  const res = await honoTest(app).request('/error');
  expect(res.status).toBe(500);
});
```

## Multi-Runtime Testing

```typescript
// Test the same app across runtimes
test('works on Cloudflare Workers', async () => {
  const app = new Hono()
    .get('/env', (c) => c.json({ runtime: 'cloudflare' }));

  const res = await honoTest(app).request('/env');
  expect(await res.json()).toEqual({ runtime: 'cloudflare' });
});
```

## Key Points

- Hono's `hono/testing` helper tests without a running server
- Zod validation is tested by sending invalid payloads
- JWT middleware tested with signed tokens and missing auth headers
- CORS headers verified for allowed and disallowed origins
- Error handler tested with routes that throw
- 404 responses tested with unmatched routes
- Each test uses a fresh app instance for isolation
- Request body, headers, query params all testable
- Response status, headers, and body can all be asserted
- Multi-runtime apps test identically across environments
