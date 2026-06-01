---
name: frontend-remix-architecture
description: >
  Use this skill when the user says 'Remix', 'Remix architecture', 'Remix routing', 'Remix loader', 'Remix action', 'Remix form', 'Remix server', 'Remix session', 'Remix deployment', 'Remix Vite'. This skill enforces: file-based colocation, nested routes with Outlet, layout routes for shared UI, loaders for data, actions for mutations, session storage strategies, and deployment per runtime. Requires Remix + Vite (package.json with @remix-run/*). Do NOT use for: Next.js, TanStack Router, or React Router alone.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, remix, react, phase-7]
---

# Remix Architecture

## Purpose
Build Remix applications with file-based routing, server-side data loading, progressive form mutations, and per-runtime deployment. Everything runs on the server by default.

## Agent Protocol

### Trigger
Exact user phrases: "Remix", "Remix architecture", "Remix routing", "Remix loader", "Remix action", "Remix form", "Remix server", "Remix session", "Remix deployment", "Remix Vite".

### Input Context
Before activating, verify:
- package.json has @remix-run/react and @remix-run/node dependencies.
- Check entry.server.tsx and root.tsx patterns.
- Determine server runtime: Node, Cloudflare Workers, or Deno.
- Confirm Vite plugin setup (@remix-run/vite).

### Output Artifact
No file output. Produces route structure, loader/action code, and deployment configs as text.

### Response Format
Route structure:
```
app/routes/
  _index.tsx
  products.$id.tsx
  admin.tsx + admin.users.tsx
```

Code: show loader, action, component in one file.

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Routes use file-based colocation with nested Outlet layout routes.
- [ ] Loaders fetch data in parallel for matched routes.
- [ ] Actions handle POST/PUT/PATCH/DELETE with form data validation.
- [ ] Session storage configured (cookie/memory/DB) with flash messages.
- [ ] Auth guard in root loader redirects unauthenticated requests.
- [ ] Deployment target adapter configured (Cloudflare/Vercel/Fly).
- [ ] Vite build produces correct server bundles per runtime.

### Max Response Length
Route structure: unlimited. Code: 15 lines per example.

## Component Architecture / Decision Trees

### Architecture Options

| Approach | Trade-off | When to Use |
|----------|-----------|-------------|
| Flat route files (dot notation) | Simple, flat folder | Small apps with few routes |
| Folder-based routes (folders + route.tsx) | Organized, scalable | Large apps with many child routes |
| Pathless layout routes (__ prefix) | Shared UI without URL nesting | Auth layouts, onboarding flows |
| Resource routes (no component export) | JSON APIs, files, webhooks | API endpoints, sitemaps, RSS |
| Server loaders vs universal loaders | Server load: DB access, no client bundle | Private data |
| Universal loaders | Public API calls, runs on client too | Public data, cached responses |

### Decision Tree: Route Type

```
Does the route need to render UI?
  ├── No -> Resource route (export loader/action only)
  └── Yes -> Is there shared UI with sibling routes?
       ├── Yes -> Layout route with <Outlet />
       └── No -> Flat route page
```

### Decision Tree: Loader Type

```
Does the loader need server-only data (DB, secrets)?
  ├── Yes -> Server loader (+page.server.ts)
  └── No -> Is the data public and cacheable?
       ├── Yes -> Universal loader (+page.ts) with Cache-Control
       └── No -> Server loader
```

### Decision Tree: Session Strategy

```
How should user sessions persist?
  ├── Cookie-only (small payload) -> createCookieSessionStorage
  ├── Server-side DB (large payload) -> createSessionStorage with DB
  └── Signed cookies (medium payload) -> createCookie + session
```

### Decision Tree: Deployment Target

```
Which runtime?
  ├── Node.js (Fly, Railway, DIY) -> @remix-run/node + @remix-run/serve
  ├── Cloudflare Workers -> @remix-run/cloudflare
  ├── Vercel Edge -> @remix-run/vercel preset
  ├── Netlify Edge -> @remix-run/netlify
  └── Deno -> @remix-run/deno
```

### Decision Tree: Error Handling Strategy

```
What type of error?
  ├── Expected (404, 403, 400) -> throw new Response(status) + ErrorBoundary
  ├── Unexpected (crash, network) -> ErrorBoundary per route + root fallback
  └── Validation error -> return json({ errors }, { status: 400 }) + useActionData
```

## Component Design Patterns

### Layout Route with Outlet

```tsx
// app/routes/dashboard.tsx
import { Outlet, useLoaderData } from '@remix-run/react'
import { json } from '@remix-run/node'

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getSessionUser(request)
  if (!user) throw new Response('Unauthorized', { status: 401 })
  return json({ user })
}

export default function DashboardLayout() {
  const { user } = useLoaderData<typeof loader>()
  return (
    <div>
      <nav><span>{user.name}</span><a href="/logout">Logout</a></nav>
      <main><Outlet /></main>
    </div>
  )
}
```

### Data-Fetching Route with defer

```tsx
// app/routes/products.$id.tsx
import { json, defer } from '@remix-run/node'
import { Await, useLoaderData } from '@remix-run/react'
import { Suspense } from 'react'

export async function loader({ params }: LoaderFunctionArgs) {
  const product = await db.product.findUnique({ where: { id: params.id } })
  if (!product) throw new Response('Not Found', { status: 404 })
  const reviews = db.review.findMany({ where: { productId: params.id } })
  return defer({ product, reviews })
}

export default function ProductPage() {
  const { product, reviews } = useLoaderData<typeof loader>()
  return (
    <div>
      <h1>{product.name}</h1>
      <Suspense fallback={<div>Loading reviews...</div>}>
        <Await resolve={reviews}>{(reviews) => <ReviewList reviews={reviews} />}</Await>
      </Suspense>
    </div>
  )
}
```

### Form with Validation

```tsx
// app/routes/settings.tsx
import { Form, useActionData, useNavigation } from '@remix-run/react'
import { json, redirect } from '@remix-run/node'
import { z } from 'zod'

const schema = z.object({ name: z.string().min(2), email: z.string().email() })

export async function action({ request }: ActionFunctionArgs) {
  const formData = Object.fromEntries(await request.formData())
  const result = schema.safeParse(formData)
  if (!result.success) return json({ errors: result.error.flatten().fieldErrors }, { status: 400 })
  await db.user.update({ where: { email: result.data.email }, data: result.data })
  return redirect('/settings')
}

export default function Settings() {
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  return (
    <Form method="post">
      <input name="name" aria-invalid={actionData?.errors?.name} />
      {actionData?.errors?.name && <span>{actionData.errors.name}</span>}
      <input name="email" aria-invalid={actionData?.errors?.email} />
      <button type="submit" disabled={navigation.state === 'submitting'}>
        {navigation.state === 'submitting' ? 'Saving...' : 'Save'}
      </button>
    </Form>
  )
}
```

### Resource Route (API Endpoint)

```tsx
// app/routes/api.products.tsx
import { json } from '@remix-run/node'

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const category = url.searchParams.get('category')
  const products = await db.product.findMany({
    where: category ? { category } : undefined,
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return json(products, {
    headers: { 'Cache-Control': 'public, max-age=60' },
  })
}

export async function action({ request }: ActionFunctionArgs) {
  const product = await request.json()
  const created = await db.product.create({ data: product })
  return json(created, { status: 201 })
}
```

### Optimistic UI with useFetcher

```tsx
// app/routes/products.$id.tsx
import { useFetcher } from '@remix-run/react'

function LikeButton({ productId, liked }: { productId: string; liked: boolean }) {
  const fetcher = useFetcher()
  const optimisticLiked = fetcher.formData?.get('liked') === 'true'
  return (
    <fetcher.Form method="post" action={`/api/products/${productId}/like`}>
      <input type="hidden" name="liked" value={String(!optimisticLiked)} />
      <button type="submit">{optimisticLiked ? 'Unlike' : 'Like'}</button>
    </fetcher.Form>
  )
}
```

## State Management Patterns

### Server State via Loaders (Primary Pattern)

Remix's core philosophy: data in loaders, mutations in actions. No client-side cache needed for most data:

```tsx
export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getSessionUser(request)
  const [posts, notifications] = await Promise.all([
    db.post.findMany({ where: { authorId: user.id } }),
    db.notification.findMany({ where: { userId: user.id, read: false } }),
  ])
  return json({ user, posts, notifications })
}
```

### Session State via Cookies

```tsx
import { createCookieSessionStorage } from '@remix-run/node'

const { getSession, commitSession, destroySession } = createCookieSessionStorage({
  cookie: {
    name: '__session',
    secrets: ['s3cret'],
    sameSite: 'lax',
    httpOnly: true,
    secure: true,
    maxAge: 604_800, // 1 week
  },
})

export async function getAuthSession(request: Request) {
  const session = await getSession(request.headers.get('Cookie'))
  return {
    getUserId: () => session.get('userId'),
    setUserId: (id: string) => session.set('userId', id),
    getFlash: () => session.get('flash'),
    setFlash: (key: string, value: string) => session.flash(key, value),
    commit: () => commitSession(session),
    destroy: () => destroySession(session),
  }
}
```

### URL State via Search Params

```tsx
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const page = Number(url.searchParams.get('page')) || 1
  const sort = url.searchParams.get('sort') || 'date'
  const search = url.searchParams.get('q') || ''

  const [products, total] = await Promise.all([
    db.product.findMany({
      skip: (page - 1) * 20,
      take: 20,
      orderBy: sort === 'price' ? { price: 'asc' } : { createdAt: 'desc' },
      where: search ? { name: { contains: search } } : undefined,
    }),
    db.product.count(),
  ])
  return json({ products, total, page, sort, search })
}
```

### Form State via useActionData

```tsx
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData()
  const result = schema.safeParse(Object.fromEntries(formData))
  if (!result.success) {
    return json({
      errors: result.error.flatten().fieldErrors,
      values: Object.fromEntries(formData),
    }, { status: 400 })
  }
  return redirect('/success')
}
```

## Performance Optimization

### Parallel Data Loading
Remix loads all matched route loaders in parallel. A page with `root.tsx` + `dashboard.layout.tsx` + `dashboard.index.tsx` fires all three loaders simultaneously. Use `Promise.all` inside individual loaders for further parallelization.

### Caching Strategy
```tsx
export async function loader({ request }: LoaderFunctionArgs) {
  return json(data, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=60' },
  })
}
```
- `max-age`: Browser cache duration
- `s-maxage`: CDN cache duration
- `stale-while-revalidate`: Background refresh window
- Never cache authenticated routes

### Bundle Size
- Remix uses code-splitting per route automatically.
- Server code (loaders, actions) is tree-shaken from client bundles.
- Route components lazy-load on navigation for faster initial loads.

### Streaming with defer
```tsx
export async function loader({ params }: LoaderFunctionArgs) {
  const product = await db.product.findUnique({ where: { id: params.id } })
  const reviews = db.review.findMany({ where: { productId: params.id } })
  return defer({ product, reviews })
}
```
Use `defer` + `<Suspense>` + `<Await>` for non-critical data. This sends the page shell immediately and streams in non-critical content.

### Prefetching
```tsx
<Link prefetch="intent" to="/products">Products</Link>   // Prefetch on hover
<Link prefetch="render" to="/about">About</Link>         // Prefetch when rendered
<Link prefetch="viewport" to="/contact">Contact</Link>   // Prefetch when in viewport
```

## Build & Bundle Considerations

### Vite Configuration

```ts
// vite.config.ts
import { vitePlugin as remix } from '@remix-run/dev'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [remix(), tsconfigPaths()],
  build: {
    target: 'es2022',
    sourcemap: process.env.SOURCE_MAP === 'true',
  },
})
```

### Build Commands
```bash
npm run build    # Production build (output in build/)
npm run dev      # Dev server with HMR
npx remix routes # Visualize route hierarchy
```

### Adapter-Specific Builds
```ts
// Cloudflare Pages
import { cloudflarePages } from '@remix-run/cloudflare-pages'

// Vercel
import { vercelPreset } from '@remix-run/vercel'
plugins: [remix({ presets: [vercelPreset()] })]

// Custom Node server
// build/server/index.js with @remix-run/serve
```

### Environment Variables
```tsx
// Server-side (in loaders/actions)
process.env.DATABASE_URL

// Client-side (bundled at build time)
// Remix does not expose env vars to client automatically
// Use loader to pass env vars: return json({ publicKey: process.env.PUBLIC_KEY })
```

### CSS Strategy
- Remix supports CSS Modules, Tailwind, CSS-in-JS, and plain CSS
- Global styles in `app/root.tsx` via `links` export
- Route-level styles via `links` export for code-split CSS
- Use Tailwind with `@tailwind base; @tailwind components; @tailwind utilities` in root CSS

## Testing Strategies

### Unit Testing Loaders

```tsx
// __tests__/products.loader.test.ts
import { describe, it, expect } from 'vitest'
import { loader } from '../app/routes/products._index'

describe('products loader', () => {
  it('returns paginated products', async () => {
    const request = new Request('http://localhost/products?page=1&sort=date')
    const response = await loader({ request, params: {}, context: {} })
    const data = await response.json()
    expect(data).toHaveProperty('products')
    expect(data).toHaveProperty('total')
  })

  it('filters by search query', async () => {
    const request = new Request('http://localhost/products?q=widget')
    const response = await loader({ request, params: {}, context: {} })
    const data = await response.json()
    expect(data.products.every((p: any) => p.name.includes('widget'))).toBe(true)
  })
})
```

### Unit Testing Actions

```tsx
// __tests__/settings.action.test.ts
import { describe, it, expect } from 'vitest'
import { action } from '../app/routes/settings'

describe('settings action', () => {
  it('returns validation errors for invalid data', async () => {
    const formData = new FormData()
    formData.set('name', 'A')
    const request = new Request('http://localhost/settings', {
      method: 'POST',
      body: formData,
    })
    const response = await action({ request, params: {}, context: {} })
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.errors).toHaveProperty('name')
  })
})
```

### Component Testing with useLoaderData Mock

```tsx
// __tests__/ProductPage.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ProductPage from '../app/routes/products.$id'

vi.mock('@remix-run/react', async () => {
  const actual = await vi.importActual('@remix-run/react')
  return { ...actual, useLoaderData: () => ({ product: { name: 'Widget', price: 10 } }) }
})

describe('ProductPage', () => {
  it('renders product name', () => {
    render(<ProductPage />)
    expect(screen.getByText('Widget')).toBeDefined()
  })
})
```

### E2E Testing with Playwright

```tsx
// e2e/products.spec.ts
import { test, expect } from '@playwright/test'

test('loads product page', async ({ page }) => {
  await page.goto('/products/1')
  await expect(page.locator('h1')).toBeVisible()
})

test('submits review form', async ({ page }) => {
  await page.goto('/products/1')
  await page.fill('[name="rating"]', '5')
  await page.fill('[name="comment"]', 'Great!')
  await page.click('button[type="submit"]')
  await expect(page.locator('.success')).toBeVisible()
})
```

## Migration Patterns

### React Router SPA to Remix

**Phase 1 — Layout migration:**
```
// Before: SPA layout with client-side data fetching
function App() { return <BrowserRouter><Routes>...</Routes></BrowserRouter> }

// After: Remix root.tsx layout
export default function Root() { return <html><body><Outlet /></body></html> }
```

**Phase 2 — Move data fetching to loaders:**
```tsx
// Before: useEffect + fetch in component
useEffect(() => { fetch('/api/products').then(r => r.json()).then(setProducts) }, [])

// After: loader
export async function loader() { return json(await db.product.findMany()) }
```

**Phase 3 — Replace API routes:**
```
// Before: Express API route
app.get('/api/products', (req, res) => res.json(products))

// After: Remix resource route
export async function loader() { return json(products) }
```

### Express/API + SPA to Remix

| Express + SPA | Remix |
|---------------|-------|
| Express routes + React Router | Remix file-based routes |
| Express API endpoints | Remix resource routes |
| Session middleware | createCookieSessionStorage |
| Client-side data fetching | Server loaders |
| Form submission via fetch | <Form> with actions |
| Client state management | Server state (loaders/actions) |

## Anti-Patterns

### Client-Side Data Fetching

```tsx
// Anti-pattern: fetching data in useEffect
useEffect(() => {
  fetch('/api/products').then(r => r.json()).then(setProducts)
}, [])

// Correct: load data in loader
export async function loader() { return json(await db.product.findMany()) }
```

### Not Using Form for Mutations

```tsx
// Anti-pattern: fetch for form submission
async function handleSubmit(e) {
  e.preventDefault()
  await fetch('/api/contact', { method: 'POST', body: new FormData(e.target) })
}

// Correct: use <Form>
<Form method="post"><input name="email" /><button type="submit">Submit</button></Form>
```

### Returning Errors as Redirects

```tsx
// Anti-pattern: redirect on validation error
return redirect('/form?error=invalid')

// Correct: return JSON with error
return json({ errors: { email: 'Invalid' } }, { status: 400 })
```

### One Giant Action Function

```tsx
// Anti-pattern: 100-line action function
export async function action({ request }) {
  const formData = await request.formData()
  const intent = formData.get('intent')
  // ... 100 lines of switch statement
}
```

Extract validation logic, database operations, and error handling into separate utilities.

### Missing Error Boundary

Every layout route should have an ErrorBoundary. Without it, a runtime error crashes the entire page with a blank screen.

## Common Pitfalls

### Pitfall 1: Importing Loaders in Client Components
Loaders and actions are server-only. Never import them in client code or module scope. Use `useLoaderData()` on the client to access returned data.

### Pitfall 2: Missing Error Handling for Missing Data
```tsx
export async function loader({ params }: LoaderFunctionArgs) {
  const product = await db.product.findUnique({ where: { id: params.id } })
  // Wrong — no null check, component will crash
  return json({ product })

  // Correct
  if (!product) throw new Response('Not Found', { status: 404 })
  return json({ product })
}
```

### Pitfall 3: Building URLs Manually
Use `@remix-run/react` utilities (`<Link>`, `useNavigate`, `useParams`) instead of string concatenation for URLs. This ensures type safety and handles encoding.

### Pitfall 4: Not Using Form for Mutations
`<Form>` works without JavaScript (progressive enhancement). Using `fetch` + `useFetcher` for mutations sacrifices this. Only use `useFetcher` when the mutation should not navigate (add to cart, inline edit).

### Pitfall 5: Confusing Pathless vs Nested Layouts
Pathless layout routes (`__auth.login.tsx`) do not add URL segments. Nested layouts (`admin.users.tsx`) correspond to `/admin/users`. Mixing them incorrectly creates broken URL structures.

## Compared With

### Remix vs Next.js
| Aspect | Remix | Next.js |
|--------|-------|---------|
| Routing | File-based colocation (flat/folder) | File-based (App Router) |
| Data loading | Loaders (parallel, nested) | Server Components + API routes |
| Mutations | Actions + <Form> | Server Actions |
| Session | Built-in session storage | Manual (next-auth, iron-session) |
| Form handling | Progressive enhancement by default | Client or Server Actions |
| Caching | HTTP Cache-Control driven | Static Generation, ISR, Full Route Cache |
| Learning curve | Lower (web standards) | Moderate (framework conventions) |
| Deployment | Adapters per runtime | Vercel-first |

### Remix vs TanStack Router
Remix is a full-stack framework with server loaders/actions. TanStack Router is a client-side router for SPAs. Remix is better for SSR apps; TanStack Router is better for complex client-side routing with search params.

### Remix vs SvelteKit
Both embrace web standards (fetch, FormData, Request/Response). SvelteKit is more opinionated with file conventions and simpler syntax. Remix uses React and has a richer ecosystem for React developers.

## Ecosystem & Tooling

### Core Packages
| Package | Purpose |
|---------|---------|
| @remix-run/react | Client-side runtime (hooks, components) |
| @remix-run/node | Node.js runtime utilities |
| @remix-run/cloudflare | Cloudflare Workers runtime |
| @remix-run/deno | Deno runtime |
| @remix-run/serve | Production Node server |
| @remix-run/dev | Development tools (Vite plugin) |

### Deployment Presets
| Preset | Platform |
|--------|----------|
| @remix-run/vercel | Vercel |
| @remix-run/netlify | Netlify |
| @remix-run/cloudflare-pages | Cloudflare Pages |
| remix-architect | AWS Architect |
| fly.io | Custom Node deployment |

### Tools
- **Remix VS Code Extension** — Route navigation, auto-import for loader/action types.
- **remix dev** — Development server with HMR.
- **remix build** — Production build with code splitting.
- **remix routes** — Visualize route hierarchy.
- **Class Variance Authority (CVA)** — For reusable component variants.

### Community
- Docs: remix.run
- GitHub: github.com/remix-run/remix
- Discord: discord.gg/remix
- Examples: github.com/remix-run/examples

## Workflow

### Step 1: Route Structure (File-Based Colocation)
```
app/routes/
  _index.tsx               ->  /
  about.tsx                ->  /about
  products._index.tsx      ->  /products
  products.$id.tsx         ->  /products/:id
  products.$id.edit.tsx    ->  /products/:id/edit
  admin.tsx                ->  layout for /admin/*
  admin.users.tsx          ->  /admin/users
  api.products.tsx         ->  /api/products (resource route)
```
Use `__` prefix for pathless layout routes. Use `.` for path nesting without folders.

### Step 2: Data Loading (Loader + Parallel)
```tsx
export async function loader({ params, request }: LoaderFunctionArgs) {
  const [product, reviews] = await Promise.all([
    db.product.findUnique({ where: { id: params.id } }),
    db.review.findMany({ where: { productId: params.id } }),
  ])
  if (!product) throw new Response('Not Found', { status: 404 })
  return json({ product, reviews })
}
```
Set Cache-Control headers for public routes. Use `defer` for non-critical data wrapped in `<Suspense>` + `<Await>`.

### Step 3: Mutations (Action + Form)
```tsx
export async function action({ params, request }: ActionFunctionArgs) {
  const formData = await request.formData()
  const intent = formData.get('intent')
  if (intent === 'delete') {
    await db.product.delete({ where: { id: params.id } })
    return redirect('/products')
  }
  const name = formData.get('name')
  if (!name) return json({ errors: { name: 'Required' } }, { status: 400 })
  await db.product.update({ where: { id: params.id }, data: { name } })
  return json({ ok: true })
}
```
Use hidden `intent` field for multiple actions per route. Return errors as JSON with 400 status for validation.

### Step 4: Session & Auth
```tsx
import { createCookieSessionStorage } from '@remix-run/node'

const { getSession, commitSession, destroySession } = createCookieSessionStorage({
  cookie: { name: '__session', secrets: ['s3cret'], sameSite: 'lax', httpOnly: true, secure: true },
})
```
Flash messages: `session.flash('error', 'Invalid credentials')`. Auth guard: check session in root loader, redirect to login if missing.

### Step 5: Deployment Targets
```ts
// vite.config.ts
import { vitePlugin as remix } from '@remix-run/dev'
import { defineConfig } from 'vite'
import { vercelPreset } from '@remix-run/vercel'

export default defineConfig({
  plugins: [remix({ presets: [vercelPreset()] })],
})
```
Cloudflare Workers: `@remix-run/cloudflare` + `@remix-run/cloudflare-pages`. Vercel: `@remix-run/vercel` preset. Fly.io / Node: `@remix-run/serve` or custom server.

### Step 6: Error and Catch Boundaries
```tsx
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <div><h1>Error</h1><p>{error.message}</p></div>
}
```
Catch boundary for expected errors (404, 403). Error boundary for unexpected errors.

## Rules
- Loaders and actions are server-only. Never import them in client code.
- `<Form>` works without JavaScript (progressive enhancement).
- `useFetcher` for non-navigation mutations (add to cart, inline edits).
- Resource routes (no default export) for API endpoints.
- Forms revalidate all matched route loaders on action completion.
- Never fetch in components — fetch in loaders.
- Use `defer` to stream non-critical data with Suspense.
- Always set Cache-Control headers on public loaders.
- Use session.flash for one-time messages (success, error).
- Throw Response (not return) for 404/403 in loaders.

## References
- references/remix-data-loading.md — Remix Data Loading Patterns
- references/remix-data.md — Remix Data — Loaders, Actions, Forms, and Pending UI
- references/remix-deployment.md — Remix Deployment
- references/remix-error-handling.md — Remix Error Handling
- references/remix-loader-patterns.md — Remix Loader Patterns
- references/remix-routing.md — Remix Routing — Route Modules, Nested Routes, Layouts
- references/remix-sessions-auth.md — Remix Sessions and Authentication
- references/remix-caching-strategies.md — Remix Caching Strategies

## Handoff
No artifact produced.
Next skill: frontend-remix-patterns for form validation, error boundaries, SEO, caching, optimistic UI.
Carry forward: route structure, loader/action patterns, session config.
