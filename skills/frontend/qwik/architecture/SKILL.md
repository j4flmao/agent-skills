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

## Component Architecture / Decision Trees

### Architecture Options

| Approach | Trade-off | When to Use |
|----------|-----------|-------------|
| Pure component$() + useSignal | Simplest, minimal chunks | Simple interactive widgets |
| Component + useStore() for deep state | More serialization, finer updates | Forms with multiple fields |
| useContext() + useContextProvider() | Shared state without prop drilling | Theme, auth, global filters |
| Inline components (no $) | Eager, no code-splitting | Non-interactive wrapper layouts |
| Server$() + routeLoader$() | Full server-side logic | Data-fetching heavy pages |

### Decision Tree: State Management

```
Do you need shared state across components?
  ├── No → useSignal() or useStore() locally
  └── Yes → Do you need it across routes?
       ├── No → useContext() + useContextProvider()
       └── Yes → useSignal() in root + pass via props
```

### Decision Tree: Component Design

```
Does the component need to be lazy?
  ├── No (non-interactive wrapper) → plain function component
  └── Yes (has state or handlers) → component$()
```

## Common Pitfalls

### Pitfall 1: Forgetting $ on Event Handlers
```tsx
// Wrong — click handler not lazy, entire component eager
<button onClick={() => count.value++}>

// Correct — click handler is lazy boundary
<button onClick$={() => count.value++}>
```
Always suffix interactive events with `$` to mark lazy boundaries.

### Pitfall 2: Closures Inside component$ Without $
```tsx
// Wrong — inline closure not extractable by optimizer
export default component$(() => {
  const process = (data: string) => console.log(data)
  return <button onClick$={() => process('hi')}>Click</button>
})

// Correct — $() makes closure lazy-loadable
export default component$(() => {
  const process = $((data: string) => console.log(data))
  return <button onClick$={() => process('hi')}>Click</button>
})
```

### Pitfall 3: Overusing useVisibleTask$
`useVisibleTask$` puts code into the client bundle eagerly. Prefer `$()` closures called from event handlers. Only use `useVisibleTask$` for intersection-observer logic or third-party widget initialization.

### Pitfall 4: Dynamic $() Calls
The Qwik optimizer relies on static analysis. Dynamic `$()` calls prevent code extraction:
```tsx
// Wrong — optimizer cannot analyze this
const handler = condition ? $(fn1) : $(fn2)

// Correct — let optimizer see both paths
if (condition) {
  return <button onClick$={fn1}>A</button>
}
return <button onClick$={fn2}>B</button>
```

### Pitfall 5: Forgetting PrefetchServiceWorker
Without prefetching, the first interaction triggers a network fetch that feels slow. Always enable `PrefetchServiceWorker` in root.tsx for instant navigation.

## Compared With

### Qwik vs React
| Aspect | Qwik | React |
|--------|------|-------|
| Hydration model | Resumable (no replay) | Hydration (replay all) |
| Bundle size | Proportional to interactions | Proportional to page weight |
| Time to interactive | Constant (~1ms) | Scales with component count |
| Code splitting | Automatic per $ boundary | Manual with React.lazy |
| State serialization | Auto in HTML | Manual (React Query, Zustand) |
| Learning curve | Higher (dollar-sign API) | Lower (standard JSX) |
| Ecosystem | Smaller, growing | Massive, mature |

### Qwik vs SolidJS
Both avoid VDOM, but Qwik differs by lazy-loading per event rather than compiling fine-grained reactivity. SolidJS is eager but granular; Qwik is fully lazy but requires opt-in syntax.

### Qwik vs Astro Islands
Astro ships zero JS by default but hydrates entire framework islands eagerly. Qwik can lazy-load individual event handlers on a component, making it more granular. Astro is better for content sites; Qwik for interactive apps.

## Performance Considerations

### Bundle Strategy
- Each `$()` boundary produces a separate chunk. A page with 20 interactive components produces ~20-60 small chunks (2-5KB each).
- Total JS downloaded for a typical page visit: 10-30KB (vs 100-300KB for React).
- First interaction may incur a small chunk fetch (~2-5KB). PrefetchServiceWorker preloads likely interactions.

### Serialization Overhead
- State serialized as JSON in HTML comments. For very large stores (10K+ entries), this adds HTML weight.
- Solution: Paginate or lazy-load data on interaction rather than serializing everything.

### SSR Cost
- Qwik SSR is heavier per request than React SSR because it must serialize state and generate QRLs.
- Mitigation: Use static generation (SSG) for content pages, SSR only for dynamic routes.

### Prefetch Strategy
```tsx
// Level 1: PrefetchServiceWorker — preloads links on hover
import { PrefetchServiceWorker } from '@builder.io/qwik/prefetch-service-worker'

// Level 2: Prefetch resources for above-the-fold interactions
// In root.tsx:
<link rel="prefetch" href="/build/q-abc123.js" />
```
Use `PrefetchServiceWorker` in all production builds. Monitor the Service Worker cache in DevTools to verify prefetch coverage.

## Ecosystem & Tooling

### Core Packages
| Package | Purpose |
|---------|---------|
| @builder.io/qwik | Core framework with compiler and runtime |
| @builder.io/qwik-city | Meta-framework with routing, loaders, actions |
| @builder.io/qwik-labs | Experimental features (partytown, etc.) |

### Tools
- **Qwik VS Code Extension** — Syntax highlighting, code actions for `$()` boundaries, auto-import for QRL utilities.
- **Qwik DevTools** — Browser extension for inspecting serialized state, QRL chunk mapping, and prefetch coverage.
- **Mitosis** — Write once, compile to Qwik, React, Vue, SolidJS, etc. Useful for libraries needing multiple framework outputs.
- **Qwik Playground** — Online REPL at qwik.dev/playground for prototyping components.

### Community & Learning
- Official docs: qwik.dev
- GitHub: github.com/BuilderIO/qwik
- Discord: discord.gg/qwik
- Qwik City examples: github.com/BuilderIO/qwik-city-examples

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
  const greet = $((greeting: string) => {
    alert(`${greeting}, ${name.value}!`)
  })
  return <button onClick$={() => greet('Hello')}>Greet</button>
})
```
`component$()` — lazy component. `$()` — lazy closure. `onClick$()` — lazy event. `useVisibleTask$()` — lazy client effect. `useComputed$()` — lazy computed.

### Step 3: Qwik City Routing
```
src/routes/
  index.tsx                 ->  /
  about/index.tsx           ->  /about
  product/[id]/index.tsx    ->  /product/:id
  dashboard/layout.tsx      ->  layout
  api/users/index.ts        ->  resource route
  plugin@auth.ts            ->  middleware
```
All routes, layouts, and data are lazy-loaded. Use `<Slot />` for layout children. Plugin files (`plugin@name.ts`) run as request middleware.

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
Use `<Form action={action}>` for progressive enhancement. Access action value via `action.value` for status and field errors.

### Step 5: Layout Routes and Middleware
```tsx
// src/routes/dashboard/layout.tsx
export default component$(() => {
  return (
    <div class="dashboard">
      <nav><Link href="/dashboard/settings">Settings</Link></nav>
      <main><Slot /></main>
    </div>
  )
})
```
Middleware via `plugin@name.ts` runs on every request for that route segment. Use for auth guards, logging, redirects.

### Step 6: Resource Routes (Endpoints)
```tsx
// src/routes/api/users/index.ts
export const onGet: RequestHandler = async ({ json }) => {
  const users = await db.user.findMany()
  json(200, users)
}
```
Use `onGet`, `onPost`, `onPut`, `onDelete`, `onPatch` for REST handlers.

### Step 7: Optimizations
```tsx
// Root — enable prefetching
import { PrefetchServiceWorker } from '@builder.io/qwik/prefetch-service-worker'
<head>
  <PrefetchServiceWorker />
</head>
```
Prefetch strategy is critical for instant navigation. Bundle splitting is automatic — per component and per event handler. Monitor chunk sizes with `qwik inspect`.

## Rules
- No eager code — everything is lazy by default.
- `$` suffix marks lazy boundaries (component$, onClick$, $()).
- Resumable means no JS needed for initial render or interactivity.
- Prefetch strategy is critical for instant navigation experience.
- Bundle splitting is automatic per component and per event.
- useVisibleTask$ for client-only effects — use sparingly.
- Form data is serialized — use routeAction$ for mutations.
- Dynamic $() calls break the optimizer — keep $() statically analyzable.
- Always pass serializable props to component$() — avoid passing functions.
- Use routeLoader$ for data, routeAction$ for mutations, server$ for RPC.

## References
- references/qwik-city-routing.md — Qwik City Routing
- references/qwik-city.md — Qwik City — Routing, Loaders, Actions, Middleware, Deployment
- references/qwik-optimization.md — Qwik Optimization Patterns
- references/qwik-resumability.md — Qwik Resumability Architecture
- references/qwik-resumable.md — Qwik Resumability — Resumability, Serialization, Dollar API, Fine-Grained Lazy
- references/qwik-testing.md — Qwik Testing Reference
- references/qwik-state-management.md — State Management in Qwik
- references/qwik-deployment-scaling.md — Qwik Deployment and Scaling

## Handoff
No artifact produced.
Next skill: frontend-universal-seo or frontend-universal-testing for Qwik projects.
Carry forward: component$ patterns, route loader/action conventions, prefetch strategy.
