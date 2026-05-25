# Elysia Deployment

## Production Build

```bash
# Build for Bun target
bun build src/index.ts --outdir ./dist --target bun

# Minified production build
bun build src/index.ts --outdir ./dist --target bun --minify

# Compile to single binary
bun build src/index.ts --compile --outfile ./dist/server

# Run compiled binary
./dist/server
```

## Docker Deployment

```dockerfile
FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun build src/index.ts --outdir ./dist --target bun

FROM oven/bun:1-slim
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
ENV NODE_ENV=production
EXPOSE 3000
USER bun
CMD ["bun", "run", "dist/index.js"]
```

```yaml
# docker-compose.yml
services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgres://user:pass@db:5432/app
      - JWT_SECRET=${JWT_SECRET}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 3s
      retries: 3
```

## Production Server Configuration

```typescript
// src/index.ts — production entry
import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { compression } from '@elysiajs/compression';
import { swagger } from '@elysiajs/swagger';
import { rateLimit } from '@elysiajs/rate-limit';

const app = new Elysia()
  .use(compression())
  .use(cors({
    origin: process.env.CORS_ORIGIN?.split(',') || [],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  }))
  .use(rateLimit({ max: 100, duration: 60000 }))
  .get('/health', () => ({ status: 'healthy', timestamp: new Date().toISOString() }))
  .listen(process.env.PORT || 3000);

console.log(`Server running on port ${app.server?.port}`);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  app.stop();
  await db.close();
  process.exit(0);
});
```

## Environment Configuration

```typescript
// src/config.ts
import { t } from 'elysia';

export const env = t.Object({
  PORT: t.String({ default: '3000' }),
  NODE_ENV: t.String({ default: 'development' }),
  DATABASE_URL: t.String(),
  JWT_SECRET: t.String(),
  CORS_ORIGIN: t.Optional(t.String()),
  LOG_LEVEL: t.String({ default: 'info' }),
});

export type Env = typeof env.static;

export function loadConfig(): Env {
  return {
    PORT: process.env.PORT || '3000',
    NODE_ENV: process.env.NODE_ENV || 'development',
    DATABASE_URL: process.env.DATABASE_URL!,
    JWT_SECRET: process.env.JWT_SECRET!,
    CORS_ORIGIN: process.env.CORS_ORIGIN,
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  };
}
```

## CI/CD Pipeline

```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  test-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install --frozen-lockfile
      - run: bun test
      - run: bun run build
      - name: Deploy to Fly.io
        run: flyctl deploy --remote-only
```

## Platform Deployments

| Platform | Method | Notes |
|----------|--------|-------|
| **Fly.io** | `flyctl launch` | Native Bun, auto-detect Elysia |
| **Railway** | GitHub deploy | Auto-detect Bun |
| **Render** | Docker deploy | Use oven/bun image |
| **Vercel** | Edge functions | Elysia via Bun runtime |
| **AWS ECS** | Docker | Fargate/EC2 with load balancer |
| **DigitalOcean** | App Platform | Dockerfile deploy |
| **Kubernetes** | Helm/Docker | Scale with HPA |
| **Self-hosted** | Binary/systemd | Compile & run binary |

## Health Checks

```typescript
app.get('/health', async ({ db }) => {
  try {
    await db.$queryRaw`SELECT 1`;
    return {
      status: 'healthy',
      uptime: process.uptime(),
      database: 'connected',
      timestamp: new Date().toISOString(),
    };
  } catch {
    return new Response(
      JSON.stringify({ status: 'unhealthy', database: 'disconnected' }),
      { status: 503, headers: { 'content-type': 'application/json' } }
    );
  }
});
```

## Production Middleware

```typescript
// Helmet-like security headers
app.onAfterHandle(({ headers }) => {
  headers['X-Content-Type-Options'] = 'nosniff';
  headers['X-Frame-Options'] = 'DENY';
  headers['X-XSS-Protection'] = '1; mode=block';
  headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
});

// Request logging
app.onRequest(({ request, store }) => {
  store.startTime = performance.now();
});

app.onResponse(({ request, set, store }) => {
  const duration = performance.now() - store.startTime;
  console.log(JSON.stringify({
    method: request.method,
    path: new URL(request.url).pathname,
    status: set.status,
    duration: `${duration.toFixed(2)}ms`,
  }));
});
```

## Monitoring

```typescript
// OpenTelemetry tracing
import { otel } from '@elysiajs/opentelemetry';

app.use(otel({
  serviceName: 'order-service',
  exporter: { url: 'http://otel-collector:4318/v1/traces' },
}));
```
