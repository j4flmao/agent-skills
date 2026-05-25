# Remix Deployment

## Build Configuration

```ts
// vite.config.ts — Remix + Vite
import { vitePlugin as remix } from '@remix-run/dev'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    remix({
      future: { v3_fetcherPersist: true, v3_relativeSplatPath: true },
    }),
  ],
})
```

## Deployment Targets

### Fly.io (Node)

```ts
// server.js
import { createRequestHandler } from '@remix-run/express'
import express from 'express'

const app = express()
app.all('*', createRequestHandler({ build: require('./build/server') }))
app.listen(process.env.PORT || 3000)
```

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start"]
```

### Vercel

```ts
// vite.config.ts
import { vitePlugin as remix } from '@remix-run/dev'
import { vercelPreset } from '@remix-run/vercel'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [remix({ presets: [vercelPreset()] })],
})
```

### Cloudflare Pages

```ts
// vite.config.ts
import { vitePlugin as remix } from '@remix-run/dev'
import { cloudflareDevProxyVitePlugin } from '@remix-run/dev'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [remix(), cloudflareDevProxyVitePlugin()],
})
```

## Environment Variables

```tsx
// app/env.server.ts — server-only env access
export function getEnv() {
  return {
    DATABASE_URL: process.env.DATABASE_URL!,
    STRIPE_KEY: process.env.STRIPE_KEY!,
  }
}

// root.tsx — expose to client
export async function loader() {
  return json({ ENV: { PUBLIC_API_URL: process.env.PUBLIC_API_URL } })
}

export function HydrateFallback() { return null }

export default function App() {
  const { ENV } = useLoaderData<typeof loader>()
  return (
    <html>
      <body>
        <Outlet />
        <script dangerouslySetInnerHTML={{
          __html: `window.ENV = ${JSON.stringify(ENV)}`,
        }} />
      </body>
    </html>
  )
}
```

## Performance Budget

| Metric | Target |
|--------|--------|
| Initial HTML | <100kB |
| Initial JS | <200kB |
| Server response | <200ms |
| LCP | <2.5s |
| Lighthouse | >90 |

## CI/CD

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run build
      - run: npm test
      - run: npx remix build
```

## Deployment Checklist

- [ ] Server runtime adapter configured (node/cloudflare/vercel)
- [ ] Environment variables set in deployment platform
- [ ] Session secret configured
- [ ] Database migrations run before deploy
- [ ] Cache headers set on loader responses
- [ ] Sitemap and robots.txt generated
- [ ] CSP headers configured
- [ ] Error tracking (Sentry) configured
