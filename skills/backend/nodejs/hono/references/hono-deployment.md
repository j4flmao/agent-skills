# Hono Deployment

## Multi-Runtime Entry Points

```typescript
// Cloudflare Workers
import app from './app';
export default { fetch: app.fetch };

// Deno
import app from './app.ts';
Deno.serve({ port: 3000 }, app.fetch);

// Bun
import app from './app';
export default { port: 3000, fetch: app.fetch };

// Node.js
import { serve } from '@hono/node-server';
import app from './app';
serve({ fetch: app.fetch, port: 3000 });
```

## Cloudflare Workers

```toml
# wrangler.toml
name = "order-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

[env.production]
name = "order-api-prod"
routes = [{ pattern = "api.example.com/*", zone_id = "..." }]
```

```bash
# Deploy
npx wrangler deploy
npx wrangler deploy --env production

# Dev
npx wrangler dev
npx wrangler dev --remote
```

## Docker Deployment

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
EXPOSE 3000
USER node
CMD ["node", "dist/index.js"]
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
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/health"]
```

## Platform Deployments

| Platform | Runtime | Method |
|----------|---------|--------|
| **Cloudflare Workers** | Workerd | `wrangler deploy` |
| **Deno Deploy** | Deno | `deployctl deploy` |
| **Bun** | Bun | Docker / binary |
| **Node.js** | Node | Docker / PM2 |
| **Vercel** | Edge | `@vercel/hono` adapter |
| **AWS Lambda** | Node | `@hono/aws-lambda` adapter |
| **Fly.io** | Any | Docker deploy |

## Environment Configuration

```typescript
// Cloudflare Workers — use env bindings
type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get('/orders', async (c) => {
  const db = c.env.DB;
  const result = await db.prepare('SELECT * FROM orders').all();
  return c.json(result);
});

// Node.js / Bun — use process.env
const app = new Hono();
const port = parseInt(process.env.PORT || '3000');
```

## CI/CD Pipeline

```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run test
      - name: Deploy to Cloudflare
        run: npx wrangler deploy --env production
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
```

## Production Optimizations

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { csrf } from 'hono/csrf';
import { secureHeaders } from 'hono/secure-headers';
import { logger } from 'hono/logger';
import { compress } from 'hono/compress';
import { etag } from 'hono/etag';

const app = new Hono();

// Production middleware
app.use('*', cors({
  origin: process.env.CORS_ORIGIN?.split(',') || [],
  credentials: true,
}));
app.use('*', csrf());
app.use('*', secureHeaders());
app.use('*', logger());
app.use('*', compress());
app.use('*', etag());

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'healthy', timestamp: new Date().toISOString() });
});
```

## Graceful Shutdown

```typescript
// Node.js
import { serve } from '@hono/node-server';

const server = serve({ fetch: app.fetch, port: 3000 });

process.on('SIGTERM', () => {
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Bun
export default {
  port: 3000,
  fetch: app.fetch,
};
```

## Adapter Pattern

```typescript
// Write runtime-agnostic logic
const app = new Hono();

// Use env-agnostic helpers
app.get('/env', (c) => {
  const port = c.env?.PORT || process.env.PORT || '3000';
  return c.json({ port });
});

// Runtime-specific entry points handle adapters
// src/index.node.ts
import { serve } from '@hono/node-server';
serve({ fetch: app.fetch, port: 3000 });

// src/index.cloudflare.ts
export default { fetch: app.fetch };
```
