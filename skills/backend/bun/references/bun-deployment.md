# Bun Deployment

## Docker Deployment

```dockerfile
# Multi-stage Dockerfile
FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun build src/index.ts --outdir dist --target bun

FROM oven/bun:1-slim AS production
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
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgres://user:pass@db:5432/app
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 3s
      retries: 3
```

## Binary Compilation

```bash
# Compile to single binary
bun build src/index.ts --compile --outfile dist/server

# With compression
bun build src/index.ts --compile --minify --outfile dist/server

# Run without Node.js/Bun
./dist/server
```

**Benefits**: Zero runtime dependencies, faster startup, smaller container images.

## Production Configuration

```typescript
// src/config.ts
export const config = {
  port: parseInt(process.env.PORT || '3000'),
  hostname: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  corsOrigin: process.env.CORS_ORIGIN?.split(',') || [],
  logLevel: process.env.LOG_LEVEL || 'info',
};

// Production server
const server = Bun.serve({
  port: config.port,
  hostname: config.hostname,
  fetch: app.fetch,
  idleTimeout: 30,
  maxRequestBodySize: 10 * 1024 * 1024, // 10MB
});
```

## Process Management

```bash
# Using PM2 with Bun
npm install -g pm2
pm2 start bun --name "app" -- run dist/index.js
pm2 save
pm2 startup

# Systemd service
# /etc/systemd/system/bun-app.service
[Service]
Type=simple
User=bun
WorkingDirectory=/opt/app
ExecStart=/usr/local/bin/bun run dist/index.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
```

## Environment-specific Config

```bash
# .env.production
PORT=3000
HOST=0.0.0.0
NODE_ENV=production
DATABASE_URL=postgres://user:pass@prod-db:5432/app
CORS_ORIGIN=https://app.example.com
LOG_LEVEL=warn

# .env.development  
PORT=3000
HOST=localhost
NODE_ENV=development
DATABASE_URL=postgres://user:pass@localhost:5432/app
LOG_LEVEL=debug
```

## CI/CD Pipeline (GitHub Actions)

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
| **Fly.io** | `flyctl launch` | Native Bun support |
| **Railway** | GitHub deploy | Auto-detect Bun |
| **Render** | Docker deploy | Use oven/bun image |
| **Vercel** | `@vercel/bun` | Edge functions |
| **AWS ECS** | Docker | Fargate or EC2 |
| **DigitalOcean** | Docker | App Platform |
| **Self-hosted** | Binary/systemd | Compile to binary |

## Health Checks

```typescript
// /health endpoint
Bun.serve({
  port: 3000,
  fetch(req) {
    if (new URL(req.url).pathname === '/health') {
      return Response.json({
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      });
    }
    return app.fetch(req);
  },
});
```

## Graceful Shutdown

```typescript
const server = Bun.serve({ fetch: app.fetch, port: 3000 });

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  server.stop();
  await db.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT');
  server.stop();
  process.exit(0);
});
```

## Logging & Monitoring

```typescript
// Structured logging with built-in console
const logger = {
  info: (msg: string, ctx?: Record<string, unknown>) =>
    console.log(JSON.stringify({ level: 'info', msg, ...ctx })),
  error: (msg: string, err?: Error) =>
    console.error(JSON.stringify({ level: 'error', msg, error: err?.message, stack: err?.stack })),
};
```
