# Deno Deployment

## Deno Deploy

```typescript
// entrypoint.ts — Deno Deploy entry
import { serve } from 'https://deno.land/std@0.220.0/http/server.ts';

serve((req) => {
  const url = new URL(req.url);
  if (url.pathname === '/health') {
    return new Response(JSON.stringify({ status: 'ok' }), {
      headers: { 'content-type': 'application/json' },
    });
  }
  return app.fetch(req);
});
```

| Feature | Deno Deploy | Self-hosted |
|---------|-------------|-------------|
| Cold start | ~5ms | ~100ms+ |
| Regions | 35+ | Configurable |
| Max CPU | 2 vCPU | Unlimited |
| Memory | 128 MB | Configurable |
| Pricing | Free tier + usage | Server cost |
| Cron | Built-in | systemd/cron |

## Docker Deployment

```dockerfile
FROM denoland/deno:alpine-2.0
WORKDIR /app
COPY deno.json .
COPY src/ ./src/
RUN deno cache src/main.ts
EXPOSE 8000
CMD ["deno", "run", "--allow-net", "--allow-read", "--allow-env", "src/main.ts"]
```

```yaml
# docker-compose.yml
services:
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DENO_ENV=production
      - PORT=8000
      - DATABASE_URL=postgres://user:pass@db:5432/app
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 3s
```

## Compile to Binary

```bash
# Single binary — no runtime needed
deno compile --allow-net --allow-read --allow-env --output dist/server src/main.ts

# Cross-compile
deno compile --target x86_64-unknown-linux-gnu --output dist/server-linux src/main.ts
deno compile --target x86_64-pc-windows-msvc --output dist/server.exe src/main.ts
deno compile --target aarch64-apple-darwin --output dist/server-macos src/main.ts

# Stripped binary
deno compile --no-check --output dist/server src/main.ts
```

## CI/CD

```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: denoland/setup-deno@v1
        with:
          deno-version: v2.x
      - run: deno lint
      - run: deno fmt --check
      - run: deno check src/main.ts
      - run: deno test --allow-net --allow-read --allow-env
      - run: deno compile --allow-net --allow-read --allow-env --output dist/server src/main.ts
```

## Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /health {
        access_log off;
        return 200;
    }
}
```

## Production Config

```typescript
// src/config.ts
export function loadConfig() {
  return {
    port: parseInt(Deno.env.get('PORT') || '8000'),
    databaseUrl: Deno.env.get('DATABASE_URL'),
    corsOrigin: Deno.env.get('CORS_ORIGIN')?.split(',') || ['http://localhost:3000'],
    logLevel: Deno.env.get('LOG_LEVEL') || 'info',
    isProduction: Deno.env.get('DENO_ENV') === 'production',
    redisUrl: Deno.env.get('REDIS_URL'),
    jwtSecret: Deno.env.get('JWT_SECRET'),
  };
}
```

## Platform Deployments

| Platform | Method | Notes |
|----------|--------|-------|
| **Deno Deploy** | `deployctl deploy` | Built for Deno, edge runtime |
| **Fly.io** | Docker deploy | Use denoland/deno image |
| **Railway** | GitHub auto-deploy | Auto-detect Deno |
| **Render** | Docker deploy | Custom start command |
| **AWS Lambda** | Custom runtime | Use deno-lambda layer |
| **DigitalOcean** | Docker App Platform | Dockerfile deploy |
| **Vercel** | Edge functions | Limited Deno support |
| **Kubernetes** | Docker image | Scale with K8s |

## Graceful Shutdown

```typescript
import { serve } from 'std/http/server.ts';

const ac = new AbortController();

Deno.addSignalListener('SIGTERM', () => {
  console.log('Shutting down...');
  ac.abort();
});

serve((req) => app.fetch(req), { signal: ac.signal, port: 8000 });
```

## Health Checks

```typescript
serve((req) => {
  const url = new URL(req.url);
  if (url.pathname === '/health') {
    const healthy = dbConnected();
    return new Response(
      JSON.stringify({ status: healthy ? 'healthy' : 'unhealthy' }),
      { status: healthy ? 200 : 503, headers: { 'content-type': 'application/json' } }
    );
  }
  return handler(req);
});
```
