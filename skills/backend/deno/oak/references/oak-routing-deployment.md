# Oak Routing and Deployment

## Route Organization

Group routes by domain prefix using Router with typed state:

```typescript
import { Router, Context } from 'oak'

interface AppState {
  user: { id: string; role: string }
}

const orderRouter = new Router<AppState>({ prefix: '/api/orders' })

orderRouter.get('/', async (ctx) => {
  const orders = await orderService.findAll()
  ctx.response.body = { success: true, data: orders }
})

orderRouter.get('/:id', async (ctx) => {
  const id = ctx.params.id!
  const order = await orderService.findById(id)
  if (!order) {
    ctx.response.status = 404
    ctx.response.body = { success: false, error: 'Order not found' }
    return
  }
  ctx.response.body = { success: true, data: order }
})

orderRouter.post('/', async (ctx) => {
  const body = await ctx.request.body().value
  const order = await orderService.create(body)
  ctx.response.status = 201
  ctx.response.body = { success: true, data: order }
})

orderRouter.put('/:id', async (ctx) => {
  const id = ctx.params.id!
  const body = await ctx.request.body().value
  const order = await orderService.update(id, body)
  ctx.response.body = { success: true, data: order }
})

orderRouter.delete('/:id', async (ctx) => {
  const id = ctx.params.id!
  await orderService.deleteById(id)
  ctx.response.status = 204
})
```

## Router Aggregation

Mount domain routers under a main router:

```typescript
import { Router } from 'oak'
import { orderRouter } from './orders.ts'
import { productRouter } from './products.ts'
import { healthRouter } from './health.ts'

const router = new Router()
router.use('/api/orders', orderRouter.routes(), orderRouter.allowedMethods())
router.use('/api/products', productRouter.routes(), productRouter.allowedMethods())
router.use('/health', healthRouter.routes(), healthRouter.allowedMethods())

export { router }
```

## Query Parameters and Pagination

```typescript
orderRouter.get('/', async (ctx) => {
  const params = ctx.request.url.searchParams
  const page = parseInt(params.get('page') ?? '1')
  const limit = parseInt(params.get('limit') ?? '20')
  const sort = params.get('sort') ?? 'createdAt'
  const order = params.get('order') ?? 'desc'

  const result = await orderService.findAll({ page, limit, sort, order })
  ctx.response.body = {
    success: true,
    data: result.items,
    pagination: {
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit),
    },
  }
})
```

## Body Validation

```typescript
import { Router } from 'oak'
import { z } from 'zod'

const createOrderSchema = z.object({
  customerId: z.string().uuid(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
  })).min(1),
})

orderRouter.post('/', async (ctx) => {
  const body = await ctx.request.body().value
  const parsed = createOrderSchema.safeParse(body)
  if (!parsed.success) {
    ctx.response.status = 400
    ctx.response.body = { success: false, errors: parsed.error.flatten() }
    return
  }
  const order = await orderService.create(parsed.data)
  ctx.response.status = 201
  ctx.response.body = { success: true, data: order }
})
```

## Context State

Pass per-request data via typed context state:

```typescript
interface AppState {
  user: { id: string; role: string }
  requestId: string
  startTime: number
}

const app = new Application<AppState>()

app.use(async (ctx, next) => {
  ctx.state.requestId = crypto.randomUUID()
  ctx.state.startTime = Date.now()
  await next()
})

// Access in controller
orderRouter.get('/', async (ctx) => {
  const userId = ctx.state.user.id
  const orders = await orderService.findByUser(userId)
  ctx.response.body = { success: true, data: orders }
})
```

## Static File Serving

```typescript
import { send } from 'oak/send.ts'

app.use(async (ctx, next) => {
  const path = ctx.request.url.pathname
  if (path.startsWith('/static')) {
    await send(ctx, path, {
      root: `${Deno.cwd()}/public`,
      index: 'index.html',
    })
    return
  }
  await next()
})
```

## Environment Configuration

```typescript
import { load } from 'std/dotenv/mod.ts'

const env = await load({ export: true })

const config = {
  port: parseInt(Deno.env.get('PORT') ?? '8080'),
  databaseUrl: Deno.env.get('DATABASE_URL') ?? 'postgres://localhost:5432/db',
  jwtSecret: Deno.env.get('JWT_SECRET') ?? '',
  corsOrigin: Deno.env.get('CORS_ORIGIN') ?? '*',
  logLevel: Deno.env.get('LOG_LEVEL') ?? 'info',
}

export { config }
```

## Deployment Options

### Deno Deploy

```typescript
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createApp } from './app.ts'

const app = createApp()
await serve(app.handle, { port: 8080 })
```

### Docker Deployment

```dockerfile
FROM denoland/deno:alpine-1.40.0

WORKDIR /app
COPY . .

RUN deno cache src/main.ts

EXPOSE 8080

CMD ["deno", "run", "--allow-net", "--allow-env", "--allow-read", "src/main.ts"]
```

### Self-Hosted with PM2-like

```typescript
// Start server with retry
async function start() {
  for (let i = 0; i < 3; i++) {
    try {
      const app = createApp()
      await app.listen({ port: config.port })
      console.log(`Server listening on ${config.port}`)
      return
    } catch (err) {
      console.error(`Start attempt ${i + 1} failed:`, err)
      await new Promise(r => setTimeout(r, 2000 * (i + 1)))
    }
  }
  console.error('Failed to start after 3 attempts')
  Deno.exit(1)
}
```

## Graceful Shutdown

```typescript
const app = createApp()
const controller = new AbortController()

app.addEventListener('listen', () => {
  console.log(`Server running on port ${config.port}`)
})

const shutdown = () => {
  console.log('Shutting down...')
  controller.abort()
}

Deno.addSignalListener('SIGINT', shutdown)
Deno.addSignalListener('SIGTERM', shutdown)

await app.listen({ port: config.port, signal: controller.signal })
console.log('Server shut down gracefully')
```

## Key Points

- Use typed Router for route grouping with prefix
- Validate request bodies with Zod schemas
- Pass request context via typed context state
- Prefer Router.allowedMethods() for correct method responses
- Use environment variables via Deno.env for all configuration
- Deploy via Deno Deploy for edge, Docker for containerized
- Implement graceful shutdown with AbortController
- Serve static files with oak/send for SPA or file delivery
- Paginate list endpoints with query parameter extraction
- Separate route definitions from app initialization
