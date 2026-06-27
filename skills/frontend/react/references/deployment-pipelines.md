# React Deployment Pipelines & CI/CD

Modern React applications require robust deployment strategies that ensure high availability, fast delivery, and reliable rollbacks.

## Table of Contents
1. [Hosting Strategies: PaaS vs Docker](#hosting-strategies)
2. [CI/CD Workflows with GitHub Actions](#cicd-workflows)
3. [PR Preview Environments](#pr-preview-environments)
4. [CDN Edge Caching Strategies](#cdn-edge-caching)
5. [Blue-Green and Canary Deployments](#deployment-strategies)

---

## 1. Hosting Strategies: PaaS vs Docker

### PaaS (Vercel / Netlify)
**Best For:** Next.js, Gatsby, or SPAs where time-to-market is critical and you want zero-config Edge Network integration.
- **Pros:** Built-in CI/CD, automatic preview deployments, edge caching, serverless/edge functions out of the box.
- **Cons:** Vendor lock-in, can become expensive at scale, limited control over underlying infrastructure.

### Custom Docker Deployments (AWS/GCP/Kubernetes)
**Best For:** Enterprise applications with strict compliance, complex backend integrations, or heavy background processing.
- **Pros:** Full control, predictable pricing, agnostic infrastructure.
- **Cons:** High DevOps overhead, requires manual setup of CDN, caching, and CI/CD.

#### Example Next.js Dockerfile (Standalone Mode)
```dockerfile
# Build Stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production Stage
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production

# Next.js standalone mode reduces image size significantly
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
```

---

## 2. CI/CD Workflows with GitHub Actions

A standard React pipeline should include linting, type checking, testing, and building.

```yaml
# .github/workflows/ci.yml
name: React CI Pipeline

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Code Quality (Lint & Prettier)
        run: npm run lint

      - name: Type Check
        run: npm run typecheck # e.g., tsc --noEmit

      - name: Run Unit Tests
        run: npm run test:ci

      - name: Build Project
        run: npm run build
```

---

## 3. PR Preview Environments

Preview environments deploy your application for every Pull Request, allowing product managers and QA to test features before they merge.
- **Vercel/Netlify:** Provided automatically.
- **Docker/Kubernetes:** Requires custom CI logic (e.g., building an image tagged with the PR number, deploying to a temporary namespace, and mapping a dynamic route).

---

## 4. CDN Edge Caching Strategies

For SSR applications (Next.js/Remix), managing the CDN cache is vital to balance performance and data freshness.

### Cache-Control Headers
- `s-maxage`: Directs the CDN how long to cache the response.
- `stale-while-revalidate`: Serves the stale cache to the user while asynchronously fetching a fresh copy in the background.

```javascript
// Next.js API Route example
export default function handler(req, res) {
  res.setHeader(
    'Cache-Control',
    'public, s-maxage=60, stale-while-revalidate=300'
  );
  res.status(200).json({ data: 'This is fast!' });
}
```

---

## 5. Blue-Green and Canary Deployments

### Blue-Green
Maintains two identical production environments (Blue and Green). Traffic routes to Blue. Green receives the new deployment. Once verified, traffic is switched 100% to Green. Rollback is instant.

### Canary Deployments
Gradually shifts traffic (e.g., 5%, then 20%, then 100%) to the new version. Monitors errors and performance during the rollout.

**Implementing in Vercel:**
Canary deployments can be simulated using Edge Middleware to route a percentage of users to a specific deployment URL based on a cookie.

*End of Document*
