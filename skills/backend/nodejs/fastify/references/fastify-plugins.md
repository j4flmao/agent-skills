# Fastify Plugins

## Plugin Architecture

Fastify plugins are encapsulated. Each plugin creates a child context that inherits from parent but isolates its own decorators, hooks, and schemas.

```typescript
import { FastifyPluginAsync } from 'fastify';

// Encapsulated plugin
export const myPlugin: FastifyPluginAsync = async (fastify, opts) => {
  // Decorators/hooks here only affect this plugin and its children
  fastify.decorate('myService', new MyService());
  fastify.addHook('onRequest', async (req, reply) => {
    // Runs for routes in this scope
  });
};
```

## Creating Plugins

```typescript
// Database plugin
import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';

export interface DbPluginOptions {
  url: string;
}

declare module 'fastify' {
  interface FastifyInstance {
    db: PrismaClient;
  }
}

export const dbPlugin = fp<DbPluginOptions>(async (fastify, opts) => {
  const prisma = new PrismaClient({
    datasources: { db: { url: opts.url } },
  });

  await prisma.$connect();

  fastify.decorate('db', prisma);

  fastify.addHook('onClose', async () => {
    await prisma.$disconnect();
  });
});

// Usage
app.register(dbPlugin, { url: process.env.DATABASE_URL! });
```

## Official Plugins

```typescript
import Fastify from 'fastify';

const app = Fastify({ logger: true });

// CORS
await app.register(import('@fastify/cors'), {
  origin: ['https://app.example.com'],
  credentials: true,
});

// Rate limiting
await app.register(import('@fastify/rate-limit'), {
  max: 100,
  timeWindow: '1 minute',
});

// Swagger/OpenAPI
await app.register(import('@fastify/swagger'), {
  openapi: { info: { title: 'API', version: '1.0.0' } },
});
await app.register(import('@fastify/swagger-ui'), {
  routePrefix: '/docs',
});

// JWT auth
await app.register(import('@fastify/jwt'), {
  secret: process.env.JWT_SECRET!,
});

// Compression
await app.register(import('@fastify/compress'), {
  global: true,
});

// Multipart
await app.register(import('@fastify/multipart'), {
  limits: { fileSize: 10 * 1024 * 1024 },
});
```

## Plugin Encapsulation

```typescript
// Parent plugin
app.register(async function parent(fastify) {
  fastify.decorate('utility', new Utility());

  // Child inherits parent's decorators
  fastify.register(async function child(fastify) {
    fastify.get('/child', async () => {
      return { utility: fastify.utility.hello() };
    });
  });
});

// Outside — no access to 'utility'
// ❌ app.utility is undefined
```

## Breaking Encapsulation

```typescript
// Use fastify-plugin to break encapsulation
import fp from 'fastify-plugin';

export const sharedPlugin = fp(async (fastify) => {
  fastify.decorate('shared', new SharedService());
});
// No parent needed — available everywhere
```

## Plugin with Options Schema

```typescript
export interface MetricsPluginOptions {
  port?: number;
  route?: string;
}

const metricsPlugin: FastifyPluginAsync<MetricsPluginOptions> = async (fastify, opts) => {
  const port = opts.port || 9090;
  const route = opts.route || '/metrics';

  fastify.get(route, async () => {
    return { memory: process.memoryUsage(), uptime: process.uptime() };
  });
};

// Invalid options will throw at registration
app.register(metricsPlugin, { port: 'invalid' }); // Type error
```

## Plugin Dependency

```typescript
// Plugin A
export const pluginA = fp(async (fastify) => {
  fastify.decorate('pluginA', { name: 'A' });
});

// Plugin B depends on A
export const pluginB = fp(async (fastify) => {
  fastify.decorate('pluginB', {
    name: 'B',
    dependency: fastify.pluginA, // Use pluginA's decorator
  });
}, { dependencies: ['pluginA'] });

// Registration order
app.register(pluginA);
app.register(pluginB); // pluginB requires pluginA
```

## Plugin Testing

```typescript
import { test } from 'vitest';
import Fastify from 'fastify';
import { dbPlugin } from '../plugins/db';

test('db plugin connects', async () => {
  const app = Fastify();

  await app.register(dbPlugin, {
    url: process.env.TEST_DATABASE_URL || 'postgres://localhost/test',
  });

  await app.ready();

  expect(app.db).toBeDefined();
  expect(app.db.$connect).toBeDefined();

  await app.close();
});
```

## Plugin Selection Guide

| Plugin | Purpose | Official |
|--------|---------|----------|
| @fastify/cors | CORS headers | ✅ |
| @fastify/helmet | Security headers | ✅ |
| @fastify/rate-limit | Rate limiting | ✅ |
| @fastify/swagger | OpenAPI docs | ✅ |
| @fastify/jwt | JWT auth | ✅ |
| @fastify/multipart | File uploads | ✅ |
| @fastify/compress | Response compression | ✅ |
| @fastify/redis | Redis client | ✅ |
| @fastify/postgres | PostgreSQL | ✅ |
| @fastify/session | Sessions | ✅ |
