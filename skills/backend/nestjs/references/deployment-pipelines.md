# NestJS Deployment Pipelines: Build, Container, CI/CD, Runtime

Shipping a NestJS service: production build, a small non-root container image, a CI pipeline, and runtime concerns (health checks, graceful shutdown, migrations).

## Production Build

```bash
npm ci
npm run build          # nest build -> dist/
npm prune --omit=dev   # drop devDependencies before packaging
node dist/main.js
```

`nest build` uses `tsc` by default; `"builder": "swc"` in `nest-cli.json` speeds builds. Webpack bundling (`--webpack`) is optional and mainly useful for monorepo apps.

## Dockerfile (multi-stage)

```dockerfile
# syntax=docker/dockerfile:1
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/package.json ./
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

Notes:
- Run `node` directly, not `npm start`, so SIGTERM reaches the process.
- Use an LTS Node version (even-numbered); pin the minor/digest in production.
- Add a `.dockerignore` with `node_modules`, `dist`, `.git`, `.env*`.
- Distroless (`gcr.io/distroless/nodejs22-debian12`) is an option for a smaller attack surface.

## Health Checks with Terminus

```typescript
// health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator, MemoryHealthIndicator } from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(private health: HealthCheckService, private db: TypeOrmHealthIndicator, private mem: MemoryHealthIndicator) {}

  @Get('live')
  @HealthCheck()
  live() { return this.health.check([]); }

  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([
      () => this.db.pingCheck('database', { timeout: 1500 }),
      () => this.mem.checkHeap('heap', 512 * 1024 * 1024),
    ]);
  }
}
```

Liveness must not check dependencies (a DB outage would restart every pod); readiness should.

## Graceful Shutdown

```typescript
// main.ts
const app = await NestFactory.create(AppModule, { bufferLogs: true });
app.enableShutdownHooks();  // enables OnModuleDestroy / OnApplicationShutdown on SIGTERM
await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
```

Implement `onApplicationShutdown()` to close queues and consumers. In Kubernetes, set `terminationGracePeriodSeconds` longer than the longest in-flight request, and optionally a short `preStop` sleep so the endpoint is removed from load balancers before the process stops.

## GitHub Actions Pipeline

```yaml
name: ci
on:
  push: { branches: [main] }
  pull_request:

permissions:
  contents: read
  packages: write

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:17
        env: { POSTGRES_PASSWORD: test, POSTGRES_DB: app_test }
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready --health-interval 5s --health-retries 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npm run test -- --ci
      - run: npm run test:e2e
        env: { DATABASE_URL: postgres://postgres:test@localhost:5432/app_test }

  image:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with: { registry: ghcr.io, username: '${{ github.actor }}', password: '${{ secrets.GITHUB_TOKEN }}' }
      - uses: docker/build-push-action@v6
        with:
          push: true
          tags: ghcr.io/${{ github.repository }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

Tag images with the commit SHA (immutable); promote the same image across environments instead of rebuilding.

## Database Migrations

Run migrations as a separate step, not on app boot with multiple replicas racing:
- Kubernetes `Job` or Helm pre-upgrade hook running `npx typeorm migration:run -d dist/data-source.js` or `npx prisma migrate deploy`.
- Keep migrations backward compatible (expand -> deploy -> contract) so old and new pods can coexist during a rolling update.
- Never use `synchronize: true` outside local development.

## Kubernetes Deployment Essentials

```yaml
containers:
  - name: api
    image: ghcr.io/acme/api:3f2c1ab
    ports: [{ containerPort: 3000 }]
    envFrom: [{ secretRef: { name: api-secrets } }]
    resources:
      requests: { cpu: 250m, memory: 256Mi }
      limits: { memory: 512Mi }
    readinessProbe: { httpGet: { path: /health/ready, port: 3000 }, periodSeconds: 5 }
    livenessProbe: { httpGet: { path: /health/live, port: 3000 }, periodSeconds: 10, failureThreshold: 3 }
    securityContext: { runAsNonRoot: true, readOnlyRootFilesystem: true, allowPrivilegeEscalation: false }
```

Set `NODE_OPTIONS=--max-old-space-size` to roughly 75% of the memory limit so V8 collects before the container is OOM-killed.

## Deployment Strategy Options

| Strategy | When |
|----------|------|
| Rolling update | Default; requires backward-compatible schema and API |
| Blue/green | Instant rollback needed; double capacity briefly |
| Canary (Argo Rollouts, Flagger) | Risky changes; metric-gated promotion |

## Pitfalls

- `npm start` as PID 1: signals not forwarded, abrupt kills.
- Migrations in `main.ts` with several replicas.
- `.env` baked into the image.
- Liveness probe hitting the database.
- Rebuilding per environment so prod runs an untested artifact.

## Checklist

- [ ] Multi-stage image, non-root, no dev dependencies
- [ ] `enableShutdownHooks()` and tuned grace period
- [ ] Separate liveness/readiness endpoints
- [ ] Migrations run as a job, backward compatible
- [ ] Image tagged by SHA and promoted unchanged
- [ ] Secrets injected at runtime from a secret store
