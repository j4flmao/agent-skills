# Elysia Type Safety Patterns

## Overview

ElysiaJS provides one of the most advanced type systems among TypeScript web frameworks. Through tight integration with Elysia t (validation schemas), Eden Treaty (client generation), and TypeScript inference, Elysia enables end-to-end type safety from the database layer to the client. This reference covers type inference patterns, Eden Treaty client usage, complex schema composition, and advanced type-level programming techniques.

## Core Type System Architecture

### Type Inference Pipeline

Elysia's type system operates in layers:

```
Schema Definition (t.Object)
  → Runtime Validator (checks at request time)
  → TypeScript Type (inferred at compile time)
  → OpenAPI Schema (generated for documentation)
  → Eden Treaty Client (mirrored on client side)
```

Each layer derives from the schema definition, ensuring consistency across the entire stack.

### How Elysia t Works

Elysia t is a type-safe schema builder that produces both runtime validators and TypeScript types. Each schema definition creates a validator object with a `.static` property representing the inferred TypeScript type.

```typescript
import { t } from 'elysia';

const UserSchema = t.Object({
  id: t.String({ format: 'uuid' }),
  name: t.String({ minLength: 1, maxLength: 100 }),
  email: t.String({ format: 'email' }),
  age: t.Optional(t.Number({ minimum: 18, maximum: 120 })),
  role: t.Enum({ admin: 'admin', user: 'user', viewer: 'viewer' })
});

// Inferred type: { id: string; name: string; email: string; age?: number; role: 'admin' | 'user' | 'viewer' }
type User = typeof UserSchema.static;
```

### Schema-to-Type Mapping

| Elysia t Schema | TypeScript Type |
|-----------------|-----------------|
| `t.String()` | `string` |
| `t.Number()` | `number` |
| `t.Integer()` | `number` |
| `t.Boolean()` | `boolean` |
| `t.Null()` | `null` |
| `t.Undefined()` | `undefined` |
| `t.Any()` | `any` |
| `t.Unknown()` | `unknown` |
| `t.Object({ ... })` | `{ ... }` |
| `t.Array(T)` | `T[]` |
| `t.Optional(T)` | `T \| undefined` |
| `t.Nullable(T)` | `T \| null` |
| `t.Union([A, B])` | `A \| B` |
| `t.Intersect([A, B])` | `A & B` |
| `t.Pick(T, [...])` | `Pick<typeof T.static, ...>` |
| `t.Omit(T, [...])` | `Omit<typeof T.static, ...>` |
| `t.Partial(T)` | `Partial<typeof T.static>` |
| `t.Enum({ ... })` | Union of literal values |
| `t.Literal('x')` | `'x'` |
| `t.Record(K, V)` | `Record<K, V>` |
| `t.Tuple([A, B])` | `[A, B]` |

## Route Type Inference

### Request Handler Context

Each route handler receives a fully typed context object. The types of `body`, `params`, `query`, `headers`, and `store` are all inferred from route configuration.

```typescript
import { Elysia, t } from 'elysia';

const app = new Elysia()
  .state('db', createDatabase())
  .derive(({ headers }) => ({
    userId: headers['x-user-id'] as string
  }))
  .post('/orders', ({ body, userId, store: { db } }) => {
    // body: { customerId: string; items: { productId: string; quantity: number }[] }
    // userId: string
    // db: Database
    return db.orders.create({ ...body, createdBy: userId });
  }, {
    body: t.Object({
      customerId: t.String({ format: 'uuid' }),
      items: t.Array(t.Object({
        productId: t.String({ format: 'uuid' }),
        quantity: t.Integer({ minimum: 1 })
      }))
    }),
    detail: { tags: ['Orders'] }
  });
```

### Type Narrowing with Schema Validation

Elysia t schemas validate at runtime and narrow types at compile time. After validation, values are guaranteed to match the schema.

```typescript
const paginationSchema = t.Object({
  page: t.Optional(t.Integer({ minimum: 1, default: 1 })),
  limit: t.Optional(t.Integer({ minimum: 1, maximum: 100, default: 20 })),
  sort: t.Optional(t.String({ pattern: '^(created_at|updated_at|name)$' })),
  order: t.Optional(t.Enum({ asc: 'asc', desc: 'desc' }))
});

app.get('/users', ({ query: { page, limit, sort, order } }) => {
  // page: number (validated, minimum 1)
  // limit: number (validated, 1-100)
  // sort: string | undefined (validated pattern)
  // order: 'asc' | 'desc' | undefined
  return db.users.findMany({ skip: (page - 1) * limit, take: limit, orderBy: { [sort || 'created_at']: order || 'desc' } });
}, {
  query: paginationSchema
});
```

### Error Type Inference

Error responses can be typed using discriminated unions, enabling type-safe error handling on the client.

```typescript
import { Elysia, t, error } from 'elysia';

const app = new Elysia()
  .post('/orders', ({ body }) => {
    try {
      const order = await orderService.create(body);
      return { success: true as const, data: order };
    } catch (err) {
      if (err instanceof InsufficientFundsError) {
        return error(400, {
          success: false as const,
          code: 'INSUFFICIENT_FUNDS',
          message: 'Not enough credits',
          balance: err.balance
        });
      }
      if (err instanceof ProductNotFoundError) {
        return error(404, {
          success: false as const,
          code: 'PRODUCT_NOT_FOUND',
          productId: err.productId
        });
      }
      return error(500, { success: false as const, code: 'INTERNAL_ERROR' });
    }
  }, {
    body: t.Object({ ... }),
    response: t.Union([
      t.Object({ success: t.Literal(true), data: t.Any() }),
      t.Object({ success: t.Literal(false), code: t.String(), message: t.Optional(t.String()) })
    ])
  });
```

## Complex Schema Composition

### Schema Inheritance and Extension

Build complex schemas by composing simpler ones.

```typescript
const TimestampFields = t.Object({
  created_at: t.String({ format: 'date-time' }),
  updated_at: t.String({ format: 'date-time' }),
  deleted_at: t.Optional(t.String({ format: 'date-time' }))
});

const AddressFields = t.Object({
  street: t.String(),
  city: t.String(),
  state: t.String({ minLength: 2, maxLength: 2 }),
  zipCode: t.String({ pattern: '^[0-9]{5}(-[0-9]{4})?$' }),
  country: t.String({ minLength: 2, maxLength: 2 })
});

const CustomerSchema = t.Intersect([
  t.Object({
    id: t.String({ format: 'uuid' }),
    name: t.String(),
    email: t.String({ format: 'email' }),
    phone: t.Optional(t.String({ pattern: '^\\+1[0-9]{10}$' }))
  }),
  AddressFields,
  TimestampFields
]);

type Customer = typeof CustomerSchema.static;
// Combines all fields into a single flat type
```

### Conditional and Discriminated Unions

Use discriminated unions for polymorphic data structures.

```typescript
const PaymentCardSchema = t.Object({
  type: t.Literal('card'),
  cardNumber: t.String({ pattern: '^[0-9]{16}$' }),
  expiryMonth: t.Integer({ minimum: 1, maximum: 12 }),
  expiryYear: t.Integer({ minimum: 2024 }),
  cvv: t.String({ pattern: '^[0-9]{3,4}$' })
});

const PaymentPayPalSchema = t.Object({
  type: t.Literal('paypal'),
  email: t.String({ format: 'email' }),
  paypalOrderId: t.String()
});

const PaymentCryptoSchema = t.Object({
  type: t.Literal('crypto'),
  walletAddress: t.String(),
  currency: t.Enum({ btc: 'BTC', eth: 'ETH', usdt: 'USDT' }),
  transactionHash: t.String()
});

const PaymentSchema = t.Union([PaymentCardSchema, PaymentPayPalSchema, PaymentCryptoSchema]);

type Payment = typeof PaymentSchema.static;
// type Payment = { type: 'card'; cardNumber: string; ... } | { type: 'paypal'; ... } | { type: 'crypto'; ... }

// TypeScript narrows correctly:
function processPayment(payment: Payment) {
  if (payment.type === 'card') {
    // payment.cardNumber is accessible
    // payment.email is not
  } else if (payment.type === 'paypal') {
    // payment.email is accessible
    // payment.cardNumber is not
  }
}
```

### Recursive Schemas

For tree-like data structures, use lazy schemas with `t.Lazy`.

```typescript
const CategorySchema: any = t.Object({
  id: t.String({ format: 'uuid' }),
  name: t.String(),
  parentId: t.Optional(t.String({ format: 'uuid' })),
  children: t.Optional(t.Array(t.Lazy(() => CategorySchema)))
});

// After definition, fix the type:
type Category = typeof CategorySchema.static;

const TreeNodeSchema: any = t.Object({
  value: t.Any(),
  left: t.Optional(t.Lazy(() => TreeNodeSchema)),
  right: t.Optional(t.Lazy(() => TreeNodeSchema))
});

// Circular reference schemas must use t.Lazy to avoid infinite type instantiation
```

### Schema Transformation and Mapping

Transform raw input to domain models within the schema definition.

```typescript
const CreateUserSchema = t.Object({
  name: t.String({ transform: (v) => v.trim() }),
  email: t.String({ format: 'email', transform: (v) => v.toLowerCase() }),
  password: t.String({ minLength: 8 }),
  birthDate: t.String({ format: 'date', transform: (v) => new Date(v).toISOString() })
});

// Schema with computed fields
const OrderResponseSchema = t.Object({
  id: t.String(),
  subtotal: t.Number(),
  tax: t.Number(),
  shipping: t.Number(),
  total: t.Number({ transform: (_, obj) => obj.subtotal + obj.tax + obj.shipping }),
  // transform receives (currentValue, wholeObject) and can compute derived fields
});
```

## Eden Treaty Client Types

### Basic Client Setup

Eden Treaty generates a fully typed client from the server's type definition.

```typescript
// server.ts
import { Elysia, t } from 'elysia';

export const app = new Elysia()
  .post('/orders', ({ body }) => createOrder(body), {
    body: t.Object({
      customerId: t.String({ format: 'uuid' }),
      items: t.Array(t.Object({ productId: t.String(), quantity: t.Integer({ minimum: 1 }) })),
      coupon: t.Optional(t.String())
    }),
    response: t.Object({
      id: t.String({ format: 'uuid' }),
      total: t.Number(),
      status: t.String()
    })
  })
  .get('/orders', ({ query }) => listOrders(query), {
    query: t.Object({
      page: t.Integer({ minimum: 1, default: 1 }),
      limit: t.Integer({ minimum: 1, maximum: 100, default: 20 }),
      status: t.Optional(t.String())
    })
  })
  .get('/orders/:id', ({ params: { id } }) => getOrder(id), {
    params: t.Object({ id: t.String({ format: 'uuid' }) })
  })
  .put('/orders/:id/cancel', ({ params: { id } }) => cancelOrder(id), {
    params: t.Object({ id: t.String({ format: 'uuid' }) })
  });

export type App = typeof app;

// client.ts
import { edenTreaty } from '@elysiajs/eden';
import type { App } from './server';

const client = edenTreaty<App>('http://localhost:3000');

// Fully typed request and response
const { data, error } = await client.orders.post({
  customerId: '550e8400-e29b-41d4-a716-446655440000',
  items: [{ productId: 'prod-1', quantity: 2 }]
});
// data: { id: string; total: number; status: string } | null
// error: { status: number; value: unknown } | null
```

### Nested Resource Access

Eden Treaty supports nested resource paths with full type inference.

```typescript
// Server routes
app.group('/customers', (group) =>
  group
    .get('/', () => listCustomers())
    .get('/:customerId', ({ params }) => getCustomer(params.customerId))
    .group('/:customerId/orders', (orders) =>
      orders
        .get('/', ({ params }) => listCustomerOrders(params.customerId))
        .get('/:orderId', ({ params }) => getCustomerOrder(params.customerId, params.orderId))
    )
);

// Client usage
const { data: customers } = await client.customers.get();
// customers: Customer[]

const { data: orders } = await client.customers({ customerId: '123' }).orders.get();
// orders: Order[]

const { data: order } = await client
  .customers({ customerId: '123' })
  .orders({ orderId: '456' })
  .get();
// order: Order
```

### Type-Safe Error Handling

Errors are typed based on the server's error responses.

```typescript
const result = await client.orders.post(body);

if (result.error) {
  // Type-narrow based on status code
  switch (result.error.status) {
    case 400:
      // Handle validation error
      break;
    case 401:
      // Handle authentication error
      break;
    case 404:
      // Handle not found
      break;
    case 409:
      // Handle conflict
      break;
    case 422:
      // Handle validation error with details
      const details = result.error.value;
      break;
  }
}

if (result.data) {
  // result.data is the typed success response
  console.log(result.data.id);
}
```

### Query Parameter Inference

Query parameters defined with schemas are automatically typed in the client.

```typescript
// Server
app.get('/products', ({ query }) => searchProducts(query), {
  query: t.Object({
    q: t.String({ minLength: 1 }),
    category: t.Optional(t.String()),
    minPrice: t.Optional(t.Number({ minimum: 0 })),
    maxPrice: t.Optional(t.Number({ minimum: 0 })),
    sort: t.Optional(t.Enum({ price_asc: 'price_asc', price_desc: 'price_desc', name: 'name' })),
    page: t.Optional(t.Integer({ minimum: 1, default: 1 })),
    limit: t.Optional(t.Integer({ minimum: 1, maximum: 50, default: 20 }))
  })
});

// Client
const { data } = await client.products.get({
  query: {
    q: 'wireless headphones',
    category: 'electronics',
    minPrice: 50,
    maxPrice: 500,
    sort: 'price_asc'
  }
});
// All query parameters are type-checked
```

## Advanced Type Patterns

### Type-Safe Plugins with Generic Constraints

Create plugins that enforce type contracts between plugin state and plugin consumer.

```typescript
import { Elysia } from 'elysia';

interface PaginationConfig<T extends Record<string, unknown>> {
  defaultPageSize: number;
  maxPageSize: number;
  sortableFields: (keyof T)[];
}

function paginationPlugin<T extends Record<string, unknown>>(config: PaginationConfig<T>) {
  return new Elysia({ name: 'pagination' })
    .state('paginationConfig', config)
    .derive(({ headers }) => ({
      pagination: {
        page: parseInt(headers['x-page'] || '1'),
        limit: Math.min(
          parseInt(headers['x-limit'] || String(config.defaultPageSize)),
          config.maxPageSize
        ),
        sortField: (headers['x-sort'] as keyof T) || undefined,
        sortOrder: (headers['x-order'] || 'desc') as 'asc' | 'desc'
      }
    }));
}

// Usage
interface Product {
  id: string;
  name: string;
  price: number;
  created_at: string;
}

const app = new Elysia()
  .use(paginationPlugin<Product>({
    defaultPageSize: 20,
    maxPageSize: 100,
    sortableFields: ['name', 'price', 'created_at']
  }))
  .get('/products', ({ pagination }) => {
    // pagination is typed with Product sortable fields
    return db.products.findMany({
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
      orderBy: pagination.sortField
        ? { [pagination.sortField]: pagination.sortOrder }
        : undefined
    });
  });
```

### Type-Safe Configuration Object

Use Elysia t to validate and type application configuration at startup.

```typescript
import { t } from 'elysia';

const ConfigSchema = t.Object({
  NODE_ENV: t.Enum({ development: 'development', production: 'production', test: 'test' }),
  PORT: t.Integer({ minimum: 1024, maximum: 65535, default: 3000 }),
  DATABASE_URL: t.String({ format: 'uri' }),
  REDIS_URL: t.Optional(t.String({ format: 'uri' })),
  JWT_SECRET: t.String({ minLength: 32 }),
  CORS_ORIGINS: t.Array(t.String(), { default: ['http://localhost:3000'] }),
  LOG_LEVEL: t.Enum({ debug: 'debug', info: 'info', warn: 'warn', error: 'error' }, { default: 'info' }),
  RATE_LIMIT_MAX: t.Integer({ minimum: 10, maximum: 10000, default: 100 }),
  RATE_LIMIT_WINDOW_MS: t.Integer({ minimum: 1000, default: 60000 })
});

type Config = typeof ConfigSchema.static;

function loadConfig(): Config {
  const raw = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '3000'),
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    CORS_ORIGINS: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000')
  };

  const { data, errors } = ConfigSchema.validate(raw);
  if (errors) {
    throw new Error(`Configuration validation failed:\n${errors.map(e => `  - ${e.path}: ${e.message}`).join('\n')}`);
  }
  return data;
}
```

### Type-Safe Event Emitter

Create a typed event system that enforces payload types per event.

```typescript
import { Elysia } from 'elysia';
import { t } from 'elysia';

type EventMap = {
  'order.created': { orderId: string; customerId: string; total: number };
  'order.cancelled': { orderId: string; reason: string };
  'user.registered': { userId: string; email: string };
  'payment.failed': { orderId: string; error: string; amount: number };
};

const eventSchemas = {
  'order.created': t.Object({ orderId: t.String(), customerId: t.String(), total: t.Number() }),
  'order.cancelled': t.Object({ orderId: t.String(), reason: t.String() }),
  'user.registered': t.Object({ userId: t.String(), email: t.String({ format: 'email' }) }),
  'payment.failed': t.Object({ orderId: t.String(), error: t.String(), amount: t.Number() })
} as const;

function typedEventPlugin() {
  const listeners = new Map<string, Set<(data: any) => void>>();

  return new Elysia({ name: 'typed-events' })
    .decorate('events', {
      emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
        const schema = eventSchemas[event];
        const { errors } = (schema as any).validate(data);
        if (errors) {
          console.error(`Event validation failed for ${String(event)}:`, errors);
          return;
        }
        const eventListeners = listeners.get(event as string);
        if (eventListeners) {
          eventListeners.forEach(listener => listener(data));
        }
      },
      on<K extends keyof EventMap>(event: K, handler: (data: EventMap[K]) => void): () => void {
        if (!listeners.has(event as string)) {
          listeners.set(event as string, new Set());
        }
        listeners.get(event as string)!.add(handler);
        return () => listeners.get(event as string)?.delete(handler);
      }
    });
}

// Usage
app
  .use(typedEventPlugin())
  .post('/orders', async ({ body, events }) => {
    const order = await orderService.create(body);
    events.emit('order.created', {
      orderId: order.id,
      customerId: body.customerId,
      total: order.total
    });
    return order;
  });
```

### Type-Safe Middleware Chain

Compose middleware with type state transformations tracked through the type system.

```typescript
import { Elysia } from 'elysia';

// Each middleware adds to the context type
const withUser = new Elysia({ name: 'withUser' })
  .derive(({ headers }) => ({
    user: { id: headers['x-user-id'] || 'anonymous', role: (headers['x-role'] || 'user') as 'admin' | 'user' }
  }));

const withPermissions = new Elysia({ name: 'withPermissions' })
  .use(withUser)
  .derive(({ user }) => ({
    can: (permission: string): boolean => {
      return user.role === 'admin' || availablePermissions[user.role]?.includes(permission);
    }
  }));

const withRequestId = new Elysia({ name: 'withRequestId' })
  .derive(({ headers }) => ({
    requestId: headers['x-request-id'] || crypto.randomUUID()
  }));

// Compose them
const composed = new Elysia()
  .use(withRequestId)
  .use(withPermissions)
  .get('/orders', ({ user, can, requestId }) => {
    // context has: user, can, requestId all typed
    if (!can('orders:read')) return { error: 'Forbidden' };
    return { requestId, orders: [] };
  });
```

## Common Type Inference Issues

### Schema Reuse and Type Narrowing

When reusing schemas, TypeScript may widen types unexpectedly. Use `const` assertions or explicit type annotations.

```typescript
const StatusEnum = t.Enum({ active: 'active', inactive: 'inactive', archived: 'archived' });

// Correct: TypeScript infers literal union
type Status = typeof StatusEnum.static;
// 'active' | 'inactive' | 'archived'

// Problem: Array of statuses may widen to string[]
const statuses = ['active', 'archived'];
// Solution: use 'as const'
const statusesTyped = ['active', 'archived'] as const;
```

### Generic Schema Functions

When creating generic schema functions, ensure type parameters are correctly inferred.

```typescript
// Generic paginated response wrapper
function PaginatedResponse<T extends ReturnType<typeof t.Any>>(itemSchema: T) {
  return t.Object({
    data: t.Array(itemSchema),
    pagination: t.Object({
      page: t.Integer(),
      limit: t.Integer(),
      total: t.Integer(),
      totalPages: t.Integer()
    })
  });
}

const OrderResponse = t.Object({ id: t.String(), total: t.Number(), status: t.String() });
const PaginatedOrders = PaginatedResponse(OrderResponse);

type PaginatedOrdersType = typeof PaginatedOrders.static;
// { data: { id: string; total: number; status: string }[]; pagination: { page: number; ... } }
```

### Avoiding `any` Leakage

Ensure that validation schemas don't leak `any` into the inferred types.

```typescript
// Bad: t.Any() leaks 'any' to all consumers
const BadSchema = t.Object({
  metadata: t.Any()
});

// Better: use t.Unknown() + explicit cast
const BetterSchema = t.Object({
  metadata: t.Unknown()
});

// Best: constrain with a Record type
const BestSchema = t.Object({
  metadata: t.Record(t.String(), t.Unknown())
});
```

## Performance of Type Inference

### Schema Instantiation Cost

Complex schemas with deep nesting increase TypeScript compilation time. Strategies to mitigate:

- Prefer composable small schemas over monolithic ones. Split schemas at natural boundaries.
- Use `t.Intersect` for combining schemas rather than deeply nested `t.Object`.
- Extract reusable partial schemas (e.g., `PaginationParams`, `TimestampFields`).
- Use `t.Pick` and `t.Omit` for derived schemas instead of redefining fields.
- Limit schema depth to 5 levels for optimal compilation performance.

### Impact on IDE Performance

Large Eden Treaty client types with many endpoints can slow down IDE autocompletion. Mitigation:

- Export only the main `App` type, not intermediate schema types.
- Use `type` imports for Eden types to avoid bundling server code.
- Split large apps into multiple Elysia instances composed at the top level.
- Use TypeScript project references for independent compilation.

## Testing Type Safety

### Compile-Time Testing

Test that types are correct at compile time using TypeScript's type assertions.

```typescript
import { expectTypeOf } from 'vitest';

const UserSchema = t.Object({ name: t.String(), age: t.Number() });
type User = typeof UserSchema.static;

// Compile-time assertion
expectTypeOf<User>().toEqualTypeOf<{ name: string; age: number }>();

// Test that invalid assignments fail at compile time
// @ts-expect-error — age should be number, not string
const invalid: User = { name: 'John', age: 'thirty' };
```

### Runtime Type Verification

Always validate external data (API responses, database results) at runtime.

```typescript
function validateResponse<T extends t.TSchema>(schema: T, data: unknown): typeof schema.static {
  const { data: validated, errors } = schema.validate(data);
  if (errors) {
    throw new TypeError(`Response validation failed: ${errors.map(e => e.message).join(', ')}`);
  }
  return validated;
}

// Usage in API client
const rawResponse = await fetch('/api/orders').then(r => r.json());
const order = validateResponse(OrderSchema, rawResponse);
// order is now fully typed and validated
```

## Integration with Database Types

### ORM Type Mapping

Map database types to Elysia t schemas for end-to-end type consistency.

```typescript
import { t } from 'elysia';
import { Prisma } from '@prisma/client';

// Generate Elysia t schemas from Prisma types
function fromPrismaModel<T>(model: T): t.TSchema {
  // Transform Prisma model to Elysia schema
  // Implementation depends on ORM
}

// Manual mapping for precise control
const OrderDbSchema = t.Object({
  id: t.String({ format: 'uuid' }),
  customerId: t.String({ format: 'uuid' }),
  status: t.Enum({
    pending: 'pending',
    confirmed: 'confirmed',
    shipped: 'shipped',
    delivered: 'delivered',
    cancelled: 'cancelled'
  }),
  total: t.Number({ minimum: 0 }),
  items: t.Array(t.Object({
    productId: t.String({ format: 'uuid' }),
    quantity: t.Integer({ minimum: 1 }),
    unitPrice: t.Number({ minimum: 0 })
  })),
  createdAt: t.Date(),
  updatedAt: t.Date()
});

// Create/Update schemas differ from DB schema
const CreateOrderSchema = t.Omit(OrderDbSchema, ['id', 'createdAt', 'updatedAt', 'status']);
const UpdateOrderSchema = t.Partial(t.Omit(OrderDbSchema, ['id', 'createdAt', 'updatedAt']));

// Response schema may differ from DB schema
const OrderResponseSchema = t.Omit(OrderDbSchema, ['customerId']);
```

## Type Safety in Monorepos

### Shared Schema Packages

Place shared schemas in a separate package for consumption by both server and client.

```json
// packages/shared/package.json
{
  "name": "@acme/shared-schemas",
  "main": "src/index.ts",
  "types": "src/index.ts"
}
```

```typescript
// packages/shared/src/schemas.ts
import { t } from 'elysia';

export const OrderSchema = t.Object({ ... });
export const UserSchema = t.Object({ ... });

export type Order = typeof OrderSchema.static;
export type User = typeof UserSchema.static;
```

```typescript
// apps/server/src/routes.ts
import { OrderSchema, UserSchema } from '@acme/shared-schemas';

export const app = new Elysia()
  .post('/orders', (ctx) => { ... }, { body: OrderSchema });
```

```typescript
// apps/client/src/api.ts
import { edenTreaty } from '@elysiajs/eden';
import type { App } from '@acme/server';

const client = edenTreaty<App>('http://localhost:3000');
```

### Dealing with Schema Changes

When schemas change, TypeScript catches usage mismatches at compile time:

1. A field is added to a schema: all consumers that depend on the field type update.
2. A field type changes: all consumers that use the field get compile errors.
3. A field is removed: all consumers referencing the field get compile errors.
4. A schema is split: consumers must import from the new location.

Run `tsc --noEmit` across the monorepo to verify schema changes don't break consumers.

## Limitations and Workarounds

### TypeScript Recursion Limit

Deeply recursive schemas may hit TypeScript's recursion limit (default 50). Use `t.Lazy` to defer type resolution.

```typescript
// Problem: self-referencing type hits recursion limit
const DeepCategory = t.Object({
  name: t.String(),
  children: t.Array(t.Lazy(() => DeepCategory))
  // Lazy defers type resolution, avoiding recursion limit
});
```

### Excluded Types from Elysia t

Elysia t does not support all TypeScript types natively:

- `bigint`: not supported in JSON serialization. Use `t.String()` with custom validation.
- `symbol`: not serializable. Use `t.String()` with enum.
- `Map`, `Set`: not directly supported. Convert to `t.Record` or `t.Array`.
- `Promise`: use `t.Any()` or unwrap in handler.
- Complex generic types: may need manual `.static` type override.

### Custom Type Definitions

For types not covered by Elysia t, create custom validators with type assertions.

```typescript
import { t } from 'elysia';

// Custom BigInt schema
const BigIntSchema = t.String({ pattern: '^-?[0-9]+$' });

// Custom type with validation function
const EmailSchema = t.String({ format: 'email' });

const CustomSchema = t.Object({
  id: t.String(),
  metadata: t.Unknown()  // validated at usage site
});

// Override static type if needed
type CustomOverride = typeof CustomSchema.static & { metadata: Record<string, unknown> };
```

## Version History

| Version | Type Safety Features |
|---------|---------------------|
| 0.1.x | Basic t.Object inference on body |
| 0.4.x | Derive type inference, guard types |
| 0.7.x | OpenAPI schema generation from types |
| 1.0.x | Eden Treaty client, stable inference |
| 1.2.x | Improved union/intersect type inference |
| 1.3.x+ | Macro type safety, plugin dependency tracking |
