# Fastify Validation

## Schema Validation

Fastify validates requests and serializes responses using JSON Schema. TypeBox provides type-safe schema definition.

```typescript
import { Type, Static } from '@sinclair/typebox';

// Schema definition
export const CreateOrderSchema = Type.Object({
  customerId: Type.String({ format: 'uuid' }),
  items: Type.Array(Type.Object({
    sku: Type.String({ minLength: 1 }),
    quantity: Type.Integer({ minimum: 1 }),
    price: Type.Number({ minimum: 0 }),
  }), { minItems: 1 }),
});

export type CreateOrderType = Static<typeof CreateOrderSchema>;
```

## Route Validation

```typescript
import { FastifyInstance } from 'fastify';

export async function orderRoutes(app: FastifyInstance) {
  app.post('/orders', {
    schema: {
      // Validate each part of request
      body: CreateOrderSchema,
      querystring: Type.Object({
        includeItems: Type.Optional(Type.Boolean()),
      }),
      params: Type.Object({
        id: Type.String({ format: 'uuid' }),
      }),
      headers: Type.Object({
        authorization: Type.String(),
      }),
      // Response validation
      response: {
        201: OrderResponseSchema,
        400: ErrorResponseSchema,
        404: ErrorResponseSchema,
      },
    },
  }, async (request, reply) => {
    // request.body is fully typed
    const order = await orderService.create(request.body);
    return reply.status(201).send(order);
  });
}
```

## Shared Schemas

```typescript
// schemas/common.ts
import { Type } from '@sinclair/typebox';

export const UuidParam = Type.Object({
  id: Type.String({ format: 'uuid' }),
});

export const PaginationQuery = Type.Object({
  page: Type.Integer({ minimum: 1, default: 1 }),
  limit: Type.Integer({ minimum: 1, maximum: 100, default: 20 }),
  sort: Type.Optional(Type.String()),
  order: Type.Optional(Type.Union([Type.Literal('asc'), Type.Literal('desc')])),
});

export const ErrorResponse = Type.Object({
  statusCode: Type.Number(),
  error: Type.String(),
  message: Type.String(),
});
```

## Response Serialization

```typescript
// Fastify serializes responses using the response schema
app.get('/orders/:id', {
  schema: {
    params: UuidParam,
    response: {
      200: Type.Object({
        id: Type.String(),
        customerId: Type.String(),
        status: Type.String(),
        totalAmount: Type.Number(),
        items: Type.Array(Type.Object({
          sku: Type.String(),
          quantity: Type.Number(),
          price: Type.Number(),
        })),
        createdAt: Type.String(),
      }),
    },
  },
}, handler);
```

## Custom Error Handler

```typescript
app.setErrorHandler((error, request, reply) => {
  // Validation errors
  if (error.validation) {
    return reply.status(400).send({
      statusCode: 400,
      error: 'Validation Error',
      message: 'Invalid request body',
      details: error.validation.map(v => ({
        field: v.instancePath || v.params?.missingProperty,
        message: v.message,
      })),
    });
  }

  // Known errors
  if (error.statusCode) {
    return reply.status(error.statusCode).send({
      statusCode: error.statusCode,
      error: error.name,
      message: error.message,
    });
  }

  // Unknown errors
  request.log.error(error);
  return reply.status(500).send({
    statusCode: 500,
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
  });
});
```

## Serialization Compilation

```typescript
// Fastify compiles serializers at startup for optimal performance
// by default it uses fast-json-stringify

// Custom serializer
app.setSerializerCompiler(({ schema, method, url, httpPart }) => {
  return (data) => {
    // Custom serialization logic
    return JSON.stringify(data);
  };
});
```

## AJV Configuration

```typescript
// Customize AJV validation
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const app = Fastify({
  ajv: {
    customOptions: {
      coerceTypes: true,        // Auto-coerce types
      removeAdditional: true,    // Strip unknown properties
      useDefaults: true,         // Apply default values
      allErrors: true,           // Return all errors
    },
    plugins: [addFormats],
  },
});
```

## Validation Performance

| Approach | Validation | Serialization | Type Safety |
|----------|-----------|---------------|-------------|
| JSON Schema (AJV) | ✅ Fast | ✅ Fast | ⚠️ Generated |
| TypeBox | ✅ Fast | ✅ Fast | ✅ Native |
| Zod | ⚠️ Slower | ❌ Manual | ✅ Native |
| Joi | ⚠️ Slower | ❌ Manual | ⚠️ Generated |
