# Deployment Pipelines

## Overview
Deploying a Remix application requires compiling the client-side React code and the server-side Node/Edge code. Remix is deployment-agnostic and can run on Node.js, Vercel, Cloudflare Pages/Workers, AWS Lambda, and Deno.

## 1. Standard Node.js Deployment (Docker)
The most common and flexible deployment method is using Docker to containerize a Node.js Express server running the Remix request handler.

### Dockerfile
```dockerfile
# Base node image
FROM node:18-bullseye-slim as base
ENV NODE_ENV production

# Install all node_modules, including dev dependencies
FROM base as deps
WORKDIR /myapp
ADD package.json package-lock.json ./
RUN npm install --production=false

# Setup production node_modules
FROM base as production-deps
WORKDIR /myapp
ADD package.json package-lock.json ./
RUN npm ci --omit=dev

# Build the app
FROM base as build
WORKDIR /myapp
COPY --from=deps /myapp/node_modules /myapp/node_modules
ADD . .
RUN npm run build

# Finally, build the production image
FROM base
WORKDIR /myapp
COPY --from=production-deps /myapp/node_modules /myapp/node_modules
COPY --from=build /myapp/build /myapp/build
COPY --from=build /myapp/public /myapp/public
ADD package.json ./

CMD ["npm", "start"]
```

## 2. CI/CD Pipeline (GitHub Actions)
A standard CI pipeline should install dependencies, lint the code, run unit and E2E tests, and then build and deploy the container.

```yaml
name: Deploy to Production
on:
  push:
    branches:
      - main

jobs:
  build_and_test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run build

  deploy:
    needs: build_and_test
    runs-on: ubuntu-latest
    steps:
      - name: Build and Push Docker Image
        run: |
          docker build -t my-remix-app:latest .
          docker push my-registry/my-remix-app:latest
      - name: Trigger Deployment
        run: curl -X POST https://my-infrastructure.com/deploy-hook
```

## 3. Serverless Deployments (Vercel / AWS Lambda)
When targeting serverless platforms, Remix compiles the server entry into a specific format that the platform understands. This is configured in `vite.config.ts` or `remix.config.js`.

```typescript
import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import { vercelPreset } from "@vercel/remix/vite";

export default defineConfig({
  plugins: [remix({ presets: [vercelPreset()] })],
});
```

## 4. Edge Computing (Cloudflare)
Deploying to the Edge places your loaders physically closer to users, drastically reducing latency. Note that Edge environments do not run standard Node.js APIs, so you must use Web APIs (fetch, Request, Response).

## 5. Database Migrations in CI
Ensure that database migrations run automatically during deployment, before the new server instances start accepting traffic. Tools like Prisma (`npx prisma migrate deploy`) are ideal for this step.

## Best Practices
1. Use multi-stage Docker builds to keep image sizes small.
2. Run database migrations as a pre-deploy step.
3. Cache node_modules in your CI pipeline to speed up builds.
4. Deploy static assets to a CDN for maximum performance.
5. Use proper health check endpoints in your Remix app for load balancers.

## Anti-Patterns
1. Committing `.env` files or hardcoding secrets.
2. Building the app on the production server instead of CI.
3. Failing to test the production build locally before pushing.
4. Ignoring Edge runtime limitations when targeting Cloudflare or Vercel Edge.
5. Running dev servers (`npm run dev`) in production.
