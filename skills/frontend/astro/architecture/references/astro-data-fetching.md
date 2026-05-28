# Astro Data Fetching

## Overview

Astro offers multiple data fetching strategies depending on your output mode (SSG, SSR, or hybrid) and where the data is needed (build time, request time, or client time). This guide covers all data fetching patterns from simple static queries to complex streaming and authentication patterns.

## Data Fetching Locations

### Where Data Can Be Fetched

| Location | When It Runs | Available In |
|----------|-------------|--------------|
| `.astro` frontmatter | Build time (SSG) or request time (SSR) | Static content, page data |
| `getStaticPaths()` | Build time | Dynamic SSG route generation |
| Server endpoints (`src/pages/api/*.ts`) | Request time | API responses |
| Middleware (`src/middleware.ts`) | Request time (SSR/hybrid) | Request preprocessing |
| Framework island component | Client side | Interactive widgets |
| Server islands | Request time (SSR) | Dynamic content in static pages |

## SSG Data Fetching (Build Time)

### Basic Fetch in Frontmatter

```astro
---
// src/pages/index.astro
const response = await fetch('https://api.github.com/repos/withastro/astro')
const repo = await response.json()
---

<h1>{repo.full_name}</h1>
<p>Stars: {repo.stargazers_count}</p>
<p>Forks: {repo.forks_count}</p>
```

Data is fetched once at build time. The HTML output contains the fetched data. No client-side fetch is generated.

### Parallel Fetching

```astro
---
const [blogPosts, teamMembers, recentTweets] = await Promise.all([
  fetch('https://api.example.com/posts').then(r => r.json()),
  fetch('https://api.example.com/team').then(r => r.json()),
  fetch('https://api.twitter.com/user/tweets').then(r => r.json()),
])
---

<section>
  <h2>Latest Posts</h2>
  {blogPosts.slice(0, 5).map(post => <p>{post.title}</p>)}
</section>
```

Parallel fetching reduces total build time. All three requests fire simultaneously.

### Static Paths with External Data

```astro
---
// src/pages/products/[id].astro
export async function getStaticPaths() {
  const products = await fetch('https://api.example.com/products').then(r => r.json())

  return products.map(product => ({
    params: { id: product.id },
    props: { product },
  }))
}

const { product } = Astro.props
---

<h1>{product.name}</h1>
<p>{product.description}</p>
```

`getStaticPaths` runs at build time to determine which pages to generate. Each page receives its props.

## SSR Data Fetching (Request Time)

### Server-Side Fetch

```astro
---
// src/pages/dashboard/index.astro — SSR only (prerender = false)
export const prerender = false

const session = await getSession(Astro.request)
if (!session) {
  return Astro.redirect('/login')
}

const [userData, notifications] = await Promise.all([
  fetch(`https://api.example.com/users/${session.userId}`, {
    headers: { Authorization: `Bearer ${session.token}` },
  }).then(r => r.json()),
  fetch(`https://api.example.com/notifications`, {
    headers: { Authorization: `Bearer ${session.token}` },
  }).then(r => r.json()),
])
---

<h1>Welcome, {userData.name}</h1>
<p>You have {notifications.length} notifications</p>
```

### Request Context

```astro
---
// Access request-specific data
const url = Astro.url
const cookies = Astro.cookies
const headers = Astro.request.headers
const ip = Astro.clientAddress
const locals = Astro.locals

// Locals can be set by middleware
const user = Astro.locals.user
---
```

## Hybrid Data Fetching

### Per-Route Rendering

```astro
---
// src/pages/blog/[slug].astro — SSG (default in hybrid mode)
// All blog pages are statically generated

// src/pages/dashboard.astro — SSR
export const prerender = false
// This page renders on each request
---

// src/pages/pricing.astro — SSG
// Render once at build time, serve from CDN
```

### On-Demand Static Generation (ISR)

With Vercel adapter:

```js
// astro.config.mjs
import { defineConfig } from 'astro/config'
import vercel from '@astrojs/vercel/serverless'

export default defineConfig({
  output: 'hybrid',
  adapter: vercel({
    isr: {
      // Revalidate every 60 seconds
      expiration: 60,
      // Exclude specific routes from ISR
      exclude: ['/admin', '/dashboard'],
    },
  }),
})
```

```astro
---
// This page is statically generated but revalidates every 60s
export const prerender = true
---
```

## Server Endpoints

### JSON API Endpoints

```ts
// src/pages/api/products.ts
import type { APIRoute } from 'astro'

export const GET: APIRoute = async ({ url, request }) => {
  const category = url.searchParams.get('category')
  const products = await fetchProducts(category)

  return new Response(JSON.stringify(products), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300, s-maxage=3600',
    },
  })
}

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json()
  const product = await createProduct(body)

  return new Response(JSON.stringify(product), {
    status: 201,
  })
}
```

### Dynamic Endpoint Routes

```ts
// src/pages/api/products/[id].ts
export const GET: APIRoute = async ({ params }) => {
  const product = await fetchProduct(params.id)

  if (!product) {
    return new Response(null, { status: 404 })
  }

  return new Response(JSON.stringify(product), {
    headers: { 'Content-Type': 'application/json' },
  })
}
```

### Redirects

```ts
// src/pages/api/old-path.ts
export const GET: APIRoute = async () => {
  return Astro.redirect('/new-path', 301)
}
```

## Middleware Data Handling

```ts
// src/middleware.ts
import { defineMiddleware } from 'astro/middleware'

export const onRequest = defineMiddleware(async (context, next) => {
  // Fetch user data before page renders
  const token = context.cookies.get('session')?.value

  if (token) {
    try {
      const user = await fetch(`https://api.example.com/me`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json())

      // Make available to all pages via Astro.locals
      context.locals.user = user
    } catch {
      context.locals.user = null
    }
  }

  const response = await next()
  return response
})
```

```astro
---
// Any page can access the user
const user = Astro.locals.user
---

{user ? <p>Welcome {user.name}</p> : <a href="/login">Login</a>}
```

## Image Data Fetching

```astro
---
import { Image } from 'astro:assets'
import heroImage from '../assets/hero.png'
import { getCollection } from 'astro:content'

const posts = await getCollection('blog')
---

<!-- Local image — optimized at build time -->
<Image src={heroImage} alt="Hero" width={1200} height={600} format="webp" />

<!-- Remote image — optimized at build time -->
<Image
  src="https://images.unsplash.com/photo-123"
  alt="Remote"
  width={800}
  height={600}
  format="avif"
/>

<!-- Dynamic image from API -->
<Image
  src={posts[0].data.cover}
  alt={posts[0].data.title}
  width={800}
  height={400}
/>
```

## Client-Side Data Fetching

### In Framework Islands

```tsx
// React island
import { useState, useEffect } from 'react'

export default function ClientData({ initialId }: { initialId: string }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/data/${initialId}`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [initialId])

  if (loading) return <p>Loading...</p>
  return <div>{/* render data */}</div>
}
```

### In Client Scripts

```astro
---
const apiEndpoint = Astro.url.origin + '/api/data'
---

<script>
  async function loadData() {
    const res = await fetch('/api/data')
    const data = await res.json()
    document.getElementById('output').textContent = JSON.stringify(data)
  }

  document.addEventListener('DOMContentLoaded', loadData)
</script>

<pre id="output">Loading...</pre>
```

## Caching Strategies

### Build-Time Cache (SSG)

```astro
---
// Cache fetch results during build
const cache = new Map()

async function cachedFetch(url: string) {
  if (cache.has(url)) return cache.get(url)
  const data = await fetch(url).then(r => r.json())
  cache.set(url, data)
  return data
}

const [products, categories] = await Promise.all([
  cachedFetch('https://api.example.com/products'),
  cachedFetch('https://api.example.com/categories'),
])
---
```

### Response-Level Cache (SSR)

```astro
---
export const prerender = false

const data = await fetch('https://api.example.com/data', {
  headers: { 'Cache-Control': 'max-age=300' },
}).then(r => r.json())

// Set Cache-Control on the HTML response
Astro.response.headers.set(
  'Cache-Control',
  'public, max-age=60, s-maxage=300, stale-while-revalidate=60'
)
---
```

### Using Astro.locals for Request-Level Cache

```ts
// src/middleware.ts
import { defineMiddleware } from 'astro/middleware'

export const onRequest = defineMiddleware(async (context, next) => {
  const requestCache = new Map()
  context.locals.cache = requestCache
  return next()
})
```

```astro
---
// In any page
const cache = Astro.locals.cache as Map<string, any>

async function getData(url: string) {
  if (cache.has(url)) return cache.get(url)
  const data = await fetch(url).then(r => r.json())
  cache.set(url, data)
  return data
}
---
```

## Error Handling

### Try/Catch in Frontmatter

```astro
---
let data
let error = null

try {
  data = await fetch('https://api.example.com/data').then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return r.json()
  })
} catch (e) {
  error = e.message
  data = fallbackData
}
---

{error ? (
  <p class="error">Failed to load: {error}</p>
) : (
  <div>{/* render data */}</div>
)}
```

### Error Boundaries in Islands

```tsx
// In a framework island
class ErrorBoundary extends React.Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return <p>Something went wrong loading this component.</p>
    }
    return this.props.children
  }
}
```

## Streaming Data (SSR)

### Using ReadableStream

```astro
---
export const prerender = false

const stream = await fetch('https://api.example.com/large-dataset', {
  headers: { Accept: 'text/event-stream' },
})

// Astro can handle streaming responses in SSR mode
// The response body streams to the client as chunks arrive
---
```

### Deferred Loading with Client Scripts

```astro
---
// Pass initial data, load more on client
const initialData = await fetch('https://api.example.com/initial')
  .then(r => r.json())
---

<script>
  const moreData = fetch('/api/more-data').then(r => r.json())
</script>
```

## Authentication Patterns

### Cookie-Based Auth

```astro
---
export const prerender = false

const session = Astro.cookies.get('session')
if (!session) {
  return Astro.redirect('/login')
}

const user = await fetch('https://api.example.com/me', {
  headers: { Cookie: `session=${session.value}` },
}).then(r => r.json())
---
```

### Token-Based Auth

```astro
---
export const prerender = false

const authHeader = Astro.request.headers.get('Authorization')
if (!authHeader) {
  return new Response('Unauthorized', { status: 401 })
}

const data = await fetch('https://api.example.com/protected', {
  headers: { Authorization: authHeader },
}).then(r => r.json())
---
```

## Data Fetching Decision Matrix

| Scenario | Strategy | Location | Caching |
|----------|----------|----------|---------|
| Blog posts | Content Collections | `src/content/` | Build-time |
| Product data from CMS | SSG frontmatter fetch | .astro frontmatter | Build-time |
| User dashboard | SSR frontmatter | .astro frontmatter | Request-time |
| Live search | Client-side fetch | Framework island | Client + CDN |
| Form submission | Server endpoint | `src/pages/api/` | None |
| Auth-protected data | SSR + middleware | .astro + middleware | Private |
| Real-time updates | WebSocket in island | Framework island | None |
| Image gallery | astro:assets Image | .astro + fetch | Build-time |
| API aggregation | Server endpoint | `src/pages/api/` | CDN cache |
| Large dataset | Streaming + pagination | Server endpoint | Partial |

## Testing Data Fetching

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    setupFiles: ['./test-setup.ts'],
  },
})
```

```ts
// Testing a server endpoint
import { describe, it, expect } from 'vitest'

describe('API endpoints', () => {
  it('returns products', async () => {
    const response = await fetch('http://localhost:4321/api/products')
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(Array.isArray(data)).toBe(true)
  })
})
```

## Summary

| Method | Best For | Runs At | Caching |
|--------|----------|---------|---------|
| Frontmatter fetch | SSG content | Build time | Static |
| Frontmatter fetch | SSR content | Request time | Configurable |
| getStaticPaths | Dynamic SSG routes | Build time | Static |
| Server endpoints | JSON APIs | Request time | Configurable |
| Middleware | Per-request preprocessing | Request time | Configurable |
| Client fetch | Interactive widgets | Client time | Browser/CDN |
