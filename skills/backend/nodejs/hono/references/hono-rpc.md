# Hono RPC Reference

## Client-Side Type Safety

Hono RPC provides end-to-end type safety between server and client.

```typescript
// src/server.ts
import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

const app = new Hono();

const orderSchema = z.object({
  customerId: z.string().uuid(),
  items: z.array(z.object({
    sku: z.string(),
    quantity: z.number().int().positive(),
  })),
});

const routes = app
  .get('/api/orders/:id', (c) => {
    const id = c.req.param('id');
    return c.json({ id, status: 'pending' });
  })
  .post('/api/orders', zValidator('json', orderSchema), (c) => {
    const data = c.req.valid('json');
    return c.json({ id: crypto.randomUUID(), ...data }, 201);
  });

export type AppType = typeof routes;
export default app;
```

### Client Integration

```typescript
// src/client.ts
import { hc } from 'hono/client';
import type { AppType } from './server';

const client = hc<AppType>('http://localhost:3000');

// Fully typed responses
const res = await client.api.orders[':id'].$get({
  param: { id: '550e8400-e29b-41d4-a716-446655440000' },
});

const data = await res.json();
// data is typed as { id: string; status: string }

// Typed request body
const createRes = await client.api.orders.$post({
  json: {
    customerId: '550e8400-e29b-41d4-a716-446655440000',
    items: [{ sku: 'SKU-001', quantity: 2 }],
  },
});
```

## RPC with Error Handling

```typescript
const routes = app
  .get('/api/orders', async (c) => {
    const orders = await orderService.findAll();
    return c.json(orders);
  })
  .post('/api/orders', zValidator('json', orderSchema), async (c) => {
    try {
      const data = c.req.valid('json');
      const order = await orderService.create(data);
      return c.json(order, 201);
    } catch (err) {
      return c.json({ error: 'Creation failed' }, 500);
    }
  });
```

## RPC with Middleware

```typescript
import { jwt } from 'hono/jwt';

const routes = app
  .use('/api/protected/*', jwt({ secret: process.env.JWT_SECRET! }))
  .get('/api/protected/orders', async (c) => {
    const payload = c.get('jwtPayload');
    return c.json({ userId: payload.sub });
  });
```

## Custom RPC Responses

```typescript
// Define response types
const routes = app
  .get('/api/users/:id', async (c) => {
    const user = await userService.findById(c.req.param('id'));
    if (!user) {
      return c.json({ error: 'User not found', code: 'NOT_FOUND' }, 404);
    }
    return c.json({ id: user.id, name: user.name, email: user.email });
  });
```

## Validation via RPC

```typescript
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().max(100).default(20),
  status: z.enum(['pending', 'active', 'completed']).optional(),
});

const routes = app
  .get('/api/orders', zValidator('query', querySchema), async (c) => {
    const { page, limit, status } = c.req.valid('query');
    const orders = await orderService.list({ page, limit, status });
    return c.json(orders);
  });

// Client usage with query params
const res = await client.api.orders.$get({
  query: { page: '1', limit: '20' },
});
```

## Key Points

- Hono RPC generates fully typed client from server routes
- `hc()` creates a client with full type inference
- Zod validation schemas are shared between server and client
- Error responses must be explicitly typed for client inference
- Middleware-protected routes are reflected in client types
- Query params, path params, and bodies are all type-safe
- Custom response types require explicit return type annotations
- RPC eliminates manual API client maintenance
- Type mismatches are caught at compile time
- Works across Hono runtimes (Node, Deno, Cloudflare Workers)
