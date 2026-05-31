# SvelteKit Deployment Adapters

## Overview

SvelteKit uses adapters to convert your app into a deployable artifact for different platforms. The adapter determines which platform features are available, how routing works, and which environment APIs you can use. This reference covers every official adapter, configuration options, environment variable handling, static pre-rendering, and platform-specific optimizations.

## Adapter Selection

### Decision Tree

```
What platform are you deploying to?
├── Vercel → @sveltejs/adapter-vercel
├── Netlify → @sveltejs/adapter-netlify
├── Cloudflare Pages/Workers → @sveltejs/adapter-cloudflare
├── AWS Lambda/SST → @sveltejs/adapter-aws
├── Node.js server (any host) → @sveltejs/adapter-node
├── Docker → @sveltejs/adapter-node
├── Static hosting (GitHub Pages, S3) → @sveltejs/adapter-static
├── Deno → @sveltejs/adapter-deno
├── Bun → @sveltejs/adapter-bun
└── Not sure → @sveltejs/adapter-auto (auto-detects at build time)
```

### Adapter-Auto

```javascript
// svelte.config.js
import adapter from '@sveltejs/adapter-auto';

export default {
  kit: {
    adapter: adapter()
  }
};
```

Auto-detection relies on environment variables at build time. CI detection varies by provider. For production, pin a specific adapter.

## Adapter-Node

### Basic configuration

```javascript
import adapter from '@sveltejs/adapter-node';

export default {
  kit: {
    adapter: adapter({
      out: 'build',
      precompress: {
        brotli: true,
        gzip: true,
        files: ['**/*.html', '**/*.js', '**/*.css', '**/*.svg', '**/*.json']
      },
      polyfill: true
    })
  }
};
```

### Deployment

```bash
npm run build
node build/index.js  # Starts server on port 3000
```

Environment variables:
- `PORT` — server port (default: 3000)
- `HOST` — host address (default: 0.0.0.0)
- `ORIGIN` — required for CSRF protection, set to https://yourdomain.com
- `BODY_SIZE_LIMIT` — max body size in bytes (default: 524288 = 512KB)
- `PROTOCOL_HEADER`, `HOST_HEADER` — trust proxy headers

### Dockerfile

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/build ./build
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
EXPOSE 3000
ENV PORT=3000
ENV ORIGIN=https://example.com
CMD ["node", "build/index.js"]
```

### PM2 process management

```javascript
// ecosystem.config.cjs
module.exports = {
  apps: [{
    name: 'sveltekit-app',
    script: 'build/index.js',
    env: {
      PORT: 3000,
      ORIGIN: 'https://example.com',
      NODE_ENV: 'production'
    },
    instances: 'max',
    exec_mode: 'cluster',
    max_memory_restart: '500M',
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
};
```

## Adapter-Vercel

### Configuration

```javascript
import adapter from '@sveltejs/adapter-vercel';

export default {
  kit: {
    adapter: adapter({
      runtime: 'nodejs20.x',
      regions: ['iad1'],
      split: true,
      images: {
        sizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
        formats: ['image/avif', 'image/webp'],
        minimumCacheTTL: 300,
        domains: ['images.example.com']
      }
    })
  }
};
```

### Serverless Functions Configuration

```javascript
export const config = {
  runtime: 'edge' // or 'nodejs20.x'
};

export const load: PageServerLoad = async () => {
  // This load function runs as a serverless function
};
```

### ISR on Vercel

```typescript
// src/routes/blog/[slug]/+page.server.ts
export const config = {
  isr: {
    expiration: 60,
    bypassToken: process.env.VERCEL_BYPASS_TOKEN,
    allowQuery: ['preview']
  }
};

export const load: PageServerLoad = async ({ params }) => {
  const post = await getPost(params.slug);
  return { post };
};
```

### Environment Variables

```bash
# .env.local (local development)
DATABASE_URL=postgres://localhost/mydb

# Vercel Dashboard: add DATABASE_URL as environment variable
# Prefix with NEXT_PUBLIC_ not needed in SvelteKit — use $env
```

```typescript
// Usage in SvelteKit
import { DATABASE_URL } from '$env/static/private';    // Private env var
import { PUBLIC_API_URL } from '$env/static/public';    // Public env var
```

## Adapter-Netlify

### Configuration

```javascript
import adapter from '@sveltejs/adapter-netlify';

export default {
  kit: {
    adapter: adapter({
      edge: false,
      split: false
    })
  }
};
```

### Edge Functions

```javascript
export default {
  kit: {
    adapter: adapter({ edge: true })
  }
};
```

### Netlify redirects

```javascript
// svelte.config.js
export default {
  kit: {
    adapter: adapter(),
    files: {
      hooks: {
        server: 'src/hooks.server'
      }
    }
  }
};
```

```toml
# netlify.toml
[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/render"
  status = 200
```

### Serverless environment

```typescript
// Netlify-specific context
export const load: PageServerLoad = async ({ locals, request }) => {
  // Access Netlify context via request headers
  const siteUrl = request.headers.get('x-netlify-site-url');
  const deployId = request.headers.get('x-netlify-deploy-id');

  return { siteUrl, deployId };
};
```

## Adapter-Cloudflare

### Pages Configuration

```javascript
import adapter from '@sveltejs/adapter-cloudflare';

export default {
  kit: {
    adapter: adapter({
      routes: {
        include: ['/*'],
        exclude: ['<all>']
      },
      platformProxy: {
        configPath: 'wrangler.toml',
        environment: undefined,
        persist: true
      }
    })
  }
};
```

### Workers Configuration

```javascript
import adapter from '@sveltejs/adapter-cloudflare-workers';

export default {
  kit: {
    adapter: adapter({
      config: 'wrangler.toml'
    })
  }
};
```

### Platform bindings

```typescript
// src/hooks.server.ts
export const handle: Handle = async ({ event, resolve }) => {
  // Access Cloudflare bindings
  const platform = event.platform as App.Platform;

  // KV Namespace
  const cached = await platform.env.KV.get('cached-data');

  // D1 Database
  const result = await platform.env.DB.prepare('SELECT * FROM users').all();

  // R2 Bucket
  const object = await platform.env.R2_BUCKET.get('file.txt');

  // Queue
  await platform.env.QUEUE.send({ type: 'page-view', url: event.url.href });

  return await resolve(event);
};
```

### Wrangler configuration

```toml
# wrangler.toml
name = "my-sveltekit-app"
compatibility_date = "2024-01-01"

[[kv_namespaces]]
binding = "KV"
id = "abc123"

[[d1_databases]]
binding = "DB"
database_name = "my-db"
database_id = "def456"

[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "my-bucket"

[[queues]]
binding = "QUEUE"
queue_name = "my-queue"
```

### Type declarations

```typescript
// src/app.d.ts
declare global {
  namespace App {
    interface Platform {
      env: {
        KV: KVNamespace;
        DB: D1Database;
        R2_BUCKET: R2Bucket;
        QUEUE: Queue;
      };
      context: ExecutionContext;
      caches: CacheStorage;
    }
  }
}
```

## Adapter-Static

### Configuration

```javascript
import adapter from '@sveltejs/adapter-static';

export default {
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: 'index.html', // For SPA mode
      precompress: false,
      strict: true
    })
  }
};
```

### Prerendering all pages

```typescript
// src/routes/+layout.ts
export const prerender = true;
```

### SPA mode (single page app, no SSR)

```typescript
// src/routes/+layout.ts
export const prerender = false;
export const ssr = false;
```

### Hybrid: static + SPA

```typescript
// src/routes/+layout.ts
export const prerender = true;

// src/routes/dashboard/+page.ts
export const prerender = false;
export const ssr = false;

// src/routes/admin/+page.ts
export const prerender = false;
export const ssr = true;
```

### GitHub Pages deployment

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./build
          cname: example.com # optional
```

## Adapter-Bun

```javascript
import adapter from '@sveltejs/adapter-bun';

export default {
  kit: {
    adapter: adapter({
      out: 'build',
      precompress: {
        brotli: true,
        gzip: true
      },
      dynamic_origin: true,
      xff_depth: 1
    })
  }
};
```

```bash
bun run build
bun run build/index.js
```

## Adapter-Deno

```javascript
import adapter from '@sveltejs/adapter-deno';

export default {
  kit: {
    adapter: adapter({
      out: 'build',
      precompress: true
    })
  }
};
```

```bash
deno run --allow-net --allow-read --allow-env build/index.js
```

## Adapter-AWS

```javascript
import adapter from '@sveltejs/adapter-aws';

export default {
  kit: {
    adapter: adapter({
      out: 'build',
      lambdaName: 'my-sveltekit-app',
      lambdaRole: 'arn:aws:iam::123456789012:role/lambda-role',
      region: 'us-east-1',
      memorySize: 512,
      timeout: 30,
      vpcConfig: {
        subnetIds: ['subnet-abc', 'subnet-def'],
        securityGroupIds: ['sg-123']
      }
    })
  }
};
```

## Adapter comparison

| Adapter | Platform | Runtime | Cold Start | Streaming | ISR | Edge |
|---------|----------|---------|------------|-----------|-----|------|
| adapter-node | Any Node.js host | Node.js | Medium | Yes | Manual | No |
| adapter-vercel | Vercel | Node.js/Edge | Fast/Low | Yes | Yes | Yes |
| adapter-netlify | Netlify | Node.js/Edge | Medium/Fast | Yes | No | Yes |
| adapter-cloudflare | Cloudflare | Workers | Near-zero | No | No | Yes |
| adapter-static | Static hosts | None | Instant | No | No | No |
| adapter-deno | Deno hosts | Deno | Medium | Yes | Manual | No |
| adapter-bun | Bun hosts | Bun | Low | Yes | Manual | No |
| adapter-aws | AWS Lambda | Node.js | Medium | No | Manual | No |

## Environment variables

### Public vs Private

```typescript
// $env/static/public — Available on client and server, baked at build time
import { PUBLIC_API_URL, PUBLIC_SENTRY_DSN } from '$env/static/public';

// $env/dynamic/public — Available on client and server, resolved at runtime
import { env } from '$env/dynamic/public';
const apiUrl = env.PUBLIC_API_URL;

// $env/static/private — Server only, baked at build time
import { DATABASE_URL, API_SECRET } from '$env/static/private';

// $env/dynamic/private — Server only, resolved at runtime
import { env } from '$env/dynamic/private';
const dbUrl = env.DATABASE_URL;
```

### .env files

```
.env                    — All environments
.env.local              — Local overrides (gitignored)
.env.production         — Production only
.env.development        — Development only
```

## Pre-rendering

### Page-level pre-rendering

```typescript
// src/routes/blog/[slug]/+page.server.ts
export const prerender = true;

export const entries = async () => {
  const posts = await db.post.findMany({ select: { slug: true } });
  return posts.map(post => ({ slug: post.slug }));
};
```

### Crawling for links

```typescript
// svelte.config.js
export default {
  kit: {
    prerender: {
      crawl: true,
      entries: ['/', '/about', '/blog'],
      handleHttpError: 'fail',
      handleMissingId: 'warn',
      origin: 'https://example.com',
      concurrency: 30
    }
  }
};
```

### On-demand pre-rendering (Vercel ISR)

```typescript
export const config = {
  isr: {
    expiration: 60,
    group: 0
  }
};
```

## SSR and CSRF

### SSR per route

```typescript
// src/routes/+page.ts
export const ssr = true; // Default

// src/routes/static-page/+page.ts
export const ssr = false; // Client-only
```

### CSRF protection

SvelteKit checks the `Origin` header on POST requests. Configure the expected origin:

```typescript
// svelte.config.js
export default {
  kit: {
    csrf: {
      checkOrigin: true
    }
  }
};
```

```bash
# Set ORIGIN environment variable in production
ORIGIN=https://example.com node build/index.js
```

## Cache headers

```typescript
// src/routes/blog/[slug]/+page.server.ts
export const load: PageServerLoad = async ({ params, setHeaders }) => {
  const post = await getPost(params.slug);

  setHeaders({
    'Cache-Control': `public, max-age=0, s-maxage=${post.isStatic ? 3600 : 0}`,
    'CDN-Cache-Control': `public, s-maxage=${post.isStatic ? 3600 : 0}`,
    'Netlify-CDN-Cache-Control': `public, s-maxage=${post.isStatic ? 3600 : 0}`
  });

  return { post };
};
```

## Traffic and scaling

### Adapter-Node clustering

```bash
# Using PM2
pm2 start build/index.js -i max

# Using cluster module directly
node -e "
  const cluster = require('cluster');
  if (cluster.isMaster) {
    const numCPUs = require('os').cpus().length;
    for (let i = 0; i < numCPUs; i++) cluster.fork();
  } else {
    require('./build/index.js');
  }
"
```

### Vercel scaling

Vercel auto-scales serverless functions. Configure regions:

```javascript
// svelte.config.js
adapter: adapter({
  regions: ['iad1', 'hkg1', 'lhr1']  // Deploy to multiple regions
})
```

### Cloudflare scaling

Cloudflare Workers scale automatically across 300+ locations. Use Durable Objects for coordinated state.

## Validation

### Build validation

```bash
npm run build  # Validates adapter configuration, pre-rendering, and types

# SvelteKit will fail build if:
# - Prerender entries don't resolve
# - Dynamic routes without prerender has no fallback
# - Server-only code imported in client
# - Missing environment variables
```

### Production validation checklist

```
- [ ] Adapter correctly selected for hosting platform
- [ ] ORIGIN environment variable set
- [ ] Public environment variables prefixed with PUBLIC_
- [ ] All prerender entries resolve correctly
- [ ] Serverless function timeouts adequate for slow queries
- [ ] Cache-Control headers set for static assets
- [ ] Image optimization configured (platform-specific)
- [ ] Rate limiting configured for production
- [ ] SSL/TLS enabled at platform level
- [ ] Monitoring and error tracking configured
- [ ] Database connection pooling configured
- [ ] Cold start mitigation strategies in place
```

## Troubleshooting

### Common deployment issues

| Problem | Cause | Solution |
|---------|-------|----------|
| 404 on page | Prerender missing entry | Add page to prerender.entries in config |
| CSRF error | Missing ORIGIN environment | Set ORIGIN=https://yourdomain.com |
| Static assets 404 | Wrong adapter config | Check adapter.pages and adapter.assets paths |
| Serverless timeout | Query too slow | Add connection pooling, optimize query |
| Blank page on static | No fallback for SPA | Set adapterStatic.fallback = 'index.html' |
| Build fails on adapter-auto | Unknown CI environment | Pin specific adapter |
| Edge function timeout | Too much computation | Move to Node.js runtime or optimize |
| Memory limit exceeded | Large payload | Paginate data, use streaming |

### Debugging

```bash
# Debug build output
npx svelte-kit sync  # Re-generate types
npx vite build --mode production  # Build with Vite verbosely

# Check which adapter was resolved
npx svelte-kit package  # Validate package structure

# Preview production build locally
npm run preview
```
