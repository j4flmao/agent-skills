# Fastify Hook Reference

## Hook Lifecycle

Fastify hooks execute in a defined order during request processing.

```typescript
import Fastify, { FastifyInstance } from 'fastify';

const app = Fastify({ logger: true });

// 1. onRequest — first hook, executes before body parsing
app.addHook('onRequest', async (request, reply) => {
  request.startTime = Date.now();
  request.requestId = crypto.randomUUID();
  reply.header('X-Request-Id', request.requestId);
});

// 2. preParsing — before body parsing
app.addHook('preParsing', async (request, reply, payload) => {
  // Transform or validate raw payload
  return payload;
});

// 3. preValidation — before schema validation
app.addHook('preValidation', async (request, reply) => {
  // Check authentication before validation
});

// 4. preHandler — after validation, before route handler
app.addHook('preHandler', async (request, reply) => {
  // Authorization checks
});

// 5. Route handler executes here

// 6. preSerialization — before response serialization
app.addHook('preSerialization', async (request, reply, payload) => {
  // Transform response before serialization
  return payload;
});

// 7. onSend — before sending response
app.addHook('onSend', async (request, reply, payload) => {
  // Log response, add headers
  return payload;
});

// 8. onResponse — after response sent
app.addHook('onResponse', async (request, reply) => {
  // Log metrics
});
```

## Authentication Hook

```typescript
import jwt from '@fastify/jwt';

app.register(jwt, { secret: process.env.JWT_SECRET! });

app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.status(401).send({ code: 'UNAUTHORIZED', message: 'Invalid token' });
  }
});

// Apply globally
app.addHook('preHandler', async (request, reply) => {
  if (request.url.startsWith('/api/protected')) {
    await app.authenticate(request, reply);
  }
});

// Or per-route
app.get('/api/orders', {
  preHandler: [app.authenticate],
}, async (request, reply) => {
  return orderService.findAll();
});
```

## Rate Limiting Hook

```typescript
import rateLimit from '@fastify/rate-limit';

app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
  keyGenerator: (request) => {
    return request.ip;
  },
  errorResponseBuilder: (request, context) => ({
    code: 'RATE_LIMIT',
    message: `Rate limit exceeded. Max ${context.max} requests per ${context.after}`,
  }),
});
```

## Request Validation Hook

```typescript
import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';

app.withTypeProvider<ZodTypeProvider>();

app.post('/api/orders', {
  schema: {
    body: z.object({
      customerId: z.string().uuid(),
      items: z.array(z.object({
        sku: z.string(),
        quantity: z.number().int().positive(),
      })).min(1),
    }),
  },
}, async (request, reply) => {
  return orderService.create(request.body);
});
```

## Logging Hook

```typescript
app.addHook('onRequest', async (request) => {
  request.log.info({ url: request.url, method: request.method }, 'incoming request');
});

app.addHook('onResponse', async (request, reply) => {
  const duration = Date.now() - request.startTime;
  request.log.info({
    statusCode: reply.statusCode,
    duration,
  }, 'request completed');
});
```

## Error Handling Hook

```typescript
app.setErrorHandler(async (error, request, reply) => {
  request.log.error(error);

  if (error.statusCode) {
    return reply.status(error.statusCode).send({
      code: error.code || 'ERROR',
      message: error.message,
    });
  }

  reply.status(500).send({
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  });
});

app.setNotFoundHandler(async (request, reply) => {
  reply.status(404).send({
    code: 'NOT_FOUND',
    message: `Route ${request.method} ${request.url} not found`,
  });
});
```

## Encapsulation with Plugins

```typescript
// Hooks are encapsulated within plugin scope
async function adminPlugin(app: FastifyInstance) {
  app.addHook('preHandler', async (request, reply) => {
    if (!request.user?.roles.includes('admin')) {
      reply.status(403).send({ code: 'FORBIDDEN' });
    }
  });

  app.get('/admin/users', async () => {
    return adminService.listUsers();
  });
}

app.register(adminPlugin, { prefix: '/api' });
```

## Key Points

- Hooks execute in defined lifecycle order: onRequest → preParsing → preValidation → preHandler → handler → preSerialization → onSend → onResponse
- Authentication hooks should run in preHandler before route logic
- Rate limiting prevents abuse at the request level
- Schema validation hooks validate and transform payloads
- Logging hooks capture request/response metrics
- Error hook provides centralized error handling
- Not-found hook returns consistent 404 responses
- Plugin-scoped hooks only affect routes within that plugin
- Decorators share functions across hooks and handlers
- Hooks can short-circuit requests with early responses
