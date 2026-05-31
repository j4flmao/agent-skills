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

  const log = $((msg: string) => {
    console.log(msg, state.items)
  })

  return (
    <input onInput$={(_, el) => state.filter = el.value} />
  )
})
```
Every `$` creates a separate lazy-loadable chunk. The optimizer extracts these into individual bundles.

### Step 3: Fine-Grained Reactivity
```tsx
export default component$(() => {
  const count = useSignal(0)
  const name = useSignal('')

  const form = useStore({
    email: '',
    password: '',
    errors: {} as Record<string, string>,
  })

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

### Step 5: Route Loaders and Actions
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
// src/components/createUser.ts
import { server$ } from '@builder.io/qwik-city'

export const createUser = server$(async (data: CreateUserInput) => {
  const user = await db.user.create({ data })
  await email.sendWelcome(user.email)
  return user
})
```
`server$()` marks a function to always run on the server. Callable from client components as if local.

### Step 8: useVisibleTask$ for Client Effects
```tsx
export default component$(() => {
  const elemRef = useSignal<Element>()

  useVisibleTask$(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) analytics.trackView(entry.target.id)
      })
    })
    if (elemRef.value) observer.observe(elemRef.value)
    return () => observer.disconnect()
  })

  return <div ref={elemRef} id="tracked-element">Content</div>
})
```

## Component Architecture

### Component Decision Tree
```
Does the component need interactivity?
  No  -> Static HTML, no component$() needed (plain function component)
  Yes -> Does it need state?
    No  -> Use component$() with props only
    Yes -> Is the state simple (number, string)?
      Yes -> useSignal
      No -> useStore (object, array)

Does the component need side effects?
  No -> Skip useVisibleTask$
  Yes -> Is it a data fetch?
    No -> Is it DOM measurement, animation, or analytics?
      Yes -> useVisibleTask$ with proper cleanup
    Yes -> routeLoader$ in parent, pass as props
```

### Component Composition Patterns
```tsx
// Parent provides state, children receive props
export default component$(() => {
  const items = useSignal<string[]>([])
  return (
    <div>
      <ItemList items={items.value} />
    </div>
  )
})

// Or use context for deep passing
import { createContextId, useContextProvider, useContext } from '@builder.io/qwik'

export const ThemeContext = createContextId<string>('theme')

export const Root = component$(() => {
  useContextProvider(ThemeContext, 'dark')
  return <Slot />
})

export const Child = component$(() => {
  const theme = useContext(ThemeContext)
  return <div class={theme}>Content</div>
})
```

## Common Pitfalls

1. **Forgetting $ on event handlers**: `onClick` instead of `onClick$` — event never gets lazy loaded.
2. **Using useState from React**: Qwik uses useSignal and useStore, not hooks from other frameworks.
3. **Heavy useVisibleTask$ usage**: Every useVisibleTask$ blocks resumability. Keep them minimal.
4. **Dynamic $() calls**: `$(someCondition ? fn1 : fn2)` breaks the optimizer. Use static boundaries.
5. **Missing PrefetchServiceWorker**: Without it, lazy navigation produces visible network waterfalls.
6. **Mutable state reassignment**: `state = newValue` instead of `state.value = newValue` for signals.
7. **Nested reactivity with useStore**: Objects inside useStore are deeply reactive — use for form state.
8. **Not using typed loaders**: routeLoader$ returns `unknown` without explicit typing.

## Best Practices

1. Every `$()` should be statically analyzable — no dynamic code inside dollar boundaries.
2. `useSignal` for primitives, `useStore` for objects. Never plain `let` or `const`.
3. Colocate routeLoader$ and routeAction$ in the route file that uses them.
4. Use `useComputed$` for derived values — avoids manual synchronization.
5. Keep useVisibleTask$ focused on a single concern — one observer per task.
6. Lazy-load heavy libraries inside `$()` callbacks, not at module level.
7. Use `NoSerialize` wrapper for non-serializable values (class instances, DOM refs).
8. Prefetch critical routes after initial render with PrefetchServiceWorker.

## Compared With

| Aspect | Qwik | React (Client) | Solid |
|--------|------|----------------|-------|
| Rendering | Resumable | Hydrating | Hydrating |
| Lazy loading | Per-event ($) | Per-component (lazy()) | Per-component (lazy()) |
| Reactivity | Signal-based, fine-grained | Virtual DOM diff | Signal-based |
| Serialization | Automatic via QRL | Manual (JSON) | Manual |
| Server functions | Built-in (server$) | Via Server Actions | Via SolidStart |
| Bundle size | ~10KB (initial) | ~40KB+ (React runtime) | ~8KB (initial) |

## Performance

1. Initial load: ~10KB JS baseline, zero hydration cost, instant TTI.
2. Lazy chunks: Each $() is ~200-500 bytes, loaded on interaction only.
3. Serialized state: HTML size increases by ~2-5KB per page with serialized signals.
4. Prefetch: PrefetchServiceWorker uses idle time to download route chunks.
5. Bundle splitting: Automatic at the $ boundary — no manual code splitting.
6. Memory: Fine-grained signals use less memory than virtual DOM tree.
7. Time to interactive: Near zero because there is no hydration to wait for.

## Tooling

1. `npm run qwik build` — production build with Qwik optimizer.
2. `npm run qwik dev` — dev server with HMR and the Qwik DevTools panel.
3. `npm run qwik lint` — ESLint with Qwik-specific rules (ensures $ boundaries).
4. `npm run qwik qwik add` — CLI to add integrations (auth, database, UI).
5. Qwik DevTools browser extension — inspect lazy boundaries and QRL chunks.
6. `@builder.io/qwik-labs` — experimental features and utilities.
7. `qwik-speak` — internationalization library for Qwik.
8. `qwik-image` — optimized images with lazy loading.

## Rules
- No eager code — every component, event, and closure is lazy by default via `$`.
- `useSignal` for primitives, `useStore` for objects. Never use plain `let` or `const` for reactive state.
- `routeLoader$` for data fetching, `routeAction$` with `<Form>` for mutations.
- `useVisibleTask$` only for client-only effects (intersection observers, analytics) — avoid for data fetching.
- PrefetchServiceWorker is required for instant navigation — without it, lazy loading becomes waterfall.
- Qwik optimizer must be able to see `$()` boundaries — no dynamic `$` calls.
- Serialized state stays in HTML — never rely on sessionStorage for critical app state.
- Dollar boundaries must be statically analyzable — no dynamic expressions inside $().

## References
  - references/qwik-city-patterns.md — Qwik City Patterns
  - references/qwik-component-patterns.md — Qwik Component Patterns
  - references/qwik-data.md — Qwik Data Patterns
  - references/qwik-routing.md — Qwik Routing Patterns
  - references/qwik-state-management.md — Qwik State Management
  - references/resumable-patterns.md — Qwik Resumable Patterns
  - references/qwik-component-composition.md — Qwik Component Composition Reference
  - references/qwik-form-validation.md — Qwik Form Validation Reference

## Handoff
No artifact produced.
Next skill: frontend-universal-testing for Qwik component tests. Or frontend-universal-performance.
Carry forward: resumability boundaries, dollar-sign conventions, prefetch strategy.
