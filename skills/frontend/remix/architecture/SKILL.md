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

## Performance Considerations

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
