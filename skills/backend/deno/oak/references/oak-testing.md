# Oak Testing

## Test Setup Patterns

```typescript
// tests/helpers.ts
import { Application } from 'oak';
import { router } from '../src/router/index.ts';
import { errorMiddleware } from '../src/middleware/error.ts';

export function createTestApp(): Application {
  const app = new Application();
  app.use(errorMiddleware);
  app.use(router.routes());
  app.use(router.allowedMethods());
  return app;
}
```

## Integration Tests with HTTP

```typescript
// tests/orders_test.ts
import { createTestApp } from './helpers.ts';
import { assertEquals, assertExists } from 'std/testing/asserts.ts';

Deno.test('POST /api/orders creates order', async () => {
  const app = createTestApp();
  const listener = app.listen({ port: 0 });
  const port = (await listener).port;

  const res = await fetch(`http://localhost:${port}/api/orders`, {
    method: 'POST',
    body: JSON.stringify({
      customerId: 'cust-123',
      items: [{ sku: 'PROD-1', quantity: 2, price: 29.99 }],
    }),
    headers: { 'Content-Type': 'application/json' },
  });

  assertEquals(res.status, 201);
  const body = await res.json();
  assertExists(body.id);
  assertEquals(body.customerId, 'cust-123');

  listener.close();
});
```

## SuperDeno Testing

```typescript
// tests/superdeno_test.ts
import { superdeno } from 'https://deno.land/x/superdeno@v4.8.0/mod.ts';
import { createTestApp } from './helpers.ts';

Deno.test('superdeno: GET /api/orders', async () => {
  const app = createTestApp();
  await superdeno(app.handle.bind(app))
    .get('/api/orders')
    .expect('Content-Type', /json/)
    .expect(200)
    .expect((res) => {
      assertEquals(Array.isArray(res.body.data), true);
    });
});

Deno.test('superdeno: POST validation', async () => {
  const app = createTestApp();
  await superdeno(app.handle.bind(app))
    .post('/api/orders')
    .send({})
    .expect(400)
    .expect((res) => {
      assertEquals(res.body.error.code, 'VALIDATION');
    });
});
```

## Mocking Dependencies

```typescript
// tests/mocks.ts
export class MockOrderRepository {
  private orders: Map<string, unknown> = new Map();

  async findAll() {
    return Array.from(this.orders.values());
  }

  async findById(id: string) {
    return this.orders.get(id) || null;
  }

  async save(order: unknown) {
    const id = crypto.randomUUID();
    this.orders.set(id, { ...order, id });
    return this.orders.get(id);
  }

  reset() {
    this.orders.clear();
  }
}
```

## Testing Auth Middleware

```typescript
// tests/auth_test.ts
Deno.test('auth middleware rejects missing token', async () => {
  const app = createTestApp();
  const listener = app.listen({ port: 0 });
  const port = (await listener).port;

  const res = await fetch(`http://localhost:${port}/api/orders`, {
    headers: { 'Content-Type': 'application/json' },
  });

  assertEquals(res.status, 401);
  listener.close();
});

Deno.test('auth middleware rejects invalid token', async () => {
  const app = createTestApp();
  const listener = app.listen({ port: 0 });
  const port = (await listener).port;

  const res = await fetch(`http://localhost:${port}/api/orders`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer invalid-token',
    },
  });

  assertEquals(res.status, 401);
  listener.close();
});
```

## Testing Error Handling

```typescript
// tests/error_test.ts
Deno.test('error middleware catches thrown errors', async () => {
  const app = createTestApp();
  const listener = app.listen({ port: 0 });
  const port = (await listener).port;

  const res = await fetch(`http://localhost:${port}/api/orders/invalid-id`);
  assertEquals(res.status, 404);

  listener.close();
});

Deno.test('error middleware returns consistent format', async () => {
  const app = createTestApp();
  const listener = app.listen({ port: 0 });
  const port = (await listener).port;

  const res = await fetch(`http://localhost:${port}/not-found-path`);
  const body = await res.json();

  assertEquals(res.status, 404);
  assertEquals(body.error.code, 'NOT_FOUND');
  assertEquals(body.success, false);

  listener.close();
});
```

## Test Fixtures

```typescript
// tests/fixtures.ts
export const validOrderPayload = {
  customerId: 'cust-123',
  items: [
    { sku: 'PROD-1', quantity: 2, price: 29.99 },
    { sku: 'PROD-2', quantity: 1, price: 49.99 },
  ],
};

export const invalidOrderPayload = {
  customerId: '',
  items: [],
};

export const expectedOrderResponse = {
  id: expect(String),
  customerId: 'cust-123',
  status: 'PENDING',
  items: expect(Array),
  totalAmount: expect(Number),
};
```

## Test Configuration

```typescript
// tests/config.ts
import { load } from 'std/dotenv/mod.ts';

// Load test env before any imports
await load({ envPath: '.env.test', export: true });

export const testConfig = {
  port: parseInt(Deno.env.get('TEST_PORT') || '0'),
  database: Deno.env.get('TEST_DATABASE_URL') || ':memory:',
};
```

## Run Tests

```bash
deno test --allow-net --allow-read --allow-env
deno test --coverage  # Generate coverage
deno test --watch     # Watch mode
deno test --filter "auth"  # Run auth tests only
```
