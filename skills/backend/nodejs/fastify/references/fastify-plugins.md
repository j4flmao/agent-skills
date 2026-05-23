# Fastify Plugins Guide

## Plugin Pattern
```typescript
import { FastifyInstance, FastifyPluginAsync } from "fastify"
import fp from "fastify-plugin"

const orderPlugin: FastifyPluginAsync = fp(async (app: FastifyInstance) => {
  app.decorate("orderService", new OrderService())
  app.decorateRequest("user", null)

  app.addHook("onRequest", async (req) => {
    req.user = await authenticate(req)
  })
})

export default orderPlugin
```

## Encapsulation & Context
```typescript
// Each plugin creates a child context.
// Decorations are scoped unless using fp().
app.register(async function publicApi(child) {
  child.decorate("rateLimit", new RateLimiter())
  // rateLimit accessible only inside this scope

  child.get("/public/orders", async () => {
    return await child.rateLimit.check()
  })
})

app.register(async function adminApi(child) {
  // rateLimit is NOT accessible here
  child.get("/admin/orders", handler)
})
```

## Hooks Lifecycle
```
onRequest → preParsing → preValidation → preHandler
  → preSerialization → onSend → onResponse
        ↓ error handler
```

```typescript
app.addHook("onRequest", async (req, reply) => {
  req.log.info({ url: req.url }, "incoming")
})

app.addHook("preHandler", async (req, reply) => {
  if (!req.user?.isAdmin && req.url.startsWith("/admin")) {
    return reply.code(403).send({ error: "Forbidden" })
  }
})

app.addHook("onSend", async (req, reply, payload) => {
  reply.header("X-Request-Id", req.id)
  return payload
})
```

## Decorators
```typescript
app.decorate("config", {
  dbUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
})

app.decorateRequest("user", null)

app.decorateReply("success", function (this: FastifyReply, data: unknown) {
  this.code(200).send({ ok: true, data })
})

// Usage
app.get("/orders", async (req, reply) => {
  req.user // decorated
  reply.success(await db.findOrders()) // decorated
})
```

## Error Handling
```typescript
app.setErrorHandler((error, req, reply) => {
  if (error.validation) {
    return reply.code(400).send({
      error: "Validation Error",
      details: error.validation,
    })
  }
  req.log.error(error)
  return reply.code(500).send({ error: "Internal Server Error" })
})

app.setNotFoundHandler((req, reply) => {
  reply.code(404).send({ error: `Route ${req.method} ${req.url} not found` })
})
```

## Content Type Parser
```typescript
app.addContentTypeParser("application/vnd.api+json", {
  parseAs: "string",
}, (req, body, done) => {
  try {
    done(null, JSON.parse(body as string))
  } catch (err) {
    done(new Error("Invalid JSON:API"), undefined)
  }
})
```

## Graceful Shutdown
```typescript
const signals = ["SIGINT", "SIGTERM"]
for (const signal of signals) {
  process.on(signal, async () => {
    await app.close()
    process.exit(0)
  })
}
```

## Serialization
```typescript
app.setSerializerCompiler(({ schema }) => {
  return (data) => JSON.stringify(data)
})
```
