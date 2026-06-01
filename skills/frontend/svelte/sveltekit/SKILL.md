---
name: sveltekit
description: >
  Use this skill when building SvelteKit applications — routing, load functions, form actions, API endpoints, server-side rendering, stores, deployment. This skill enforces: file-based routing conventions, server load functions for data fetching, form actions with validation and redirects, separated API endpoints in routes/api. Do NOT use for: non-Svelte frontend frameworks, backend-only APIs, static site generation without SvelteKit.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, svelte, sveltekit, phase-3]
---

# SvelteKit

## Purpose
Define and enforce SvelteKit application architecture with routing conventions, data loading, form handling, and deployment patterns.

## Agent Protocol

### Trigger
User request includes: `svelte`, `sveltekit`, `svelte app`, `svelte routing`, `svelte load`, `svelte server`, `svelte form`, `svelte kit`.

### Input Context
- SvelteKit version (2.x)
- Rendering mode (SSR, SPA, static)
- Data fetching requirements
- Auth strategy

### Output Artifact
No file output. Produces route structure, load functions, form actions, and deployment config as text.

### Response Format
Route structure with file tree. Load and action code examples. Deployment config.

No preamble. No postamble. No explanations. No filler/hedging/transitions.

### Max Response Length
4096 tokens

## Component Architecture / Decision Trees

### Architecture Options

| Approach | Trade-off | When to Use |
|----------|-----------|-------------|
| Server load functions (+page.server.ts) | DB access, secrets, SSR | Private/personalized data |
| Universal load functions (+page.ts) | Runs on server + client | Public API data, cached |
| Form actions | Server mutations, progressive enhancement | All form submissions |
| API endpoints (+server.ts) | REST/JSON endpoints | External API consumption |
| Hooks (handle) | Per-request processing | Auth, logging, redirects |

### Decision Tree: Load Function

```
Is the data user-specific?
  ├── Yes -> +page.server.ts or +layout.server.ts
  └── No -> Is the API public?
       ├── Yes -> +page.ts (universal load)
       └── No -> +page.server.ts
```

### Decision Tree: SSR vs SPA vs Static

```
How should this route render?
  ├── Needs SEO + fast initial load -> SSR (default)
  ├── Fully static content -> export const prerender = true
  ├── Authenticated dashboard -> SSR + trailing slash
  └── No SSR needed -> export const ssr = false
```

## Component Design Patterns

### Server Load with Auth

```typescript
// src/routes/dashboard/+page.server.ts
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user) throw redirect(302, '/login')

  const page = Number(url.searchParams.get('page')) || 1
  const [orders, total, notifications] = await Promise.all([
    db.order.findMany({ where: { userId: locals.user.id }, skip: (page-1)*20, take: 20 }),
    db.order.count({ where: { userId: locals.user.id } }),
    db.notification.findMany({ where: { userId: locals.user.id, read: false } }),
  ])
  return { user: locals.user, orders, total, page, notifications }
}
```

### Universal Load with Caching

```typescript
// src/routes/products/+page.ts
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ fetch, url }) => {
  const res = await fetch(`/api/products?${url.searchParams}`)
  const products = await res.json()
  return {
    products,
    /** Cache on CDN for 5 minutes, stale-while-revalidate for 1 hour */
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=3600' },
  }
}
```

### Form Action with Validation

```typescript
// src/routes/settings/+page.server.ts
import type { Actions } from './$types'
import { fail, redirect } from '@sveltejs/kit'
import { z } from 'zod'

const schema = z.object({ name: z.string().min(2), email: z.string().email() })

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const data = Object.fromEntries(await request.formData())
    const result = schema.safeParse(data)
    if (!result.success) return fail(400, { errors: result.error.flatten().fieldErrors, values: data })
    await db.user.update({ where: { id: locals.user.id }, data: result.data })
    return { success: true }
  },
  delete: async ({ locals }) => {
    await db.user.delete({ where: { id: locals.user.id } })
    throw redirect(302, '/goodbye')
  },
}
```

### API Endpoint

```typescript
// src/routes/api/orders/+server.ts
import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ locals, url }) => {
  const orders = await db.order.findMany({ where: { userId: locals.user.id } })
  return json(orders)
}

export const POST: RequestHandler = async ({ request, locals }) => {
  const body = await request.json()
  const order = await db.order.create({ data: { ...body, userId: locals.user.id } })
  return json(order, { status: 201 })
}
```

## State Management Patterns

### Loader Data as State (Primary)

```svelte
<script>
  let { data } = $props()
  // data.orders, data.user from load function
</script>
```

### Form State with use:enhance

```svelte
<script>
  import { enhance } from '$app/forms'
  let { form, data } = $props()
</script>

<form method="POST" use:enhance>
  <input name="name" bind:value={form?.name} />
  <button type="submit">Save</button>
</form>
```

### Client State with Stores

```typescript
// src/lib/stores/cart.svelte.ts
import { writable } from 'svelte/store'
export const cart = writable<CartItem[]>([])
```

## Performance Optimization

1. Compiles to vanilla JS — no virtual DOM, ~5KB runtime
2. Per-component hydration reduces initial JS cost
3. Load functions run on server for SSR, client for SPA navigation
4. Route-level code splitting by default
5. `preload` attributes on critical assets
6. Cache headers via `setHeaders` in load functions

## Build & Bundle Considerations

### Adapter Configuration

```ts
// svelte.config.js
import adapter from '@sveltejs/adapter-vercel'  // or -node, -netlify, -cloudflare

export default {
  kit: {
    adapter: adapter({
      runtime: 'edge',             // for adapter-vercel
      regions: ['iad1'],
    }),
    prerender: {
      entries: ['/', '/about', '/blog/*'],
    },
  },
}
```

### Build Commands
```bash
npm run build    # adapter-specific build
npm run preview  # preview production build
npm run dev      # dev server with HMR
```

### Environment Variables
```typescript
// Server-only: process.env.DATABASE_URL
// Public: import { env } from '$env/dynamic/public' or '$env/static/public'
// Private: import { env } from '$env/dynamic/private' or '$env/static/private'
```

## Testing Strategies

### Load Function Tests

```typescript
import { describe, it, expect } from 'vitest'
import { load } from './+page.server'

it('returns orders for authenticated user', async () => {
  const result = await load({ locals: { user: { id: '1' } }, url: new URL('http://localhost'), params: {} })
  expect(result).toHaveProperty('orders')
  expect(result).toHaveProperty('user')
})
```

### Form Action Tests

```typescript
it('validates form input', async () => {
  const formData = new FormData()
  formData.set('email', 'invalid')
  const result = await actions.default({ request: new Request('http://localhost', { method: 'POST', body: formData }), locals: { user: { id: '1' } } })
  expect(result.status).toBe(400)
})
```

### E2E Tests

```typescript
import { test, expect } from '@playwright/test'
test('submits contact form', async ({ page }) => {
  await page.goto('/contact')
  await page.fill('[name="email"]', 'test@test.com')
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL(/\/thanks/)
})
```

## Migration Patterns

### Svelte 4 Stores to Svelte 5 Runes

```typescript
// Svelte 4
import { writable, derived } from 'svelte/store'
export const count = writable(0)

// Svelte 5
let count = $state(0)
```

### Express to SvelteKit

| Express + SPA | SvelteKit |
|---------------|-----------|
| Express routes | +page.svelte + +page.server.ts |
| REST API | +server.ts |
| Session middleware | hooks.server.ts |
| Client fetch | load() functions |

## Anti-Patterns

1. Fetching on client for initial data — use load()
2. Mutating $page.data — read-only
3. Not throwing redirect — `throw redirect()`, not `return redirect()`
4. Large layout loads — keep minimal
5. Missing +error.svelte — every app needs one
6. Not using fail() for validation — use status 400

## Common Pitfalls

1. **Fetching on client for initial data**: Use `+page.server.ts` load(), not onMount.
2. **Mutating $page.data directly**: Read-only. Use stores or form actions.
3. **Forgetting `throw redirect`**: Must be thrown, not returned.
4. **Over-fetching in layout load**: Keep minimal — runs on every navigation.
5. **Mixing server and client code**: `$page`, `$app/stores` are client-only.
6. **Missing error pages**: Add `+error.svelte`.

## Compared With

| Aspect | SvelteKit | Next.js App Router | Nuxt 3 |
|--------|-----------|-------------------|--------|
| Data loading | load functions | async component + fetch | useAsyncData |
| Mutations | form actions | Server Actions | useFetch with method |
| API endpoints | +server.ts | route.ts | server/api/ |
| Bundle size | ~5KB runtime | ~70KB+ (React) | ~40KB (Vue) |
| Hydration | Per-component | Full-page | Full-page |

## Ecosystem & Tooling

1. `npm create svelte@latest` — scaffold
2. `npm run dev` — HMR
3. `npm run build` — adapter build
4. `svelte-check` — CLI type checking
5. `@sveltejs/adapter-auto` — automatic adapter
6. `svelte-add` — add integrations

## Workflow

### Step 1: Route Structure
```
src/routes/
  +page.svelte            -- /
  +layout.svelte          -- root layout
  +layout.server.ts       -- shared data
  orders/
    +page.svelte          -- /orders
    +page.server.ts       -- orders load
    [id]/
      +page.svelte        -- /orders/:id
      +page.server.ts
  api/
    orders/
      +server.ts          -- /api/orders
```

### Step 2: Page Load
```typescript
export const load: PageServerLoad = async ({ locals, url }) => {
  return { orders: await db.order.findMany({ where: { userId: locals.user.id } }) }
}
```

### Step 3: Form Actions
```typescript
export const actions: Actions = {
  default: async ({ request }) => {
    const data = await request.formData()
    // validate, process
    throw redirect(303, '/success')
  }
}
```

### Step 4: API Endpoints
```typescript
export const GET: RequestHandler = async () => {
  return json(await db.product.findMany())
}
```

### Step 5: Hooks
```typescript
export const handle: Handle = async ({ event, resolve }) => {
  event.locals.user = await getUser(event.cookies.get('session'))
  return await resolve(event)
}
```

## Rules
- All routes follow file-based naming (+page.svelte, +layout.svelte, +server.ts).
- Data fetching in load functions, never onMount for initial data.
- Form mutations use Actions with fail() for errors, redirect() for success.
- Server-only code in lib/server/ — never import in client.
- Stores for client state only; server state flows through load functions.
- Always set cache headers for public data.

## References
  - references/endpoints-loading.md
  - references/stores-context.md
  - references/sveltekit-auth.md
  - references/sveltekit-data.md
  - references/sveltekit-deployment.md
  - references/sveltekit-routing.md
  - references/sveltekit-form-actions.md
  - references/sveltekit-deployment-adapters.md

## Handoff
Hand off to `frontend/universal/state-management/SKILL.md` or `frontend/universal/performance/SKILL.md`.
