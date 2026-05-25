# Prisma Deployment

## Build Pipeline

```bash
# 1. Generate Prisma Client
npx prisma generate

# 2. Run migrations
npx prisma migrate deploy

# 3. Build application
npm run build

# 4. Start
npm start
```

## Docker Deployment

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
```

```yaml
# docker-compose.yml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: "postgresql://user:pass@db:5432/app?schema=public"
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: ${DB_PASS}
      POSTGRES_DB: app
    healthcheck:
      test: ["CMD-SHELL", "pg_isready"]
      interval: 5s
      timeout: 5s
      retries: 5
```

## Migration Strategy

```bash
# Development
npx prisma migrate dev --name add-order-status

# Staging/Production
npx prisma migrate deploy

# Safe migration pattern:
# 1. Add nullable column (non-breaking)
npx prisma migrate dev --name add-customer-phone
# 2. Backfill data
npx prisma db execute --file ./scripts/backfill-phone.sql
# 3. Make required (second deployment)
npx prisma migrate dev --name make-phone-required
```

## Environment Configuration

```env
# Production
DATABASE_URL="postgresql://user:pass@prod-host:5432/app?connection_limit=10&pool_timeout=10"
SHADOW_DATABASE_URL="postgresql://user:pass@shadow-host:5432/app-shadow"

# With PgBouncer (serverless)
DATABASE_URL="postgresql://user:pass@host:6543/app?pgbouncer=true&connection_limit=5"
```

## Prisma + Serverless

```typescript
// Cloudflare Workers
import { PrismaClient } from '@prisma/client/edge';
import { withAccelerate } from '@prisma/extension-accelerate';

const prisma = new PrismaClient().$extends(withAccelerate());

export default {
  async fetch(request: Request): Promise<Response> {
    const users = await prisma.user.findMany();
    return Response.json(users);
  },
};
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
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx prisma generate
      - run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/postgres
      - run: npm test
      - run: npm run build
```

## Connection Pool Sizing

| Workload | Connections | PgBouncer Mode |
|----------|-------------|----------------|
| Low (<100 req/s) | 5-10 | Transaction |
| Medium (100-1000 req/s) | 10-25 | Transaction |
| High (>1000 req/s) | 25-50 | Transaction |
| Serverless | 1-5 per instance | Transaction |

## Error Handling

```typescript
import { Prisma } from '@prisma/client';

try {
  await prisma.user.create({ data });
} catch (err) {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      // Unique constraint violation
      throw new ConflictError('Email already exists');
    }
    if (err.code === 'P2025') {
      // Record not found
      throw new NotFoundError('User', id);
    }
  }
  throw err;
}
```

## Prisma Accelerate

```bash
npm install @prisma/extension-accelerate
```

```typescript
import { PrismaClient } from '@prisma/client/edge';
import { withAccelerate } from '@prisma/extension-accelerate';

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
}).$extends(withAccelerate());

// Accelerate provides:
// - Global cache with configurable TTL
// - Connection pooling at edge
// - Query result caching
```
