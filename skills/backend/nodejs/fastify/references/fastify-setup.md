# Fastify Setup Guide

## Prerequisites
- Node.js 18+
- npm / yarn / pnpm

## Project Initialization
```bash
mkdir order-service && cd order-service
npm init -y
npm install fastify @fastify/postgres @fastify/jwt @fastify/swagger pino
```

## Basic Server
```typescript
import Fastify, { FastifyInstance } from "fastify"

const server: FastifyInstance = Fastify({
  logger: {
    level: "info",
    transport: { target: "pino-pretty" },
  },
})

const start = async () => {
  try {
    await server.listen({ port: 3000 })
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}
start()
```

## Schema Validation
```typescript
const orderSchema = {
  body: {
    type: "object",
    required: ["customerId", "items"],
    properties: {
      customerId: { type: "string", format: "uuid" },
      items: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          required: ["sku", "quantity"],
          properties: {
            sku: { type: "string" },
            quantity: { type: "integer", minimum: 1 },
          },
        },
      },
    },
  },
  response: {
    201: {
      type: "object",
      properties: {
        id: { type: "string" },
        status: { type: "string" },
      },
    },
  },
}

server.post("/api/orders", { schema: orderSchema }, async (req, reply) => {
  const order = await createOrder(req.body)
  return reply.code(201).send(order)
})
```

## Environment Config
```typescript
import "dotenv/config"

export const config = {
  port: parseInt(process.env.PORT || "3000"),
  dbUrl: process.env.DATABASE_URL || "postgres://localhost:5432/orders",
  jwtSecret: process.env.JWT_SECRET || "dev-secret",
}
```

## Routes File Pattern
```typescript
// routes/orders.ts
import { FastifyInstance } from "fastify"

export async function orderRoutes(app: FastifyInstance) {
  app.get("/api/orders", async (req, reply) => {
    return await req.server.orderService.list()
  })

  app.get<{ Params: { id: string } }>(
    "/api/orders/:id",
    async (req, reply) => {
      const order = await req.server.orderService.get(req.params.id)
      if (!order) return reply.code(404).send({ error: "Not found" })
      return order
    }
  )
}

// app.ts
app.register(orderRoutes)
```

## Running
```bash
# Dev with auto-reload
npx tsx watch src/server.ts

# Production
npm run build
node dist/server.js
```

## Type Provider (TypeBox)
```typescript
import { Type, TypeBoxTypeProvider } from "@fastify/type-provider-typebox"

const app = Fastify().withTypeProvider<TypeBoxTypeProvider>()

app.get("/orders/:id", {
  schema: {
    params: Type.Object({ id: Type.String() }),
    response: { 200: orderSchema },
  },
}, async (req) => {
  return await getOrder(req.params.id)
})
```
