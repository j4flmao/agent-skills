# Hono Custom Middleware

## Middleware Signature

```typescript
import { MiddlewareHandler } from 'hono'
import type { Context, Next } from 'hono'

// Basic middleware
const timingMiddleware: MiddlewareHandler = async (c, next) => {
  const start = performance.now()
  await next()
  const duration = performance.now() - start
  c.res.headers.set('X-Response-Time', `${duration}ms`)
}

// Middleware with configuration
export const rateLimiter = (options: RateLimitOptions): MiddlewareHandler => {
  const { maxRequests, windowMs } = options
  const store = new Map<string, { count: number; resetAt: number }>()

  return async (c, next) => {
    const key = c.req.header('x-forwarded-for') || 'unknown'
    const now = Date.now()
    const entry = store.get(key)

    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs })
      return await next()
    }

    if (entry.count >= maxRequests) {
      return c.json({ error: 'Rate limit exceeded' }, 429)
    }

    entry.count++
    return await next()
  }
}
```

## Middleware Composability

```typescript
import { Hono } from 'hono'

const app = new Hono()

// Compose multiple middlewares
app.use('*', async (c, next) => {
  console.log(`[${c.req.method}] ${c.req.url}`)
  await next()
})

app.use('/api/*', cors())
app.use('/api/*', authMiddleware)
app.use('/api/admin/*', adminOnlyMiddleware)

// Route-specific middleware
app.get('/users/:id', verifyOwnership, async (c) => {
  const id = c.req.param('id')
  return c.json(await getUser(id))
})
```

## Middleware Ordering

| Position | Middleware | Responsibility |
|----------|-----------|----------------|
| 1 | cors | CORS headers |
| 2 | logger | Request logging |
| 3 | requestId | Assign X-Request-Id |
| 4 | auth | JWT / API key verification |
| 5 | rateLimiter | Rate limiting |
| 6 | validator | Request validation |
| 7 | handler | Route handler |
| 8 | errorHandler | Catch-all error handling |

## Custom Validation Middleware

```typescript
import { z } from 'zod'
import { MiddlewareHandler } from 'hono'

export const validate = (schema: z.ZodSchema): MiddlewareHandler => {
  return async (c, next) => {
    const method = c.req.method

    try {
      if (['POST', 'PUT', 'PATCH'].includes(method)) {
        const body = await c.req.json()
        c.set('validatedBody', schema.parse(body))
      }
      if (method === 'GET') {
        const query = c.req.query()
        c.set('validatedQuery', schema.parse(query))
      }
      await next()
    } catch (err) {
      if (err instanceof z.ZodError) {
        return c.json({
          error: 'Validation failed',
          details: err.errors,
        }, 400)
      }
      throw err
    }
  }
}
```

## Error Handler Middleware

```typescript
import { HTTPException } from 'hono/http-exception'

export const globalErrorHandler: MiddlewareHandler = async (c, next) => {
  try {
    await next()
  } catch (err) {
    if (err instanceof HTTPException) {
      return c.json({
        code: err.status,
        message: err.message,
      }, err.status)
    }

    if (err instanceof SyntaxError) {
      return c.json({
        code: 400,
        message: 'Invalid JSON body',
      }, 400)
    }

    console.error('Unhandled error:', err)
    return c.json({
      code: 500,
      message: 'Internal server error',
    }, 500)
  }
}
```

## Best Practices
- Middleware order matters: security → routing → validation → error handling
- Use `c.set()` and `c.get()` for per-request state
- Keep middleware focused on single responsibility
- Configure middleware through factory functions, not globals
- Test middleware in isolation with `app.request()`
