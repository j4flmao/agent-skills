---
name: frontend-qwik-patterns
description: >
  Use this skill when the user says 'Qwik pattern', 'Qwik resumable', 'Qwik City route', 'useSignal', 'useStore', 'Qwik lazy loading', 'Qwik optimizer', '$()', 'component$()', 'routeLoader$', 'routeAction$'. This skill enforces: resumability over hydration, dollar-sign API for all lazy boundaries, fine-grained reactivity with useSignal/useStore, Qwik City file-based routing with lazy loaders/actions, and optimistic prefetching via PrefetchServiceWorker. Requires Qwik project (package.json with @builder.io/qwik). Do NOT use for: Qwik project setup/architecture, or non-Qwik frameworks.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, qwik, patterns, phase-10]
---

# Qwik Patterns

## Purpose
Apply production patterns to Qwik applications: resumability-driven architecture, fine-grained reactivity, lazy loading boundaries, Qwik City routing with server functions, and prefetch optimization.

## Agent Protocol

### Trigger
Exact user phrases: "Qwik pattern", "Qwik resumable", "Qwik City", "useSignal", "useStore", "Qwik lazy loading", "Qwik optimizer", "$()", "component$()", "routeLoader$", "routeAction$".

### Input Context
Before activating, verify:
- package.json has @builder.io/qwik and @builder.io/qwik-city.
- Vite config has Qwik plugins.
- Prefetch strategy is configured (PrefetchServiceWorker).

### Output Artifact
No file output. Produces resumability plan, component patterns, route design as text.

### Response Format
```
Resumability Plan: {lazy boundary map}
Component Pattern: {component$ / $() usage}
Route Design: {loaders + actions + layout}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] All components use component$() for lazy loading.
- [ ] Event handlers use $ suffix (onClick$, onInput$).
- [ ] Closures passed across lazy boundaries use $().
- [ ] State uses useSignal (primitive) or useStore (object).
- [ ] Data loading uses routeLoader$() with typed returns.
- [ ] Mutations use routeAction$() with Form component.
- [ ] PrefetchServiceWorker enabled in root layout.
- [ ] useVisibleTask$ used sparingly and only for client-only effects.

### Max Response Length
2560 tokens.

## Workflow

### Step 1: Resumability Pattern
```tsx
export default component$(() => {
  const count = useSignal(0)

  return (
    <button onClick$={() => count.value++}>
      {count.value}
    </button>
  )
})
```
No hydration: HTML contains serialized state (`data-qwik`) + QRL references to lazy-loadable chunks. Browser resumes execution without replaying component tree.

### Step 2: Dollar Sign API Boundaries
```tsx
export default component$(() => {
  const state = useStore({ items: [], filter: '' })

  // $() wraps a lazy-loadable closure
  const log = $((msg: string) => {
    console.log(msg, state.items)
  })

  // $ suffix on events creates lazy boundaries
  return (
    <input onInput$={(_, el) => state.filter = el.value} />
  )
})
```
Every `$` creates a separate lazy-loadable chunk. The optimizer extracts these into individual bundles.

### Step 3: Fine-Grained Reactivity
```tsx
export default component$(() => {
  // useSignal for primitives
  const count = useSignal(0)
  const name = useSignal('')

  // useStore for objects with deep reactivity
  const form = useStore({
    email: '',
    password: '',
    errors: {} as Record<string, string>,
  })

  // Computed-like patterns — $() + useComputed$
  const isFormValid = useComputed$(() =>
    form.email.includes('@') && form.password.length >= 8
  )

  return (
    <div>
      <p>Count: {count.value}</p>
      <p>Form valid: {isFormValid.value}</p>
    </div>
  )
})
```
Reactivity is fine-grained — Qwik tracks reads at the property level, not via virtual DOM diffing.

### Step 4: Qwik City Routing
```
src/routes/
  layout.tsx                    ->  root layout
  index.tsx                     ->  /
  about/index.tsx               ->  /about
  blog/
    layout.tsx                  ->  blog layout
    index.tsx                   ->  /blog
    [slug]/index.tsx            ->  /blog/:slug
  dashboard/
    layout.tsx                  ->  authenticated layout
    index.tsx                   ->  /dashboard
  api/
    users/index.ts              ->  /api/users (resource route)
```
All routes, layouts, data loaders, and actions are lazy-loaded. Use `<Slot />` for layout insertion points.

### Step 5: Route Loaders & Actions
```tsx
// src/routes/dashboard/index.tsx
import { routeLoader$, routeAction$, Form } from '@builder.io/qwik-city'

export const useUserData = routeLoader$(async ({ cookie, redirect }) => {
  const token = cookie.get('token')?.value
  if (!token) throw redirect(302, '/login')
  const user = await db.user.findUnique({ where: { token } })
  return user as User
})

export const useUpdateProfile = routeAction$(async (form, { fail }) => {
  const name = form.get('name')
  if (!name || name.length < 2) return fail(400, { message: 'Name too short' })
  await db.user.update({ data: { name } })
  return { success: true }
})

export default component$(() => {
  const user = useUserData()
  const action = useUpdateProfile()

  return (
    <Form action={action}>
      <input name="name" value={user.value.name} />
      {action.value?.failed && <p>{action.value.fieldErrors?.message}</p>}
      <button type="submit">Update</button>
    </Form>
  )
})
```
`routeLoader$` runs on server, serializes result into HTML. `routeAction$` handles form mutations with progressive enhancement.

### Step 6: Prefetch Optimization
```tsx
// src/root.tsx
import { PrefetchServiceWorker } from '@builder.io/qwik/prefetch-service-worker'

export default component$(() => {
  return (
    <html>
      <head>
        <PrefetchServiceWorker />
        <script dangerouslySetInnerHTML={/* service worker registration */} />
      </head>
      <body>
        <Slot />
      </body>
    </html>
  )
})
```
PrefetchServiceWorker preloads QRL chunks for links in viewport, enabling instant navigation without waterfall.

### Step 7: Server Functions
```tsx
// src/components/createUser.ts — server function
import { server$ } from '@builder.io/qwik-city'

export const createUser = server$(async (data: CreateUserInput) => {
  const user = await db.user.create({ data })
  await email.sendWelcome(user.email)
  return user
})
```
`server$()` marks a function to always run on the server. Callable from client components as if local.

## Rules
- No eager code — every component, event, and closure is lazy by default via `$`.
- `useSignal` for primitives, `useStore` for objects. Never use plain `let` or `const` for reactive state.
- `routeLoader$` for data fetching, `routeAction$` with `<Form>` for mutations.
- `useVisibleTask$` only for client-only effects (intersection observers, analytics) — avoid for data fetching.
- PrefetchServiceWorker is required for instant navigation — without it, lazy loading becomes waterfall.
- Qwik optimizer must be able to see `$()` boundaries — no dynamic `$` calls.
- Serialized state stays in HTML — never rely on sessionStorage for critical app state.

## References
- `references/resumable-patterns.md` — resumability vs hydration, lazy loading, serialization, optimizer
- `references/qwik-city-patterns.md` — routes, layout, server functions, middleware, actions

## Handoff
No artifact produced.
Next skill: frontend-universal-testing for Qwik component tests. Or frontend-universal-performance.
Carry forward: resumability boundaries, dollar-sign conventions, prefetch strategy.
