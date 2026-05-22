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
- Cloudflare Workers: `@remix-run/cloudflare` + `@remix-run/cloudflare-pages`
- Vercel: `@remix-run/vercel` preset
- Fly.io / Node: `@remix-run/serve` or custom server

## Rules
- Loaders and actions are server-only. Never import them in client code.
- `<Form>` works without JavaScript (progressive enhancement).
- `useFetcher` for non-navigation mutations (add to cart, inline edits).
- Resource routes (no default export) for API endpoints.
- Forms revalidate all matched route loaders on action completion.
- Never fetch in components — fetch in loaders.

## References
- `references/remix-routing.md` — route modules, nested routes, layouts
- `references/remix-data.md` — loaders, actions, forms, pending UI

## Handoff
No artifact produced.
Next skill: frontend-remix-patterns for form validation, error boundaries, SEO, caching, optimistic UI.
Carry forward: route structure, loader/action patterns, session config.
