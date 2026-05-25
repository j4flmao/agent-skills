# Astro Routing Patterns

## File-Based Routing

```
src/pages/
  index.astro                   ->  /
  about.astro                   ->  /about
  blog/
    index.astro                 ->  /blog
    [slug].astro                ->  /blog/:slug
    [slug]/comments.astro       ->  /blog/:slug/comments
    tags/[tag].astro            ->  /blog/tags/:tag
    [...slug].astro             ->  /blog/* (catch-all)
```

## Dynamic Routes with getStaticPaths

```astro
---
export async function getStaticPaths() {
  const posts = await getCollection('blog')
  const tags = [...new Set(posts.flatMap(p => p.data.tags))]
  return [
    ...posts.map(post => ({ params: { slug: post.slug }, props: { post } })),
    ...tags.map(tag => ({ params: { tag } })),
  ]
}

const { post } = Astro.props
---

<BlogPost post={post} />
```

## Redirects

```js
// astro.config.mjs
export default defineConfig({
  redirects: {
    '/old-page': '/new-page',
    '/post/(.*)': '/blog/[$1]',
    '/archive': { destination: '/blog', status: 301 },
  },
})
```

## Middleware (SSR)

```ts
// src/middleware.ts
import { defineMiddleware } from 'astro/middleware'

export const onRequest = defineMiddleware(async (context, next) => {
  const start = Date.now()
  const response = await next()
  const ms = Date.now() - start
  response.headers.set('X-Render-Time', `${ms}ms`)
  return response
})
```

## Hybrid Rendering

```astro
---
// Static by default
export async function getStaticPaths() {
  return [{ params: { slug: 'hello' } }]
}
---

---
// Opt-in to SSR
export const prerender = false
const data = await fetch('https://api.example.com/data').then(r => r.json())
---
```

## Endpoints (API Routes)

```ts
// src/pages/api/contact.ts
export async function POST({ request }: APIContext) {
  const body = await request.json()
  // Validate and save
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
```

| Method | Function |
|--------|----------|
| GET | `export async function GET(...)` |
| POST | `export async function POST(...)` |
| PUT | `export async function PUT(...)` |
| DELETE | `export async function DELETE(...)` |
| ALL | `export async function ALL(...)` |

## Route Parameters

```astro
---
// [slug].astro
export async function getStaticPaths() {
  return [
    { params: { slug: 'post-1' }, props: { id: 1 } },
    { params: { slug: 'post-2' }, props: { id: 2 } },
  ]
}
const { slug } = Astro.params
const { id } = Astro.props
---

<h1>Post {id}: {slug}</h1>
```
