# Hono Setup Guide

## Installation by Runtime

### Node.js
```bash
npm create hono@latest order-service
cd order-service
npm install
npm run dev
```

### Bun
```bash
bun create hono@latest order-service
cd order-service
bun install
bun run dev
```

### Cloudflare Workers
```bash
npm create hono@latest order-service -- --template cloudflare-workers
cd order-service
npm install
npx wrangler dev
```

### Deno
```bash
deno run -A npm:create-hono@latest order-service
cd order-service
deno task dev
```

## Project Structure (Node.js template)
```
src/
├── index.ts
├── app.ts
└── ...
tsconfig.json
package.json
```

## TypeScript Configuration
```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "react-jsx",
    "jsxImportSource": "hono/jsx",
    "outDir": "./dist"
  }
}
```

## Cloudflare Workers Wrangler Config
```toml
# wrangler.toml
name = "order-service"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[env.production]
vars = { ENVIRONMENT = "production" }
```

## Deploy Targets

| Runtime | Deploy command | URL |
|---|---|---|
| Node.js | `npm run build && node dist/index.js` | Self-hosted |
| Bun | `bun run src/index.ts` | Self-hosted |
| Cloudflare Workers | `npx wrangler publish` | workers.dev |
| Deno Deploy | `deployctl deploy` | deno.dev |
| Vercel | `vercel --prod` | vercel.app |

## Environment Variables
```typescript
// For Node.js / Bun
type Bindings = {
  DATABASE_URL: string
  JWT_SECRET: string
}

// Cloudflare Workers / Deno
type Bindings = {
  DB: D1Database
  QUEUE: Queue
  KV: KVNamespace
}

const app = new Hono<{ Bindings: Bindings }>()
app.get('/', (c) => c.text(c.env.DATABASE_URL))
```

## Entry Points by Runtime

### Node.js
```typescript
import { serve } from '@hono/node-server'
import app from './app'

serve(app, (info) => {
  console.log(`Listening on http://localhost:${info.port}`)
})
```

### Cloudflare Workers
```typescript
import app from './app'
export default app
```

### Deno
```typescript
import app from './app.ts'
Deno.serve(app.fetch)
```

## Package Scripts
```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest",
    "deploy": "wrangler publish"
  }
}
```
