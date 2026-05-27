# Fastify Testing Reference

## Test Setup with Vitest

```typescript
import { test, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { buildApp } from '../src/app';

let app: ReturnType<typeof buildApp>;

beforeAll(async () => {
  app = buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});
```

## Build Application for Testing

```typescript
// src/app.ts
import Fastify, { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: false,
  }).withTypeProvider<ZodTypeProvider>();

  app.get('/health', async () => ({ status: 'ok' }));

  app.register(orderRoutes, { prefix: '/api/orders' });

  return app;
}
```

## Using fastify.inject

Fastify provides HTTP injection without starting a server.

```typescript
test('GET /health returns ok', async () => {
  const response = await app.inject({
    method: 'GET',
    url: '/health',
  });

  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual({ status: 'ok' });
});

test('POST /api/orders creates order', async () => {
  const response = await app.inject({
    method: 'POST',
    url: '/api/orders',
    payload: {
      customerId: '550e8400-e29b-41d4-a716-446655440000',
      items: [{ sku: 'SKU-001', quantity: 2, price: 29.99 }],
    },
  });

  expect(response.statusCode).toBe(201);
  expect(response.json()).toHaveProperty('id');
});
```

## Schema Validation Testing

```typescript
test('POST /api/orders validates required fields', async () => {
  const response = await app.inject({
    method: 'POST',
    url: '/api/orders',
    payload: { customerId: 'invalid-uuid' },
  });

  expect(response.statusCode).toBe(400);
  expect(response.json()).toHaveProperty('code', 'VALIDATION_ERROR');
});

test('POST /api/orders rejects negative quantity', async () => {
  const response = await app.inject({
    method: 'POST',
    url: '/api/orders',
    payload: {
      customerId: '550e8400-e29b-41d4-a716-446655440000',
      items: [{ sku: 'SKU-001', quantity: -1, price: 29.99 }],
    },
  });

  expect(response.statusCode).toBe(400);
});
```

## Authentication Testing

```typescript
import jwt from '@fastify/jwt';

test('GET /api/protected requires auth', async () => {
  const response = await app.inject({
    method: 'GET',
    url: '/api/protected/orders',
  });

  expect(response.statusCode).toBe(401);
});

test('GET /api/protected with valid token', async () => {
  const token = app.jwt.sign({ sub: 'user-1', roles: ['user'] });

  const response = await app.inject({
    method: 'GET',
    url: '/api/protected/orders',
    headers: { authorization: `Bearer ${token}` },
  });

  expect(response.statusCode).toBe(200);
});
```

## Hook Testing

```typescript
test('onRequest hook adds request ID', async () => {
  const response = await app.inject({
    method: 'GET',
    url: '/health',
  });

  expect(response.headers['x-request-id']).toBeDefined();
});

test('rate limit returns 429 after limit', async () => {
  const requests = Array(101).fill(null).map(() =>
    app.inject({ method: 'GET', url: '/health' })
  );

  const responses = await Promise.all(requests);
  const limited = responses.find(r => r.statusCode === 429);
  expect(limited).toBeDefined();
});
```

## Plugin Testing

```typescript
test('admin plugin scoped correctly', async () => {
  const response = await app.inject({
    method: 'GET',
    url: '/api/admin/users',
    headers: { authorization: `Bearer ${adminToken}` },
  });

  expect(response.statusCode).toBe(200);
  expect(Array.isArray(response.json())).toBe(true);
});
```

## Error Handler Testing

```typescript
test('404 handler returns structured error', async () => {
  const response = await app.inject({
    method: 'GET',
    url: '/api/nonexistent',
  });

  expect(response.statusCode).toBe(404);
  expect(response.json()).toHaveProperty('code', 'NOT_FOUND');
});

test('error handler catches thrown errors', async () => {
  const response = await app.inject({
    method: 'GET',
    url: '/api/error-test',
  });

  expect(response.statusCode).toBe(500);
  expect(response.json()).toHaveProperty('code', 'INTERNAL_ERROR');
});
```

## Snapshot Testing

```typescript
test('response matches snapshot', async () => {
  const response = await app.inject({
    method: 'GET',
    url: '/health',
  });

  expect(response.json()).toMatchSnapshot();
});
```

## Key Points

- `fastify.inject` tests HTTP without starting a server
- Build application factory for isolated test instances
- Test schema validation with invalid and edge case payloads
- Generate JWT tokens for authenticated route tests
- Hook behavior verified through response headers and status codes
- Plugin encapsulation tested via scoped route responses
- Error handler tests cover 404, validation, and internal errors
- Snapshot testing catches unexpected response changes
- Each test should use a fresh app instance for isolation
- Type provider integration validates Zod schema at runtime
