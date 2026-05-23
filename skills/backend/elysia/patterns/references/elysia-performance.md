# Elysia Performance Optimization

## AOT Compilation
```typescript
const app = new Elysia({ aot: true });
```
Enables ahead-of-time compilation of route handlers. Recommended for production.

## Scoped Plugins
```typescript
// Use scoped plugins to avoid global pollution
const auth = new Elysia({ name: 'auth' })
  .derive({ as: 'scoped' }, ({ headers }) => ({ user: parseUser(headers) }));
```
Scoped plugins are optimized away if unused by downstream handlers. Use `as: 'scoped'` for middleware, `as: 'global'` only when every route needs it.

## Runtime Optimization

### Use Native Dependencies
```typescript
import { Elysia } from 'elysia'

// Prefer Bun-native over Node.js polyfills
// Bad: import { randomUUID } from 'node:crypto'
// Good: use crypto.randomUUID() (Bun-native)
```

### Reduce Middleware Overhead
```typescript
// Apply middleware only to routes that need it
const app = new Elysia()
  .get('/public', () => 'public')  // No middleware
  .group('/admin', (app) =>
    app.use(authPlugin)
      .get('/', adminHandler)
  )
```

### Schema Validation
```typescript
import { t } from 'elysia'

// With validation (enables AOT optimization)
app.get('/users/:id', ({ params: { id } }) => findUser(id), {
  params: t.Object({ id: t.String() })
})

// Without validation (slower, no AOT for this route)
app.get('/users/:id', ({ params: { id } }) => findUser(id))
```

### Connection Pooling
```typescript
// Use global connection pool, don't create per-request
const db = new Pool({ max: 20, idleTimeoutMillis: 30000 })

app.get('/users', async () => {
  const result = await db.query('SELECT * FROM users')
  return result.rows
})
```

## Benchmarks
| Runtime | Framework | req/s (hello world) | Cold start |
|---------|-----------|-------------------|------------|
| Bun | Elysia | ~200k | <10ms |
| Bun | Hono | ~180k | <10ms |
| Node | Fastify | ~60k | ~80ms |
| Node | Express | ~30k | ~100ms |
| Deno | Oak | ~40k | ~50ms |

## Bundle Size
- Elysia core: ~20KB (gzipped)
- Express: ~200KB (gzipped)
- Keep production dependencies minimal; Elysia's plugin system avoids tree-shaking issues.
