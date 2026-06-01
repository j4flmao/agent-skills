---
name: frontend-remix-patterns
description: >
  Use this skill when the user says 'Remix pattern', 'Remix form validation', 'Remix optimistic UI', 'Remix error boundary', 'Remix SEO', 'Remix caching', 'Remix PWA'. This skill enforces: server-side form validation with Zod, route-level error boundaries, meta exports for SEO, Cache-Control strategies, optimistic updates with useFetcher, and service workers for offline support. Requires existing Remix project (package.json with @remix-run/*). Do NOT use for: React-only validation, client-side-only forms.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, remix, react, patterns, phase-7]
---

# Remix Patterns

## Purpose
Apply production-grade patterns to Remix applications: server validation, error boundaries per route, SEO metadata, caching, optimistic UI, and PWA support.

## Agent Protocol

### Trigger
Exact user phrases: "Remix pattern", "Remix form validation", "Remix optimistic UI", "Remix error boundary", "Remix SEO", "Remix caching", "Remix PWA".

### Input Context
Before activating, verify:
- Remix project with @remix-run/react and a routing structure.
- Whether Zod is already installed for validation.
- Existing meta/SEO setup.
- Target deployment platform for caching strategy.

### Output Artifact
No file output. Produces code patterns for validation, error handling, SEO, caching, optimistic updates, and PWA.

### Response Format
Code examples only. Show action/loader with validation, error boundary, meta export, cache headers.

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Form validation uses Zod schema in action, returns field errors as JSON.
- [ ] Client-side enhancement shows errors inline from useActionData.
- [ ] ErrorBoundary per route with root fallback.
- [ ] meta function per route with og, twitter, canonical.
- [ ] Cache-Control headers set on loader responses.
- [ ] Optimistic updates use useFetcher with local state + rollback.
- [ ] Service worker registered from public dir with offline fallback.

### Max Response Length
Code: 15 lines per example. Unlimited patterns.

## Component Architecture / Decision Trees

### Architecture Options

| Approach | Trade-off | When to Use |
|----------|-----------|-------------|
| Server-side validation only | Simpler, no JS needed for form to work | Basic forms, login, signup |
| Server + client validation with useActionData | Better UX, instant feedback | Forms with many fields |
| Optimistic UI with useFetcher | Instant feedback, rollback on error | Likes, stars, add to cart |
| Route ErrorBoundary | Scoped error handling | Per-route error recovery |
| Root ErrorBoundary | Global fallback | Unexpected errors, network failures |
| Meta per route | SEO per page | Blog posts, product pages |
| Resource route sitemap | Dynamic sitemap generation | Sites with dynamic content |

### Decision Tree: Form Validation

```
Is the form simple (email + password)?
  ├── Yes -> Server validation with Zod
  └── No (many fields, complex rules) ->
       ├── Server validation (required)
       └── + Client enhancement with useActionData
```

### Decision Tree: Optimistic UI

```
Does the mutation need instant feedback?
  ├── No -> Standard <Form> with pending state
  └── Yes -> useFetcher + local state
       ├── Can you easily rollback? -> Optimistic update
       └── Risk of race conditions? -> Use useFetcher data for confirmation
```

### Decision Tree: Error Boundary Placement

```
Is this an expected error (404, 403)?
  ├── Yes -> throw Response in loader, use CatchBoundary (v1) or ErrorBoundary (v2)
  └── No -> ErrorBoundary for unexpected errors
       ├── Route-level -> Scoped error recovery
       └── Root-level -> Global fallback in root.tsx
```

### Decision Tree: Caching Strategy

```
Is the data user-specific?
  ├── Yes -> private, no-store (never cache)
  └── No -> Is it frequently updated?
       ├── Yes -> max-age=60, s-maxage=300
       └── No -> max-age=3600, s-maxage=86400
```

### Decision Tree: PWA vs Standard

```
Does the app need offline support?
  ├── No -> Skip service worker, standard web app
  └── Yes -> Service worker with cache-first strategy
       ├── Full offline -> Cache all routes on first visit
       └── Partial offline -> Cache static assets only
```

## Component Design Patterns

### Multi-Intent Action

```tsx
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData()
  const intent = formData.get('intent')

  switch (intent) {
    case 'create': {
      const result = createSchema.safeParse(Object.fromEntries(formData))
      if (!result.success) return json({ errors: result.error.flatten().fieldErrors, intent }, { status: 400 })
      await db.post.create({ data: result.data })
      return redirect('/posts')
    }
    case 'delete': {
      const id = formData.get('id')
      await db.post.delete({ where: { id: String(id) } })
      return json({ ok: true })
    }
    case 'toggle-pin': {
      const id = formData.get('id')
      const post = await db.post.findUnique({ where: { id: String(id) } })
      await db.post.update({ where: { id: String(id) }, data: { pinned: !post?.pinned } })
      return json({ ok: true })
    }
    default:
      throw new Response('Invalid intent', { status: 400 })
  }
}
```

### Sitemap Resource Route

```tsx
// app/routes/sitemap[.]xml.tsx
import { generateSitemap } from '@remix-run/sitemap'
import { db } from '~/db'

export async function loader({ request }: LoaderFunctionArgs) {
  const posts = await db.post.findMany({ select: { slug: true, updatedAt: true } })
  const postEntries = posts.map(p => ({
    route: `/blog/${p.slug}`,
    lastmod: p.updatedAt.toISOString(),
    changefreq: 'weekly' as const,
    priority: 0.7,
  }))

  return generateSitemap(request, [
    { route: '/', priority: 1.0 },
    { route: '/about', priority: 0.5 },
    ...postEntries,
  ])
}
```

### Meta with Dynamic Data

```tsx
export const meta: MetaFunction<typeof loader> = ({ data, params, location }) => {
  const product = data?.product
  if (!product) return [{ title: 'Product Not Found' }]

  return [
    { title: product.name },
    { name: 'description', content: product.description?.slice(0, 160) },
    { property: 'og:title', content: product.name },
    { property: 'og:description', content: product.description?.slice(0, 160) },
    { property: 'og:image', content: product.image },
    { property: 'og:url', content: `https://example.com${location.pathname}` },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: product.name },
    { tagName: 'link', rel: 'canonical', href: `https://example.com${location.pathname}` },
    { script: [{ type: 'application/ld+json', children: JSON.stringify(productSchema(product)) }] },
  ]
}
```

### Robots.txt Resource Route

```tsx
// app/routes/robots[.]txt.tsx
export function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  return new Response(
    `User-agent: *\nAllow: /\nSitemap: ${url.origin}/sitemap.xml\nDisallow: /admin`,
    { headers: { 'Content-Type': 'text/plain' } }
  )
}
```

### Scroll Restoration Pattern

```tsx
// app/root.tsx
import { ScrollRestoration } from '@remix-run/react'

export default function Root() {
  return (
    <html>
      <head />
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}
```

### Pending UI with useNavigation

```tsx
function GlobalPendingIndicator() {
  const navigation = useNavigation()
  const isPending = navigation.state !== 'idle'

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        background: isPending ? 'blue' : 'transparent',
        transition: 'background 0.3s',
        zIndex: 9999,
      }}
    />
  )
}
```

## State Management Patterns

In Remix, most state lives on the server. The patterns below handle the limited client state needed.

### Loader Data as State Source

The primary state management pattern: loaders return data, components consume it:

```tsx
export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await getUserId(request)
  const [profile, notifications, posts] = await Promise.all([
    db.profile.findUnique({ where: { userId } }),
    db.notification.findMany({ where: { userId, read: false } }),
    db.post.findMany({ where: { authorId: userId }, orderBy: { createdAt: 'desc' } }),
  ])
  return json({ profile, notifications, posts })
}

export default function Dashboard() {
  const { profile, notifications, posts } = useLoaderData<typeof loader>()
  return (/* render */)
}
```

### URL Search Params for Filter/Sort/Pagination

```tsx
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const filters = {
    search: url.searchParams.get('q') || '',
    category: url.searchParams.get('category') || '',
    sort: url.searchParams.get('sort') || 'date',
    page: Number(url.searchParams.get('page')) || 1,
  }
  // ...
  return json({ products, filters })
}

export default function Products() {
  const { filters } = useLoaderData<typeof loader>()
  const [searchParams, setSearchParams] = useSearchParams()

  return (
    <select
      value={filters.sort}
      onChange={(e) => setSearchParams(prev => {
        prev.set('sort', e.target.value)
        return prev
      })}
    >
      <option value="date">Newest</option>
      <option value="price">Price</option>
    </select>
  )
}
```

### Session Flash Messages

```tsx
export async function action({ request }: ActionFunctionArgs) {
  const session = await getSession(request.headers.get('Cookie'))
  try {
    await doSomething()
    session.flash('success', 'Done!')
    return redirect('/success', {
      headers: { 'Set-Cookie': await commitSession(session) },
    })
  } catch (e) {
    session.flash('error', 'Failed')
    return redirect('/error', {
      headers: { 'Set-Cookie': await commitSession(session) },
    })
  }
}

// In route component:
export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get('Cookie'))
  return json({
    flash: session.get('success') || session.get('error') || null,
  }, {
    headers: { 'Set-Cookie': await commitSession(session) },
  })
}
```

### useFetcher for Non-Navigation State

```tsx
function NotificationBell() {
  const fetcher = useFetcher()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (fetcher.data?.count !== undefined) setCount(fetcher.data.count)
  }, [fetcher.data])

  return (
    <button onClick={() => fetcher.load('/api/notifications/count')}>
      {count} notifications
    </button>
  )
}
```

## Performance Optimization

### Server Validation Cost
Zod validation on every action has a cost. For very large forms, consider parsing with `.safeParseAsync()` and using `z.object({...}).parse()` only on required fields. Schemas with 20+ fields should be optimized with `.strict()` to reject unexpected fields.

### Cache Strategy
| Cache Header | Effect |
|-------------|--------|
| `public, max-age=300` | Browser caches for 5 minutes |
| `s-maxage=3600` | CDN caches for 1 hour |
| `stale-while-revalidate=60` | Serves stale for 60s while refetching |
| `private, no-store` | Never cache (auth routes) |

### Optimistic UI Performance
Optimistic updates should be lightweight DOM-only changes. Avoid recalculating lists or triggering expensive operations in the optimistic callback.

### Error Boundary Cost
ErrorBoundary components are included in the route's client bundle. They are small (1-2KB) but should not contain heavy UI libraries.

### Link Prefetching
```tsx
<Link prefetch="intent" to="/products">Products</Link>     // prefetch on hover/touch
<Link prefetch="render" to="/dashboard">Dashboard</Link>    // prefetch when rendered
<Link prefetch="viewport" to="/contact">Contact</Link>      // prefetch when in viewport
<Link prefetch="none" to="/logout">Logout</Link>            // never prefetch
```

## Build & Bundle Considerations

### Build Configuration
```ts
// vite.config.ts
import { vitePlugin as remix } from '@remix-run/dev'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [remix()],
  build: {
    target: 'es2022',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) return 'vendor'
        },
      },
    },
  },
  server: { port: 3000 },
})
```

### Build Output
```
build/
  client/       -- Client bundles (JS, CSS, assets)
  server/       -- Server bundle with loaders/actions
```
Run with: `remix-serve build/server/index.js`

### CSS Strategy
- Route-level CSS via `links` export for automatic code splitting
- Global CSS in `app/root.tsx` via `links` export
- Tailwind: install `@tailwindcss/vite` plugin, import in root CSS
- CSS Modules: name files `*.module.css`, import as `import styles from './styles.module.css'`

### Environment Variables
```tsx
// Server-only (in loaders/actions): process.env.DATABASE_URL
// Client-exposed: pass through loader
export async function loader() {
  return json({ publicKey: process.env.PUBLIC_STRIPE_KEY })
}
```

## Testing Strategies

### Testing Validation Schemas

```tsx
// __tests__/schemas.test.ts
import { describe, it, expect } from 'vitest'
import { z } from 'zod'

const createProductSchema = z.object({
  name: z.string().min(1, 'Name required'),
  price: z.coerce.number().positive(),
  category: z.enum(['electronics', 'clothing', 'food']),
})

describe('createProductSchema', () => {
  it('accepts valid product data', () => {
    const result = createProductSchema.parse({ name: 'Widget', price: '10', category: 'electronics' })
    expect(result.price).toBe(10)
  })

  it('rejects missing name', () => {
    expect(() => createProductSchema.parse({ price: '10', category: 'electronics' }))
      .toThrow('Name required')
  })

  it('rejects negative price', () => {
    expect(() => createProductSchema.parse({ name: 'Widget', price: '-5', category: 'electronics' }))
      .toThrow()
  })
})
```

### Testing Actions with FormData

```tsx
// __tests__/settings.action.test.ts
import { describe, it, expect } from 'vitest'
import { action } from '../app/routes/settings'

describe('settings action', () => {
  it('validates name length', async () => {
    const formData = new FormData()
    formData.set('name', 'A')
    formData.set('email', 'test@test.com')

    const response = await action({
      request: new Request('http://localhost/settings', { method: 'POST', body: formData }),
      params: {},
      context: {},
    })

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.errors.name).toBeDefined()
  })

  it('redirects on success', async () => {
    const formData = new FormData()
    formData.set('name', 'John')
    formData.set('email', 'john@test.com')

    const response = await action({ /* ... same pattern */ })
    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toBe('/settings')
  })
})
```

### Testing Error Boundaries

```tsx
// __tests__/ErrorBoundary.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ErrorBoundary } from '../app/routes/products.$id'

describe('Product ErrorBoundary', () => {
  it('renders error message', () => {
    render(<ErrorBoundary error={new Error('Product not found')} />)
    expect(screen.getByText('Product not found')).toBeDefined()
  })
})
```

### E2E Form Testing

```tsx
// e2e/contact.spec.ts
import { test, expect } from '@playwright/test'

test('submits contact form without JS', async ({ page }) => {
  await page.goto('/contact')
  await page.fill('[name="email"]', 'test@test.com')
  await page.fill('[name="message"]', 'Hello')
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL(/\/thanks/)
})

test('shows validation errors', async ({ page }) => {
  await page.goto('/contact')
  await page.click('button[type="submit"]')
  await expect(page.locator('[aria-invalid="true"]')).toHaveCount(2)
})
```

## Migration Patterns

### Express API to Remix Resource Route

```tsx
// Before: Express
app.get('/api/products', async (req, res) => {
  const products = await db.product.findMany()
  res.json(products)
})

// After: Remix resource route
export async function loader() {
  return json(await db.product.findMany())
}
```

### React Router SPA to Remix

```tsx
// Before: SPA with client data fetching
function ProductPage() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  useEffect(() => { fetch(`/api/products/${id}`).then(r => r.json()).then(setProduct) }, [id])
  if (!product) return <Spinner />
  return <ProductDetail product={product} />
}

// After: Remix
export async function loader({ params }) {
  const product = await db.product.findUnique({ where: { id: params.id } })
  if (!product) throw new Response(null, { status: 404 })
  return json(product)
}
export default function ProductPage() {
  const product = useLoaderData<typeof loader>()
  return <ProductDetail product={product} />
}
```

### Form Handling Migration

```tsx
// Before: Client-side fetch
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault()
  const res = await fetch('/api/contact', {
    method: 'POST',
    body: new FormData(e.currentTarget as HTMLFormElement),
  })
  if (res.ok) navigate('/thanks')
}

// After: Remix
export async function action({ request }) {
  const formData = await request.formData()
  // validate and process
  return redirect('/thanks')
}
// Component: <Form method="post">...</Form>
```

## Anti-Patterns

### Client-Side Validation Only

```tsx
// Anti-pattern: validation only on client
function handleSubmit(e) {
  e.preventDefault()
  if (!email.includes('@')) return setError('Invalid email')
  fetch('/api/contact', { method: 'POST', body: new FormData(e.target) })
}

// Correct: validate on server always
export async function action({ request }) {
  const result = schema.safeParse(formData)
  if (!result.success) return json({ errors: result.error.flatten().fieldErrors }, { status: 400 })
}
```

### Loading Data in useEffect

```tsx
// Anti-pattern: client-side fetch in component
useEffect(() => { fetch('/api/products').then(r => r.json()).then(setProducts) }, [])

// Correct: loader
export async function loader() { return json(await db.product.findMany()) }
```

### Not Returning Proper Status Codes

```tsx
// Anti-pattern: returning 200 with error
return json({ error: 'Not found' }) // status 200

// Correct
throw new Response('Not found', { status: 404 })
```

### Mixing Client and Server Routes

Don't have overlapping route patterns between Remix routes and external API routes. If `/api/products` is a Remix resource route, don't also proxy to an external API at the same path.

### One Giant Meta Function

```tsx
// Anti-pattern: all meta in one route
// meta should be per-route, specific to the page content
```

### Missing Focus Management

After form submission with errors, focus should move to the first invalid field. Remix doesn't do this automatically:

```tsx
useEffect(() => {
  if (actionData?.errors) {
    const firstError = document.querySelector('[aria-invalid="true"]')
    if (firstError instanceof HTMLElement) firstError.focus()
  }
}, [actionData])
```

### Overusing useFetcher for Navigation Mutations

`useFetcher` does not update the URL. For mutations that should change the URL (create, delete that redirects), use `<Form>` instead.

## Common Pitfalls

### Pitfall 1: Client-Only Validation
Client validation is an enhancement. Server validation is mandatory. Always validate in the action.

### Pitfall 2: Not Using useActionData for Errors
Returning validation errors without `useActionData` forces a full page reload and no inline error display. Always return errors as JSON with 4xx status.

### Pitfall 3: Caching Authenticated Routes
Never Cache-Control authenticated routes. Use `private, no-store` or omit the header.

### Pitfall 4: One Big Action Function
Using a single action with `intent` field is cleaner than multiple routes. Wrap in a switch statement for readability.

### Pitfall 5: Missing Error Boundaries
Without route-level ErrorBoundary, an error in one component crashes the entire page. Add ErrorBoundary to every layout route at minimum.

### Pitfall 6: Not Handling useFetcher Idle State
`useFetcher` has `idle`, `loading`, and `submitting` states. Check `fetcher.state` before displaying data to avoid showing stale or undefined values.

## Compared With

### Remix Form Validation vs React Hook Form
Remix validates on the server natively; React Hook Form is client-first. Remix works without JS; React Hook Form requires JS. For Remix projects, Zod + server validation is the idiomatic approach.

### Remix Optimistic UI vs TanStack Query
Both support optimistic updates. Remix's useFetcher approach is simpler (form-based) but less flexible. TanStack Query has richer cache invalidation and retry logic but requires more setup.

### Remix Meta vs Next.js Metadata API
Remix's `meta` export is a function that receives loader data, making it truly dynamic per request. Next.js's `generateMetadata` is similar but Remix's approach is more explicit about the data dependency.

## Ecosystem & Tooling

### Core Libraries
| Library | Purpose |
|---------|---------|
| zod | Schema validation for actions |
| remix-validated-form | Declarative form validation |
| @remix-run/node | Session storage, cookie management |
| @remix-run/react | Client hooks (useActionData, useFetcher) |

### SEO Tools
| Tool | Purpose |
|------|---------|
| @remix-run/sitemap | Sitemap generation |
| robots.txt resource route | Crawler directives |
| JSON-LD in <script> | Structured data for rich snippets |

### Caching Tools
| Tool | Purpose |
|------|---------|
| Cache-Control headers | HTTP caching |
| CDN (Cloudflare, Fastly) | Edge caching |
| Arcache | Remix cache utility |
| remix-cache | Cache management library |

### Testing
- Vitest + React Testing Library for component tests.
- `@remix-run/testing` for loader/action unit tests.
- Playwright for E2E form submission flow.

### Community
- Docs: remix.run/docs
- GitHub: github.com/remix-run/remix
- Discord: discord.gg/remix
- Indie Stack: remix.run/stack/indie

## Workflow

### Step 1: Form Validation (Zod in Action)
```tsx
const schema = z.object({ email: z.string().email(), password: z.string().min(8) })
export async function action({ request }: ActionFunctionArgs) {
  const formData = Object.fromEntries(await request.formData())
  const result = schema.safeParse(formData)
  if (!result.success) return json({ errors: result.error.flatten().fieldErrors }, { status: 400 })
  await createUser(result.data)
  return redirect('/dashboard')
}
```
Use `useActionData` in the component to display field-level errors. `aria-invalid` on inputs.

### Step 2: Error Handling (ErrorBoundary)
```tsx
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <div><h1>Error</h1><p>{error.message}</p></div>
}
```
Catch boundary for 404/403: `throw new Response('Not Found', { status: 404 })`. Root error boundary in root.tsx catches all unhandled errors.

### Step 3: SEO (Meta + Sitemap)
```tsx
export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: data?.product?.name ?? 'Not Found' },
  { name: 'description', content: data?.product?.description?.slice(0, 160) },
  { property: 'og:title', content: data?.product?.name },
  { tagName: 'link', rel: 'canonical', href: `https://site.com${location.pathname}` },
]
```
Sitemap as resource route `sitemap[.]xml.tsx`. Robots.txt as resource route. JSON-LD in component via `<script>`.

### Step 4: Caching
```tsx
export async function loader({ request }: LoaderFunctionArgs) {
  return json(data, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=60' },
  })
}
```
Use `s-maxage` for CDN cache. `stale-while-revalidate` for background refresh. No caching for authenticated routes.

### Step 5: Optimistic UI
```tsx
function LikeButton({ postId }: { postId: string }) {
  const fetcher = useFetcher()
  const optimisticLiked = fetcher.formData?.get('liked') === 'true'
  return (
    <fetcher.Form method="post" action="/api/like">
      <input type="hidden" name="liked" value={String(!optimisticLiked)} />
      <button type="submit">{optimisticLiked ? 'Unlike' : 'Like'}</button>
    </fetcher.Form>
  )
}
```
Rollback: compare `fetcher.data` with optimistic value; revert on error.

### Step 6: PWA
Place `sw.js` in `public/`. Register from root.tsx `<Scripts>` after. Manifest as resource route returning JSON. Offline page as route with service worker cache-first strategy.

### Step 7: Pending States with useNavigation
```tsx
function SubmitButton() {
  const navigation = useNavigation()
  const isPending = navigation.state === 'submitting'
  return <button type="submit" disabled={isPending}>{isPending ? 'Saving...' : 'Save'}</button>
}
```

## Rules
- Validate on server always. Client validation is enhancement only.
- Error boundaries are per route with a root fallback.
- Meta is server-side — dynamic per request, not client-side.
- Cache public routes aggressively. Never cache authenticated data.
- Optimistic updates must handle rollback when action fails.
- Service worker updates should use skip-waiting pattern.
- Use useNavigation for pending states on <Form> submissions.
- Use useFetcher for non-navigation mutations.
- Return errors as JSON with 4xx status codes, not redirects.
- Use Zod for all server-side validation schemas.

## References
- references/remix-data-patterns.md — Remix Data Patterns
- references/remix-form-patterns.md — Remix Form Patterns
- references/remix-forms.md — Remix Forms — Validation, Progressive Enhancement, Pending States
- references/remix-routing.md — Remix Routing & Validation Patterns
- references/remix-seo.md — Remix SEO — Meta, Sitemap, JSON-LD, Canonical
- references/remix-validation.md — Remix Form Validation Patterns
- references/remix-optimistic-ui.md — Remix Optimistic UI Patterns
- references/remix-error-boundaries.md — Remix Error Boundaries and Error Handling

## Handoff
No artifact produced.
Next skill: frontend-react-architecture for shared React patterns (component composition, hooks, state management).
Carry forward: validation schemas, cache strategy, error boundary patterns.
