# Fastify Setup

## Basic Server
```typescript
import Fastify from 'fastify';

const app = Fastify({ logger: true });

app.get('/health', async () => ({ status: 'ok' }));

await app.listen({ port: 3000 });
```

## Plugins
```typescript
import fastifySwagger from '@fastify/swagger';
import fastifyCors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';

await app.register(fastifyCors, { origin: '*' });
await app.register(fastifyJwt, { secret: process.env.JWT_SECRET! });
await app.register(fastifySwagger, { openapi: { info: { title: 'API', version: '1.0.0' } } });
```

## Hooks
```typescript
app.addHook('preHandler', async (req, reply) => {
  try { await req.jwtVerify(); }
  catch { reply.status(401).send({ error: 'Unauthorized' }); }
});
app.addHook('onError', async (req, reply, error) => {
  reply.status(500).send({ error: 'Internal Server Error' });
});
```

## Validation
```typescript
const schema = {
  body: {
    type: 'object',
    required: ['email'],
    properties: { email: { type: 'string', format: 'email' } }
  }
};
app.post('/users', { schema }, async (req, reply) => { ... });
```
