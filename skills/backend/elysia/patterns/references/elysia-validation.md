# Elysia Validation

## Elysia t Types

```typescript
import { Elysia, t } from 'elysia';

// Basic types
t.String();
t.Number();
t.Boolean();
t.Integer();
t.Null();
t.Undefined();
t.Any();
t.Unknown();

// Complex types
t.Optional(t.String());
t.Nullable(t.Number());
t.Array(t.String());
t.Object({ name: t.String(), age: t.Number() });
t.Record(t.String(), t.Any());
t.Union([t.String(), t.Number()]);
t.Intersect([t.Object({ a: t.String() }), t.Object({ b: t.Number() })]);

// String formats
t.String({ format: 'email' });
t.String({ format: 'uri' });
t.String({ format: 'uuid' });
t.String({ format: 'date' });
t.String({ format: 'date-time' });
t.String({ pattern: '^[a-z]+$' });

// Number constraints
t.Number({ minimum: 0, maximum: 100 });
t.Number({ exclusiveMinimum: 0, exclusiveMaximum: 100 });
t.Integer({ minimum: 1 });
```

## Route-level Validation

```typescript
const app = new Elysia()
  .post('/orders', ({ body }) => createOrder(body), {
    body: t.Object({
      customerId: t.String({ format: 'uuid' }),
      items: t.Array(
        t.Object({
          productId: t.String({ format: 'uuid' }),
          quantity: t.Integer({ minimum: 1 }),
          price: t.Number({ minimum: 0 }),
        }),
        { minItems: 1 }
      ),
      shippingAddress: t.Object({
        street: t.String({ minLength: 1 }),
        city: t.String({ minLength: 1 }),
        zipCode: t.String({ pattern: '^[0-9]{5}$' }),
        country: t.String({ minLength: 2, maxLength: 2 }),
      }),
    }),
    query: t.Object({
      includeItems: t.Optional(t.Boolean()),
    }),
    params: t.Object({
      id: t.String({ format: 'uuid' }),
    }),
    headers: t.Object({
      authorization: t.String(),
    }),
    response: t.Object({
      id: t.String(),
      status: t.String(),
      totalAmount: t.Number(),
      createdAt: t.String(),
    }),
  });
```

## Custom Validation Error Handling

```typescript
import { ValidationError } from 'elysia';

const app = new Elysia()
  .onError(({ code, error, set }) => {
    if (code === 'VALIDATION') {
      set.status = 400;
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: (error as ValidationError).all, // all validation errors
        },
      };
    }
  });
```

## Custom Type Definitions

```typescript
import { t } from 'elysia';

// Custom format
export const UUID = t.String({ format: 'uuid' });
export const Email = t.String({ format: 'email' });
export const PositiveInt = t.Integer({ minimum: 1 });
export const NonEmptyString = t.String({ minLength: 1, maxLength: 255 });

// Union types for enums
export const OrderStatus = t.Union([
  t.Literal('pending'),
  t.Literal('confirmed'),
  t.Literal('shipped'),
  t.Literal('delivered'),
  t.Literal('cancelled'),
]);

// Composed schemas
export const PaginationQuery = t.Object({
  page: t.Integer({ minimum: 1, default: 1 }),
  limit: t.Integer({ minimum: 1, maximum: 100, default: 20 }),
  sort: t.Optional(t.String()),
  order: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
});

export const ApiResponse = t.Object({
  success: t.Boolean(),
  data: t.Optional(t.Any()),
  error: t.Optional(t.Object({
    code: t.String(),
    message: t.String(),
    details: t.Optional(t.Any()),
  })),
  meta: t.Optional(t.Object({
    page: t.Number(),
    limit: t.Number(),
    total: t.Number(),
  })),
});
```

## Type Inference

```typescript
import { Elysia, t } from 'elysia';

const createOrderSchema = t.Object({
  customerId: t.String({ format: 'uuid' }),
  items: t.Array(t.Object({
    productId: t.String({ format: 'uuid' }),
    quantity: t.Integer({ minimum: 1 }),
  })),
});

// Infer TypeScript type from schema
type CreateOrderDto = typeof createOrderSchema.static;
// { customerId: string; items: { productId: string; quantity: number }[] }

// Response type inference
const app = new Elysia()
  .post('/orders', ({ body }) => {
    return {
      id: crypto.randomUUID(),
      status: 'pending' as const,
      ...body,
    };
  }, {
    body: createOrderSchema,
    response: t.Object({
      id: t.String(),
      status: t.String(),
      customerId: t.String(),
      items: t.Array(t.Any()),
    }),
  });

// Infer full API type for Eden Treaty
export type App = typeof app;
```

## Validation in Plugins

```typescript
// Plugin-level schema validation
export const orderPlugin = new Elysia({ name: 'orderPlugin', prefix: '/orders' })
  .post('/:id/items', ({ body, params }) => addItem(params.id, body), {
    params: t.Object({ id: t.String({ format: 'uuid' }) }),
    body: t.Object({
      productId: t.String({ format: 'uuid' }),
      quantity: t.Integer({ minimum: 1 }),
    }),
  });
```

## Transform / Parse Hooks

```typescript
// Transform input before validation
const app = new Elysia()
  .post('/orders', ({ body }) => createOrder(body), {
    body: t.Object({
      customerId: t.String({ format: 'uuid' }),
      items: t.Array(t.Object({
        productId: t.String({ format: 'uuid' }),
        quantity: t.Integer(),
      })),
      // Transform will convert string quantity to number
      transform: ({ body }) => {
        body.items = body.items.map(item => ({
          ...item,
          quantity: Number(item.quantity),
        }));
      },
    }),
  });
```
