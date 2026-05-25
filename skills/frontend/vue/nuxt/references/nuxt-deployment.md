# Nuxt Deployment

## Build Commands

```json
{
  "scripts": {
    "dev": "nuxt dev",
    "build": "nuxt build",
    "generate": "nuxt generate",
    "preview": "nuxt preview",
    "start": "node .output/server/index.mjs"
  }
}
```

| Mode | Command | Output |
|------|---------|--------|
| SSR | `nuxt build` | `.output/` — Node server |
| Static | `nuxt generate` | `.output/public/` — Static HTML |
| Hybrid | `nuxt build` | Per-route static+server |

## Deployment Targets

### Node (VPS, Docker, Fly.io)

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/.output ./.output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
```

### Vercel

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  nitro: { preset: 'vercel' },
})
```

### Netlify

```ts
export default defineNuxtConfig({
  nitro: { preset: 'netlify' },
})
```

### Cloudflare Pages

```ts
export default defineNuxtConfig({
  nitro: { preset: 'cloudflare-pages' },
})
```

### Static (S3, GitHub Pages)

```bash
nuxt generate
# Deploy .output/public/ to any static host
```

## Environment Variables

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    public: { apiBase: '/api' },
    private: { apiSecret: '' },  // Server-only
  },
})
// Set via NUXT_PUBLIC_API_BASE and NUXT_PRIVATE_API_SECRET
```

## Performance Budget

| Metric | Target |
|--------|--------|
| Initial HTML | <50kB |
| Initial JS | <100kB |
| SSR TTFB | <200ms |
| LCP | <2.5s |
| Lighthouse | >90 |

## Deployment Checklist

- [ ] `nuxt.config.ts` has correct deployment preset
- [ ] `nuxt build` or `nuxt generate` succeeds
- [ ] Runtime config variables set in deployment platform
- [ ] Public assets served with cache headers (CDN)
- [ ] Sitemap and robots.txt generated
- [ ] i18n configured for all locales
- [ ] Image optimization working (nuxt/image)
- [ ] Analytics script configured
- [ ] Error tracking (Sentry) configured
