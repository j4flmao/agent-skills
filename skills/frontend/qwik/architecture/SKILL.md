---
name: frontend-qwik-architecture
description: >
  Use this skill when the user says 'Qwik', 'Qwik architecture', 'Qwik resumable', 'Qwik City', 'Qwik component', '$()', 'resumable', 'lazy loading Qwik', 'Qwik vs React'. This skill enforces: resumability (no hydration, serialized state), dollar-sign API for lazy boundaries, Qwik City file-based routing with lazy loaders/actions, and automatic bundle splitting per component and event. Requires Qwik project (package.json with @builder.io/qwik). Do NOT use for: React, SolidJS, or other eager-hydration frameworks.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, qwik, phase-7]
---

# Qwik Architecture

## Purpose
Build instantly interactive web applications with Qwik's resumability model — no hydration, lazy everything, serialized state in HTML, and automatic code splitting per component and per event.

## Agent Protocol

### Trigger
Exact user phrases: "Qwik", "Qwik architecture", "Qwik resumable", "Qwik City", "Qwik component", "$()", "resumable", "lazy loading Qwik", "Qwik vs React".

### Input Context
Before activating, verify:
- package.json has @builder.io/qwik and @builder.io/qwik-city.
- Vite config has the Qwik plugins.
- Deployment target (Cloudflare, Vercel, Node).

### Output Artifact
No file output. Produces component code, routing patterns, and resumability explanations as text.

### Response Format
Code: show component$(), $(), routeLoader$(), routeAction$(). Show serialization and lazy boundaries.

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Components use component$() for lazy loading.
- [ ] Event handlers use $ suffix (onClick$).
- [ ] Closures use $() for lazy boundaries.
- [ ] Data loading uses routeLoader$() in Qwik City.
- [ ] Mutations use routeAction$() with Form component.
- [ ] State serialized into HTML — no hydration.
- [ ] Prefetch strategy enabled via PrefetchServiceWorker.
- [ ] Bundle split per component and per event automatically.

### Max Response Length
Code: 15 lines per example. Unlimited patterns.

## Workflow

### Step 1: Resumability Model
```tsx
export default component$(() => {
  const count = useSignal(0)
  return <button onClick$={() => count.value++}>{count.value}</button>
})
```
No hydration — HTML contains serialized state + QRL references. Browser resumes execution without replaying component. HTML is functional without JS.

### Step 2: Dollar Sign API
```tsx
export default component$(() => {
  const name = useSignal('World')

  // Lazy closure
  const greet = $((greeting: string) => {
    alert(`${greeting}, ${name.value}!`)
  })

  // Lazy event handler
  return <button onClick$={() => greet('Hello')}>Greet</button>
})
```
`component$()` — lazy component. `$()` — lazy closure. `onClick$()` — lazy event. `useVisibleTask$()` — lazy client effect.

### Step 3: Qwik City Routing
```
src/routes/
  index.tsx                 ->  /
  about/index.tsx           ->  /about
  product/[id]/index.tsx    ->  /product/:id
  dashboard/layout.tsx      ->  layout
  api/users/index.ts        ->  resource route
```
All routes, layouts, and data are lazy-loaded. Use `<Slot />` for layout children.

### Step 4: Data Loading & Actions
```tsx
export const useProductData = routeLoader$(async ({ params, redirect }) => {
  const product = await db.product.findUnique({ where: { id: params.id } })
  if (!product) throw redirect(302, '/products')
  return product as Product
})

export const useCreateProduct = routeAction$(async (form, { fail }) => {
  const name = form.get('name')
  if (!name || name.length < 2) return fail(400, { fieldErrors: { name: 'Min 2 chars' } })
  await db.product.create({ data: { name } })
  return { success: true }
})
```
Use `<Form action={action}>` for progressive enhancement.

### Step 5: Optimizations
```tsx
// Root — enable prefetching
import { PrefetchServiceWorker } from '@builder.io/qwik/prefetch-service-worker'
<head>
  <PrefetchServiceWorker />
</head>
```
Prefetch strategy is critical for instant navigation. Bundle splitting is automatic — per component and per event handler.

## Rules
- No eager code — everything is lazy by default.
- `$` suffix marks lazy boundaries (component$, onClick$, $()).
- Resumable means no JS needed for initial render or interactivity.
- Prefetch strategy is critical for instant navigation experience.
- Bundle splitting is automatic per component and per event.
- useVisibleTask$ for client-only effects — use sparingly.
- Form data is serialized — use routeAction$ for mutations.

## References
- `references/qwik-resumable.md` — resumability, serialization, dollar API, fine-grained lazy loading
- `references/qwik-city.md` — routing, loaders, actions, middleware, deployment

## Handoff
No artifact produced.
Next skill: frontend-universal-seo or frontend-universal-testing for Qwik projects.
Carry forward: component$ patterns, route loader/action conventions, prefetch strategy.
