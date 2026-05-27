# Elysia Routing and Validation

## Route Structure

Group routes by domain with Elysia's group method:

```typescript
import { Elysia, t } from 'elysia'

const app = new Elysia()
  .group('/api/orders', (app) =>
    app
      .get('/', () => orderService.findAll())
      .get('/:id', ({ params: { id } }) => orderService.findById(id))
      .post('/', ({ body }) => orderService.create(body), {
        body: t.Object({
          customerId: t.String({ format: 'uuid' }),
          items: t.Array(t.Object({
            productId: t.String({ format: 'uuid' }),
            quantity: t.Integer({ minimum: 1 }),
            price: t.Number({ minimum: 0 }),
          }), { minItems: 1 }),
        }),
      })
      .put('/:id', ({ params: { id }, body }) => orderService.update(id, body))
      .delete('/:id', ({ params: { id } }) => orderService.delete(id))
  )
  .listen(3000)
```

## Route Parameters

```typescript
app.get('/orders/:id', ({ params: { id } }) => {
  return orderService.findById(id)
}, {
  params: t.Object({
    id: t.String({ format: 'uuid' }),
  }),
})

// Multiple params
app.get('/orders/:orderId/items/:itemId', ({
  params: { orderId, itemId },
}) => {
  return orderService.findItem(orderId, itemId)
}, {
  params: t.Object({
    orderId: t.String({ format: 'uuid' }),
    itemId: t.String({ format: 'uuid' }),
  }),
})
```

## Query Parameters

```typescript
app.get('/orders', ({ query }) => {
  return orderService.findAll(query)
}, {
  query: t.Object({
    page: t.Optional(t.Numeric({ default: 1 })),
    limit: t.Optional(t.Numeric({ default: 20 })),
    status: t.Optional(t.String()),
    sort: t.Optional(t.String({ default: 'createdAt' })),
    order: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')], { default: 'desc' })),
  }),
})
```

## Request Validation

```typescript
import { Elysia, t } from 'elysia'

const createOrderSchema = t.Object({
  customerId: t.String({ format: 'uuid' }),
  items: t.Array(t.Object({
    sku: t.String({ minLength: 1 }),
    quantity: t.Integer({ minimum: 1, maximum: 100 }),
    price: t.Number({ minimum: 0.01 }),
    currency: t.Optional(t.String({ default: 'USD' })),
  }), { minItems: 1, maxItems: 50 }),
  shippingAddress: t.Optional(t.Object({
    street: t.String(),
    city: t.String(),
    zipCode: t.String(),
    country: t.String(),
  })),
  notes: t.Optional(t.String({ maxLength: 500 })),
})

app.post('/orders', ({ body }) => orderService.create(body), {
  body: createOrderSchema,
  detail: {
    tags: ['Orders'],
    summary: 'Create a new order',
    description: 'Creates an order with items and optional shipping address',
  },
})
```

## Custom Validation

```typescript
import { Elysia, t } from 'elysia'

// Custom format validation
const uuidFormat = t.RegExp(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)

const updateOrderSchema = t.Object({
  status: t.Union([
    t.Literal('pending'),
    t.Literal('confirmed'),
    t.Literal('shipped'),
    t.Literal('delivered'),
    t.Literal('cancelled'),
  ]),
  trackingNumber: t.Optional(t.String({ pattern: '^[A-Z0-9]{6,20}$' })),
})
```

## Response Validation

```typescript
const orderResponseSchema = t.Object({
  id: t.String({ format: 'uuid' }),
  customerId: t.String({ format: 'uuid' }),
  status: t.String(),
  items: t.Array(t.Object({
    sku: t.String(),
    quantity: t.Integer(),
    price: t.Number(),
  })),
  total: t.Number(),
  createdAt: t.String({ format: 'date-time' }),
})

app.get('/orders/:id', ({ params: { id } }) => {
  return orderService.findById(id)
}, {
  params: t.Object({ id: t.String({ format: 'uuid' }) }),
  response: t.Union([
    orderResponseSchema,
    t.Object({ error: t.String() }),
  ]),
})
```

## Route Guards

```typescript
import { Elysia } from 'elysia'

const app = new Elysia()
  .guard({
    beforeHandle: async ({ headers, set }) => {
      const token = headers.authorization?.slice(7)
      if (!token) {
        set.status = 401
        return { error: 'Unauthorized' }
      }
      const payload = await verifyToken(token)
      if (!payload) {
        set.status = 401
        return { error: 'Invalid token' }
      }
    },
  }, (app) =>
    app
      .get('/orders', () => orderService.findAll())
      .post('/orders', ({ body }) => orderService.create(body), {
        body: createOrderSchema,
      })
  )
```

## Error Responses

```typescript
import { Elysia } from 'elysia'

const app = new Elysia()
  .onError(({ code, error, set }) => {
    switch (code) {
      case 'VALIDATION':
        set.status = 400
        return {
          success: false,
          error: 'Validation Error',
          details: error.all,
        }
      case 'NOT_FOUND':
        set.status = 404
        return { success: false, error: error.message }
      case 'PARSE':
        set.status = 400
        return { success: false, error: 'Invalid JSON body' }
      default:
        set.status = 500
        return { success: false, error: 'Internal Server Error' }
    }
  })
```

## Key Points

- Use group() for domain-level route organization
- Validate all inputs with Elysia t schema at route level
- Use format constraints (uuid, date-time, email) for type safety
- Provide default values with t.Optional and default
- Guard routes with beforeHandle for authentication
- Handle validation, parse, and not-found errors globally
- Define response schemas for API documentation
- Use guards to apply middleware to route groups
- Separate route definitions into domain modules
- Use detail for Swagger documentation generation
