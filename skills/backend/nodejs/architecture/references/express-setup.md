# Express Setup Reference

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use('/api/v1', routes);
app.use(errorHandler);
app.listen(3000);
```

# Fastify Setup Reference

```typescript
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';

const app = Fastify({ logger: true });
await app.register(cors);
await app.register(helmet);
await app.register(routes, { prefix: '/api/v1' });
await app.listen({ port: 3000 });
```
