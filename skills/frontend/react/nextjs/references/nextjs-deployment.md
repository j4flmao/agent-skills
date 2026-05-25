# Next.js Deployment

## Deployment Platforms

| Platform | Features | Best For |
|----------|----------|----------|
| Vercel | ISR, Edge Functions, Analytics | Default choice |
| AWS Amplify | Full AWS integration | AWS-native stacks |
| Docker + Cloud Run | Containerized, portable | Custom infra |
| Self-hosted Node | Full control | Compliance, air-gapped |
| Static export | No server needed | JAMStack, docs sites |

## Build Optimization

```typescript
// next.config.ts
import type { NextConfig } from 'next'

const config: NextConfig = {
  output: 'standalone',  // Smaller Docker image

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },

  // Bundle analysis
  productionBrowserSourceMaps: false,

  // Compression
  compress: true,
}

export default config
```

## Docker Deployment

```dockerfile
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
```

## Environment Configuration

| Variable | Required | Purpose | Example |
|----------|----------|---------|---------|
| DATABASE_URL | Yes | Database connection | postgresql://... |
| NEXTAUTH_SECRET | Yes | Auth encryption | openssl rand -base64 32 |
| NEXTAUTH_URL | Yes | Auth callback URL | https://example.com |
| NEXT_PUBLIC_API_URL | No | Client-side API URL | https://api.example.com |

### Server vs Public Env Vars
```typescript
// Server-only (never exposed to client)
const serverVar = process.env.DATABASE_URL

// Public (bundled into client JS — prefix with NEXT_PUBLIC_)
const publicVar = process.env.NEXT_PUBLIC_API_URL
```

## Performance Monitoring

| Metric | Tool | Target |
|--------|------|--------|
| LCP | Lighthouse / Web Vitals | < 2.5s |
| INP | Lighthouse / Web Vitals | < 200ms |
| CLS | Lighthouse / Web Vitals | < 0.1 |
| TTFB | Server monitoring | < 600ms |
| Build time | CI pipeline | < 10 min |
| Bundle size | next/bundle-analyzer | < 200KB (critical) |

## CI/CD Pipeline

```yaml
name: Deploy Next.js
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run lint
      - run: npm run build
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```
