# Elysia Custom Plugins

## Plugin Structure

```typescript
import { Elysia } from 'elysia'

export const myPlugin = (options?: PluginOptions) => {
  const { prefix = '/api', logger = false } = options || {}

  return (app: Elysia) =>
    app
      .state('pluginState', { initialized: true })
      .decorate('pluginUtils', {
        formatResponse: (data: unknown) => ({ success: true, data }),
      })
      .get(`${prefix}/health`, () => ({ status: 'ok' }))
      .onBeforeHandle(({ request }) => {
        if (logger) console.log(`[Plugin] ${request.method} ${request.url}`)
      })
}
```

## Lifecycle Hooks

| Hook | Timing | Use Case |
|------|--------|----------|
| onTransform | After parsing, before validation | Request normalization |
| onBeforeHandle | After validation, before handler | Auth checks, rate limiting |
| onAfterHandle | After handler, before response | Response enrichment |
| onError | On error in any phase | Global error formatting |
| onStart | Server starts | Connection pools, warmup |
| onStop | Server stops | Graceful shutdown |

### Custom Lifecycle Plugin
```typescript
export const auditPlugin = () => (app: Elysia) =>
  app
    .derive(({ request }) => ({
      startTime: performance.now(),
    }))
    .onBeforeHandle(({ request, store }) => {
      store.auditLog.push({
        method: request.method,
        url: request.url,
        timestamp: new Date(),
      })
    })
    .onAfterHandle(({ startTime, response }) => {
      const duration = performance.now() - startTime
      console.log(`Handled in ${duration.toFixed(2)}ms`)
    })
```

## Custom Adapters

```typescript
import { Elysia } from 'elysia'
import type { Server } from 'bun'

export const customAdapter = (options: AdapterOptions) => {
  return (app: Elysia) => {
    const server: Server = Bun.serve({
      port: options.port || 3000,
      fetch: app.fetch,
      tls: options.tls ? { key: options.key, cert: options.cert } : undefined,
      development: options.development || false,
    })

    return {
      ...app,
      server,
      stop: () => server.stop(),
    }
  }
}
```

## Plugin Composition

| Pattern | Description | Example |
|---------|-------------|---------|
| Chained | Plugins applied sequentially | app.use(a).use(b).use(c) |
| Scoped | Plugin applies to route group | app.group('/api', app => app.use(adminGuard)) |
| Conditional | Plugin active based on condition | app.use(env === 'prod' ? prodPlugin : devPlugin) |
| Layered | Multiple plugins same hook | Ratelimiter → AuthLogger → AuthGuard |

### Scoped Plugin
```typescript
export const adminPlugin = () => (app: Elysia) =>
  app
    .derive(({ headers }) => ({
      isAdmin: headers['x-admin-key'] === process.env.ADMIN_KEY,
    }))
    .onBeforeHandle(({ isAdmin, set }) => {
      if (!isAdmin) {
        set.status = 403
        return { error: 'Admin access required' }
      }
    })
```
