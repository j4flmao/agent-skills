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

### Decision Tree: Data Fetching Strategy

```
Where does data come from?
  ├── Route-level data → routeLoader$() in route file
  ├── User action/mutation → routeAction$() + <Form>
  ├── Component-level data → $() closure called from event
  └── Real-time / WebSocket → useVisibleTask$() with WebSocket
```

### Decision Tree: Lazy Boundary Placement

```
What creates a lazy boundary?
  ├── A component → component$()
  ├── An event handler → onClick$(), onInput$(), onSubmit$()
  ├── A closure → $()
  ├── A data loader → routeLoader$()
  └── An action → routeAction$()
```

### Decision Tree: Effect Strategy

```
What type of side effect?
  ├── Data fetch on load → routeLoader$() in parent route
  ├── DOM measurement → useVisibleTask$() with cleanup
  ├── Third-party widget init → useVisibleTask$() with NoSerialize
  ├── Analytics/tracking → useVisibleTask$() with IntersectionObserver
  └── Polling/subscription → useVisibleTask$() with cleanup interval
```

## Component Design Patterns

### Signal-Based Counter

```tsx
import { component$, useSignal } from '@builder.io/qwik'

export default component$(() => {
  const count = useSignal(0)
  const step = useSignal(1)

  return (
    <div>
      <p>Count: {count.value}</p>
      <button onClick$={() => count.value += step.value}>Increment</button>
      <button onClick$={() => count.value -= step.value}>Decrement</button>
      <input type="number" bind:value={step} />
    </div>
  )
})
```

### Store-Based Form

```tsx
import { component$, useStore } from '@builder.io/qwik'

interface FormState {
  email: string
  password: string
  errors: { email?: string; password?: string }
}

export default component$(() => {
  const form = useStore<FormState>({
    email: '',
    password: '',
    errors: {},
  })

  const validate = $((field: string) => {
    if (field === 'email' && !form.email.includes('@')) {
      form.errors.email = 'Invalid email'
    } else {
      delete form.errors.email
    }
  })

  return (
    <form onSubmit$={() => console.log(form.email, form.password)}>
      <input name="email" onInput$={(_, el) => { form.email = el.value; validate('email') }} />
      {form.errors.email && <span>{form.errors.email}</span>}
      <input name="password" type="password" onInput$={(_, el) => form.password = el.value} />
      <button type="submit">Submit</button>
    </form>
  )
})
```

### Context-Based Theme Provider

```tsx
import { createContextId, useContextProvider, useContext, component$, Slot } from '@builder.io/qwik'

export const ThemeContext = createContextId<'light' | 'dark'>('theme')

export const ThemeProvider = component$(() => {
  useContextProvider(ThemeContext, 'dark')
  return <Slot />
})

export const ThemedButton = component$(() => {
  const theme = useContext(ThemeContext)
  return <button class={`btn-${theme}`}>Click me</button>
})
```

### Server Function Pattern

```tsx
import { server$ } from '@builder.io/qwik-city'
import { component$, useSignal } from '@builder.io/qwik'

const searchProducts = server$(async (query: string) => {
  const results = await db.product.findMany({
    where: { name: { contains: query } },
    take: 10,
  })
  return results
})

export default component$(() => {
  const query = useSignal('')
  const results = useSignal<Product[]>([])

  return (
    <div>
      <input bind:value={query} onInput$={async (_, el) => {
        results.value = await searchProducts(el.value)
      }} />
      <ul>{results.value.map(p => <li>{p.name}</li>)}</ul>
    </div>
  )
})
```

### Route Layout Pattern

```tsx
// src/routes/dashboard/layout.tsx
import { component$, Slot } from '@builder.io/qwik'
import { routeLoader$ } from '@builder.io/qwik-city'

export const useAuthCheck = routeLoader$(async ({ redirect, cookie }) => {
  const token = cookie.get('token')?.value
  if (!token) throw redirect(302, '/login')
  return token
})

export default component$(() => {
  return (
    <div class="dashboard-layout">
      <nav>
        <a href="/dashboard">Home</a>
        <a href="/dashboard/settings">Settings</a>
      </nav>
      <main><Slot /></main>
    </div>
  )
})
```

### Paginated List with Route Loader

```tsx
export const useProductList = routeLoader$(async ({ query }) => {
  const page = Number(query.get('page')) || 1
  const [products, total] = await Promise.all([
    db.product.findMany({ skip: (page - 1) * 20, take: 20 }),
    db.product.count(),
  ])
  return { products: products as Product[], total, page }
})

export default component$(() => {
  const data = useProductList()
  return (
    <div>
      {data.value.products.map(p => <ProductCard product={p} />)}
      {data.value.page > 1 && <a href={`?page=${data.value.page - 1}`}>Previous</a>}
      {data.value.page * 20 < data.value.total && <a href={`?page=${data.value.page + 1}`}>Next</a>}
    </div>
  )
})
```

## State Management Patterns

### Local State with useSignal

Simple primitive values that trigger reactive updates when `.value` changes:

```tsx
const count = useSignal(0)
count.value++ // triggers re-render
const readonly = count.value // reads current value
```

### Local State with useStore

Deep objects with nested reactivity:

```tsx
const user = useStore({
  profile: { name: '', email: '' },
  preferences: { theme: 'light', notifications: true },
  metadata: { lastLogin: null as Date | null },
})
user.profile.name = 'John' // triggers re-render
```

### Derived State with useComputed$

```tsx
const items = useSignal<Item[]>([])
const filter = useSignal('')
const filteredItems = useComputed$(() =>
  items.value.filter(i => i.name.includes(filter.value))
)
// filteredItems.value updates automatically when items or filter change
```

### Shared State with Context

```tsx
// auth-context.ts
export const AuthContext = createContextId<{ user: User | null; token: string | null }>('auth')

// root.tsx
export default component$(() => {
  useContextProvider(AuthContext, { user: null, token: null })
  return <Slot />
})

// any child
const auth = useContext(AuthContext)
```

### Server State with routeLoader$

Data fetched on the server, serialized into HTML, available to the client without a separate API call:

```tsx
export const usePosts = routeLoader$(async () => {
  const posts = await db.post.findMany({ orderBy: { createdAt: 'desc' } })
  return posts as Post[]
})
// Access: const posts = usePosts(); posts.value
```

### Form State with routeAction$

```tsx
export const useLogin = routeAction$(async (form, { fail, cookie }) => {
  const user = await db.user.findUnique({ where: { email: form.get('email') } })
  if (!user) return fail(401, { message: 'Invalid credentials' })
  cookie.set('token', user.token, { httpOnly: true, maxAge: 86400 })
})

// Access: const action = useLogin(); action.value?.failed; action.value?.message
```

## Performance Optimization

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

### useVisibleTask$ Optimization
- Limit to one observer per task
- Always clean up (return disconnect/unsubscribe)
- Use `useVisibleTask$` with track option to re-run on signal changes:

```tsx
useVisibleTask$(({ track }) => {
  track(() => someSignal.value)
  // re-runs when someSignal changes
})
```

## Build & Bundle Considerations

### Production Build
```bash
npm run qwik build
# Output in dist/ — contains HTML, JS chunks per $ boundary, CSS
```

### Chunk Analysis
Qwik generates many small chunks by design. To analyze:
```bash
npx qwik build --analyze
# Opens bundle analysis in browser
```

### Optimizer Configuration
Qwik's optimizer is configured through Vite. Key settings in `vite.config.ts`:

```ts
import { defineConfig } from 'vite'
import { qwikVite } from '@builder.io/qwik/optimizer'
import { qwikCity } from '@builder.io/qwik-city/vite'

export default defineConfig({
  plugins: [
    qwikCity(),
    qwikVite({
      ssr: { input: 'src/entry.ssr.tsx' },
      client: { input: 'src/entry.dev.tsx' },
      // Optimizer options
      entryStrategy: { type: 'smart' }, // 'smart' | 'hoist' | 'single'
      symbolMapper: true,
      genDts: false,
    }),
  ],
})
```

Entry strategy options:
- `smart` (default): Splits into optimal chunks per $ boundary
- `hoist`: Fewer, larger chunks — better for non-lazy scenarios
- `single`: Single bundle — disables all lazy loading

### Adapter Configuration

```ts
// qwik.config.ts (Cloudflare Pages)
import { extendConfig } from '@builder.io/qwik-city/vite'
import cloudflarePages from '@builder.io/qwik-city/adapters/cloudflare-pages/vite'

export default extendConfig(baseConfig, () => ({
  plugins: [cloudflarePages()],
}))
```

Available adapters: `cloudflare-pages`, `vercel-edge`, `node-server`, `deno-server`, `static`.

### Static Generation (SSG)

```ts
import { staticGenerate } from '@builder.io/qwik-city/static'
// Configure in vite.config.ts for SSG routes
```

SSG generates HTML at build time for static routes. Dynamic routes still use SSR.

### Environment Variables
```tsx
// Accessible anywhere
const apiUrl = import.meta.env.PUBLIC_API_URL
const mode = import.meta.env.MODE // 'development' | 'production'
```

Prefix with `PUBLIC_` for client-accessible vars. Private vars available only on server.

### CSS Strategy
- Qwik supports any CSS approach: Tailwind, CSS Modules, styled-components, plain CSS
- CSS is automatically split per component chunk
- Scoped styles via CSS Modules or Qwik's built-in scoping

## Testing Strategies

### Unit Testing Components

```tsx
// __tests__/counter.test.tsx
import { createDOM } from '@builder.io/qwik/testing'
import { test, expect } from 'vitest'
import Counter from './counter'

test('increments count', async () => {
  const { screen, render, userEvent } = await createDOM()
  await render(<Counter />)
  expect(screen.innerText).toContain('0')
  await userEvent('button', 'click')
  expect(screen.innerText).toContain('1')
})
```

### Testing Route Loaders

```tsx
// __tests__/routes.test.ts
import { test, expect } from 'vitest'
import { useProductData } from '../src/routes/product/[id]/index'

test('loader returns product', async () => {
  const loader = useProductData()
  const result = await loader({ params: { id: '1' }, ...mockContext })
  expect(result).toHaveProperty('name')
})
```

### Testing Server Functions

```tsx
import { test, expect } from 'vitest'
import { createUser } from '../src/components/createUser'

test('creates user on server', async () => {
  const user = await createUser({ email: 'test@test.com', name: 'Test' })
  expect(user.email).toBe('test@test.com')
})
```

### E2E Testing with Playwright

```tsx
// e2e/app.spec.ts
import { test, expect } from '@playwright/test'

test('page loads without JS', async ({ page }) => {
  await page.goto('/')
  // Content is visible even without JS
  expect(await page.locator('h1').textContent()).toBe('Welcome')
})

test('interaction lazy-loads chunk', async ({ page }) => {
  await page.goto('/')
  await page.locator('button').click()
  // Button handler downloaded lazily, interaction still works
  expect(await page.locator('output').textContent()).toBe('1')
})

test('form action works', async ({ page }) => {
  await page.goto('/dashboard')
  await page.fill('input[name="name"]', 'John')
  await page.click('button[type="submit"]')
  await expect(page.locator('.success')).toBeVisible()
})
```

## Migration Patterns

### Migrating from React to Qwik

**Component conversion:**
```tsx
// React
function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>
}

// Qwik
export default component$(() => {
  const count = useSignal(0)
  return <button onClick$={() => count.value++}>{count.value}</button>
})
```

**Hook conversion:**
```
useState           -> useSignal / useStore
useEffect          -> useVisibleTask$ (rare) or routeLoader$
useContext         -> useContext + useContextProvider
useReducer         -> useStore with action functions
useMemo            -> useComputed$
useCallback        -> $()
useRef             -> useSignal (for elements)
```

**State management:**
```
Redux/Zustand      -> useContext + useStore OR routeLoader$
React Query        -> routeLoader$ + routeAction$
React Router       -> Qwik City file-based routing
Formik/React Hook  -> routeAction$ + <Form>
Form
```

### Migrating from Next.js to Qwik City

| Next.js | Qwik City |
|---------|-----------|
| pages/ directory | src/routes/ directory |
| getServerSideProps | routeLoader$ |
| API routes | src/routes/api/ or server$ |
| Layout (app dir) | layout.tsx per route |
| Server Actions | routeAction$ |
| Middleware | plugin@name.ts |
| next/image | qwik-image |

### Incremental Adoption

Add Qwik to an existing project via micro-frontends or iframe embedding. Use Qwik on new interactive features while keeping the legacy app running. Qwik can be embedded in any page via a script tag — it doesn't require full app control.

## Anti-Patterns

### Eager Code Outside $ Boundaries

```tsx
// Anti-pattern: heavy computation at module level
const data = expensiveCalculation() // runs on every import

// Correct: lazy $ boundary
const getData = $(() => expensiveCalculation())
```

### Dynamic $() Construction

```tsx
// Anti-pattern: dynamic $ breaks optimizer
const handler = condition ? $(fn1) : $(fn2)

// Correct: static $ boundaries
if (condition) {
  return <button onClick$={fn1}>A</button>
}
return <button onClick$={fn2}>B</button>
```

### Overusing useVisibleTask$

```tsx
// Anti-pattern: data fetch in useVisibleTask$
useVisibleTask$(async () => {
  const data = await fetch('/api/data').then(r => r.json())
  state.value = data
})

// Correct: routeLoader$ for data
export const useData = routeLoader$(async () => {
  return await fetch('/api/data').then(r => r.json())
})
```

### Missing Prefetch Configuration

Without `PrefetchServiceWorker`, every lazy interaction triggers a network waterfall. Always include it in the root layout.

### Mutating Signals Incorrectly

```tsx
// Anti-pattern: reassignment
count = 5

// Correct: .value assignment
count.value = 5
```

### Passing Non-Serializable Props to component$

```tsx
// Anti-pattern: function as prop
<Child onEvent={fn} />

// Correct: $ suffix on event
<Child onEvent$={fn} />
```

### Using React Patterns (useEffect, useState)

Qwik has its own reactivity model. Importing React patterns causes confusion and breaks resumability. Always use Qwik primitives.

### Forgetting Cleanup in useVisibleTask$

```tsx
// Anti-pattern: no cleanup — memory leak
useVisibleTask$(() => {
  window.addEventListener('scroll', handler)
})

// Correct: cleanup
useVisibleTask$(() => {
  window.addEventListener('scroll', handler)
  return () => window.removeEventListener('scroll', handler)
})
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

### Pitfall 6: Reassigning useSignal vs Mutating useStore
`useSignal.value = x` replaces the value. `useStore.field = x` mutates in place. Mixing these patterns causes subtle bugs.

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
