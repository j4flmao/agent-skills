# Oak Setup Guide

## Prerequisites
- Deno 1.40+ (install: `winget install deno` / `curl -fsSL https://deno.land/install.sh | sh`)

## Project Initialization
```bash
mkdir order-service && cd order-service
deno init
```

## Basic Server
```typescript
import { Application, Router } from "jsr:@oak/oak"
import { oakCors } from "jsr:@tajpouria/cors"

const app = new Application()
const router = new Router()

router
  .get("/api/orders", async (ctx) => {
    const orders = await db.listOrders()
    ctx.response.body = { data: orders }
  })
  .get("/api/orders/:id", async (ctx) => {
    const order = await db.getOrder(ctx.params.id)
    if (!order) {
      ctx.response.status = 404
      ctx.response.body = { error: "Not found" }
      return
    }
    ctx.response.body = { data: order }
  })
  .post("/api/orders", async (ctx) => {
    const body = await ctx.request.body.json()
    const order = await db.createOrder(body)
    ctx.response.status = 201
    ctx.response.body = { data: order }
  })

app.use(oakCors())
app.use(router.routes())
app.use(router.allowedMethods())

app.addEventListener("listen", ({ hostname, port }) => {
  console.log(`Listening on ${hostname}:${port}`)
})

await app.listen({ port: 3000 })
```

## Context API
```typescript
router.get("/orders/:id", async (ctx) => {
  // Request
  ctx.request.method
  ctx.request.url
  ctx.request.headers.get("Authorization")
  ctx.request.ip
  ctx.request.body()

  // Params & Query
  ctx.params.id
  ctx.request.url.searchParams.get("page")

  // Response
  ctx.response.status = 200
  ctx.response.body = { data: order }
  ctx.response.headers.set("X-Request-Id", crypto.randomUUID())
  ctx.response.type = "application/json"
})
```

## Environment Config
```typescript
const config = {
  port: parseInt(Deno.env.get("PORT") || "3000"),
  dbUrl: Deno.env.get("DATABASE_URL") || "postgres://localhost:5432/orders",
  jwtSecret: Deno.env.get("JWT_SECRET") || "dev-secret",
}

// .env support (deno 2.x)
// deno run --env-file=.env src/main.ts
```

## Running
```bash
# Dev (watch mode)
deno run --watch --allow-net --allow-env --allow-read src/main.ts

# Production
deno compile --allow-net --allow-env --allow-read --output order-service src/main.ts
./order-service

# With permissions
deno run --allow-net=:3000 --allow-env=DATABASE_URL,JWT_SECRET src/main.ts
```

## State Management
```typescript
app.use(async (ctx, next) => {
  ctx.state.user = await authenticate(ctx)
  ctx.state.db = db
  await next()
})

router.get("/orders", (ctx) => {
  const user = ctx.state.user
  const db = ctx.state.db
})
```

## Router Groups
```typescript
const api = new Router({ prefix: "/api/v1" })

api.get("/orders", listOrders)
api.post("/orders", createOrder)

const admin = new Router({ prefix: "/admin" })
admin.use(authMiddleware)
admin.get("/users", listUsers)

app.use(api.routes())
app.use(admin.routes())
```
