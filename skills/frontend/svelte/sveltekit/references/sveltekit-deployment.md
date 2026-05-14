# SvelteKit Deployment

## Vercel
```bash
npm create vite@latest myapp -- --template sveltekit
vercel --prod
```

## Docker
```dockerfile
FROM node:20 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-slim
WORKDIR /app
COPY --from=builder /app/build build/
COPY --from=builder /app/package.json .
EXPOSE 3000
CMD ["node", "build/index.js"]
```

## Adapter Selection
| Adapter | Platform | Config |
|---|---|---|
| `@sveltejs/adapter-vercel` | Vercel | Zero config |
| `@sveltejs/adapter-netlify` | Netlify | `netlify.toml` |
| `@sveltejs/adapter-cloudflare` | Cloudflare Pages | `wrangler.toml` |
| `@sveltejs/adapter-node` | Node server | Custom server |
| `@sveltejs/adapter-static` | Static export | SPA/SSG |
