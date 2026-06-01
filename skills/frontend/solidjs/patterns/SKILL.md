---
name: frontend-solidjs-patterns
description: >
  Use this skill when the user says 'SolidJS pattern', 'SolidJS form', 'SolidJS data fetching', 'SolidJS component pattern', 'SolidJS animation'. This skill enforces: createResource for async data with Suspense, controlled forms via signals, component composition via JSX children as functions, and transitions/animation with createTransition and CSS. Requires existing SolidJS project (package.json with solid-js). Do NOT use for: React or Vue data fetching patterns.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, solidjs, patterns, phase-7]
---

# SolidJS Patterns

## Purpose
Apply production patterns to SolidJS applications: async data with createResource, controlled forms with signals and Zod, component composition patterns, and animation.

## Agent Protocol

### Trigger
Exact user phrases: "SolidJS pattern", "SolidJS form", "SolidJS data fetching", "SolidJS component pattern", "SolidJS animation".

### Input Context
Before activating, verify:
- SolidJS project with solid-js package.
- Whether @tanstack/solid-form or custom forms are used.
- If css transitions or Solid Flip is available for animation.

### Output Artifact
No file output. Produces code patterns for data fetching, forms, composition, and animation.

### Response Format
Code: show resource, form, and composition examples. No imports beyond SolidJS APIs.

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Data fetching uses createResource with Suspense boundaries.
- [ ] createResource refetches when source signal changes.
- [ ] Forms use controlled inputs with signals and Zod validation.
- [ ] Component composition uses JSX children as functions or slot patterns.
- [ ] Animation uses createTransition, Solid Flip, or CSS transitions with signals.

### Max Response Length
Code: 15 lines per example.

## Component Architecture / Decision Trees

### Architecture Options

| Approach | Trade-off | When to Use |
|----------|-----------|-------------|
| createResource + Suspense | Simple async data, loading states | API data fetching |
| createResource with mutate | Optimistic updates, cache control | Dashboard, live data |
| Controlled form with signals | Full control over validation | Complex forms |
| Children as functions (render props) | Flexible composition | List, Table, Dropdown |
| Slot pattern via props | Explicit API | Card, Layout, Modal |
| createTransition | Pending state for deferred updates | Tab switching, navigation |

### Decision Tree: Data Fetching

```
Is data needed on page load?
  ├── Yes -> createResource in component
  │    ├── Depends on signal? -> Pass signal as source
  │    └── Static -> Pass constant source
  └── No -> fetch on interaction (event handler)
```

### Decision Tree: Form Complexity

```
How many fields?
  ├── 1-3 fields -> createSignal per field
  ├── 4-10 fields -> createStore for the form object
  └── 10+ fields or nested -> createStore + field arrays
```

### Decision Tree: Component Composition

```
Does the component need to customize rendering?
  ├── Yes -> Children as functions or render props
  └── No -> Regular props + children

Does the component have optional sections?
  ├── Yes -> Slot pattern (header, footer, sidebar)
  └── No -> Single children slot
```

## Component Design Patterns

### Data Fetching with Loading and Error States

```tsx
function ProductList() {
  const [products] = createResource(() => '/api/products', fetchProducts)
  return (
    <Suspense fallback={<ProductSkeleton />}>
      <ErrorBoundary fallback={<div>Failed to load products</div>}>
        <For each={products()}>
          {(product) => <ProductCard product={product} />}
        </For>
      </ErrorBoundary>
    </Suspense>
  )
}
```

### createResource with Dependent Fetching

```tsx
function UserPosts() {
  const params = useParams()
  const userId = () => params.id
  const [user] = createResource(userId, fetchUser)
  const [posts] = createResource(user, (u) => u ? fetchPosts(u.id) : [])
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <h1>{user()?.name}'s Posts</h1>
      <For each={posts()}>{(post) => <PostCard post={post} />}</For>
    </Suspense>
  )
}
```

### Optimistic Update with mutate

```tsx
function LikeButton(props: { postId: string }) {
  const [liked, setLiked] = createSignal(false)
  const toggleLike = async () => {
    const previous = liked()
    setLiked(!liked()) // optimistic update
    try {
      await api.toggleLike(props.postId)
    } catch {
      setLiked(previous) // rollback
    }
  }
  return <button onClick={toggleLike}>{liked() ? 'Unlike' : 'Like'}</button>
}
```

### Complex Form with createStore

```tsx
function OrderForm() {
  const [form, setForm] = createStore({
    customer: { name: '', email: '' },
    items: [] as { productId: string; quantity: number }[],
    shipping: { address: '', city: '', zip: '' },
    errors: {} as Record<string, string>,
  })

  const addItem = () => setForm('items', items => [...items, { productId: '', quantity: 1 }])
  const removeItem = (i: number) => setForm('items', items => items.filter((_, idx) => idx !== i))
  const updateItem = (i: number, field: string, value: any) => setForm('items', i, field, value)

  const total = createMemo(() => form.items.reduce((sum, i) => sum + i.quantity * 10, 0))

  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    const result = orderSchema.safeParse(form)
    if (!result.success) {
      setForm('errors', result.error.flatten().fieldErrors)
      return
    }
    await api.createOrder(result.data)
  }

  return (
    <form onSubmit={handleSubmit}>
      <input value={form.customer.name} onInput={(e) => setForm('customer', 'name', e.currentTarget.value)} />
      <For each={form.items}>{(item, i) => (
        <div>
          <input value={item.productId} onInput={(e) => updateItem(i(), 'productId', e.currentTarget.value)} />
          <input type="number" value={item.quantity} onInput={(e) => updateItem(i(), 'quantity', Number(e.currentTarget.value))} />
          <button type="button" onClick={() => removeItem(i())}>Remove</button>
        </div>
      )}</For>
      <button type="button" onClick={addItem}>Add Item</button>
      <p>Total: {total()}</p>
      <button type="submit">Submit Order</button>
    </form>
  )
}
```

### Render Props Composition

```tsx
function DataList<T>(props: {
  each: T[]
  children: (item: T, index: () => number) => JSX.Element
}) {
  return (
    <ul>
      <For each={props.each}>
        {(item, i) => <li>{props.children(item, i)}</li>}
      </For>
    </ul>
  )
}

// Usage
<DataList each={users()}>
  {(user, i) => (
    <div>
      <span>{i() + 1}.</span>
      <span>{user.name}</span>
    </div>
  )}
</DataList>
```

### Slot Pattern

```tsx
function Card(props: {
  header?: JSX.Element
  footer?: JSX.Element
  children: JSX.Element
}) {
  return (
    <div class="card">
      {props.header && <div class="card-header">{props.header}</div>}
      <div class="card-body">{props.children}</div>
      {props.footer && <div class="card-footer">{props.footer}</div>}
    </div>
  )
}
```

### Debounced Search

```tsx
function Search() {
  const [query, setQuery] = createSignal('')
  const [debouncedQuery, setDebounced] = createSignal('')

  createEffect(() => {
    const timer = setTimeout(() => setDebounced(query()), 300)
    onCleanup(() => clearTimeout(timer))
  })

  const [results] = createResource(debouncedQuery, searchApi)

  return (
    <div>
      <input value={query()} onInput={(e) => setQuery(e.currentTarget.value)} placeholder="Search..." />
      <Suspense fallback={<div>Searching...</div>}>
        <For each={results()}>{(item) => <div>{item.title}</div>}</For>
      </Suspense>
    </div>
  )
}
```

## State Management Patterns

### Signal-Based Local State

```tsx
const [isOpen, setIsOpen] = createSignal(false)
const [selectedTab, setSelectedTab] = createSignal('info')
```

### Store-Based Complex State

```tsx
const [filters, setFilters] = createStore({
  search: '',
  category: null as string | null,
  priceRange: { min: 0, max: 1000 },
  sortBy: 'date' as 'date' | 'price' | 'name',
})
setFilters('search', 'widget')
setFilters('priceRange', 'max', 500)
```

### Resource-Based Server State

```tsx
const [data, { mutate, refetch }] = createResource(source, fetcher)
mutate(optimisticData)  // update locally without refetch
refetch()               // force server re-fetch
```

### Context-Based Shared State

```tsx
const AppContext = createContext<{ theme: () => string; user: () => User | null }>()
// Provider wraps app, consumer uses useContext(AppContext)
```

## Performance Optimization

### Granular Reactivity
SolidJS updates only the DOM nodes that depend on changed signals. A list with 10,000 items updating one item updates exactly one DOM text node — not the list, not the parent.

### createMemo Caching
Memos only recompute when their dependencies change. Use `createMemo` for expensive computations:

```tsx
const processed = createMemo(() => heavyComputation(items()))
```

### Avoiding Unnecessary Tracking
Use `untrack` to read a signal without creating a dependency:

```tsx
createEffect(() => {
  console.log(untrack(() => count())) // logs but doesn't subscribe
})
```

### Lazy Loading Routes
```tsx
const Dashboard = lazy(() => import('./pages/Dashboard'))
// Dashboard code only loads when navigated to
```

### Batch Updates
SolidJS batches updates automatically within event handlers and effects. No manual batching needed.

## Build & Bundle Considerations

### Production Build
```bash
npm run build
# Output in dist/assets/ — JS chunks, CSS, HTML
```

### Bundle Analysis
```bash
npx vite build --analyze
# or add rollup-plugin-visualizer to vite.config.ts
```

### Tree Shaking
- SolidJS runtime treeshakes unused reactive primitives
- Use named imports from solid-js (import { createSignal } not import * as Solid)
- Unused components in lazy imports are not included

### TypeScript Config
```json
{
  "compilerOptions": {
    "jsx": "preserve",
    "jsxImportSource": "solid-js",
    "target": "ESNext",
    "module": "ESNext"
  }
}
```

## Testing Strategies

### Unit Tests for Signals

```tsx
import { createSignal, createMemo, createEffect } from 'solid-js'
import { describe, it, expect } from 'vitest'

describe('signal logic', () => {
  it('computed values update correctly', () => {
    const [count, setCount] = createSignal(0)
    const doubled = createMemo(() => count() * 2)
    expect(doubled()).toBe(0)
    setCount(3)
    expect(doubled()).toBe(6)
  })
})
```

### Component Tests

```tsx
import { render, screen, fireEvent } from 'solid-testing-library'
import { describe, it, expect } from 'vitest'
import Counter from './Counter'

describe('Counter', () => {
  it('renders and increments', () => {
    render(() => <Counter />)
    const button = screen.getByRole('button')
    expect(button).toHaveTextContent('0')
    fireEvent.click(button)
    expect(button).toHaveTextContent('1')
  })
})
```

### E2E Tests

```tsx
import { test, expect } from '@playwright/test'

test('search flow', async ({ page }) => {
  await page.goto('/products')
  await page.fill('[placeholder="Search..."]', 'widget')
  await page.waitForResponse(/api\/search/)
  await expect(page.locator('.product-card')).toHaveCount(3)
})
```

### Integration Tests with MSW

```tsx
import { server } from '../mocks/server'
import { render, screen } from 'solid-testing-library'
import ProductList from './ProductList'

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

test('shows products from API', async () => {
  render(() => <ProductList />)
  await screen.findByText('Widget')
  expect(screen.getByText('$10')).toBeDefined()
})
```

## Migration Patterns

### React to SolidJS

```tsx
// React useState + useEffect + useMemo
const [user, setUser] = useState(null)
const [posts, setPosts] = useState([])
useEffect(() => { fetchUser(id).then(setUser) }, [id])
useEffect(() => { if (user) fetchPosts(user.id).then(setPosts) }, [user])
const displayName = useMemo(() => user?.name.toUpperCase(), [user])

// SolidJS
const [user] = createResource(() => id, fetchUser)
const [posts] = createResource(user, (u) => u ? fetchPosts(u.id) : [])
const displayName = createMemo(() => user()?.name.toUpperCase())
```

### Vue Options API to SolidJS

```tsx
// Vue: data() + computed + watch
export default {
  data: () => ({ count: 0 }),
  computed: { doubled: () => this.count * 2 },
  watch: { count(val) { console.log(val) } },
}

// Solid: createSignal + createMemo + createEffect
const [count, setCount] = createSignal(0)
const doubled = createMemo(() => count() * 2)
createEffect(() => console.log(count()))
```

### Svelte to SolidJS

```svelte
// Svelte
let count = $state(0)
let doubled = $derived(count * 2)
$effect(() => console.log(count))
```

```tsx
// Solid
const [count, setCount] = createSignal(0)
const doubled = createMemo(() => count() * 2)
createEffect(() => console.log(count()))
```

## Anti-Patterns

### Using createEffect for Data Fetching

```tsx
// Anti-pattern
createEffect(async () => {
  const data = await fetch(`/api/users/${id()}`).then(r => r.json())
  setUsers(data)
})

// Correct
const [users] = createResource(() => id(), fetchUsers)
```

### Mutating createStore Directly

```tsx
// Anti-pattern: direct mutation on store ref
const state = createStore({ count: 0 }) // returns [state, setState]
state.count = 5 // doesn't trigger update

// Correct
const [state, setState] = createStore({ count: 0 })
setState('count', 5)
```

### Overusing createEffect

```tsx
// Anti-pattern: effect for derived display logic
createEffect(() => {
  document.title = `Count: ${count()}`
})
// If this is the only thing that needs count, it's fine.
// But consider: can you inline the expression?
```

### Conditional Signal Creation

Components run once — signals at top level only.

### Not Providing Error Boundaries

Resources can throw. Wrap resource consumers in ErrorBoundary for production robustness.

## Common Pitfalls

1. **Destructuring signals** — always call `count()` not `count`
2. **createEffect for computation** — use createMemo
3. **Conditional createSignal** — top level only
4. **Missing onCleanup** — always clean up subscriptions
5. **createStore for single values** — use createSignal
6. **Not using Suspense** — resources need Suspense boundaries
7. **Mutating createStore directly** — use setState path syntax
8. **Forgetting ErrorBoundary** — resources can throw

## Best Practices

1. `createSignal` for primitives, `createStore` for objects
2. `createResource` for all async data — never fetch in effects
3. `createMemo` for derived values — never createEffect
4. Always onCleanup in effects with subscriptions
5. Signals at top level only — never conditional
6. Use `untrack()` to read without subscribing
7. Prefer path syntax for createStore updates
8. Wrap resource consumers in Suspense + ErrorBoundary

## Compared With

| Aspect | SolidJS | React | Vue |
|--------|---------|-------|-----|
| Reactivity | Fine-grained signals | VDOM diff | Proxy-based |
| Component | Once, not re-run | Every render | Once (setup), re-run (template) |
| Async | createResource | TanStack Query | useAsyncData |
| Forms | Manual signals | React Hook Form | v-model |
| Bundle | ~8KB | ~45KB | ~30KB |
| SSR | SolidStart | Next.js | Nuxt |

## Tooling

1. `npm run dev` — HMR dev server
2. `npm run build` — production build
3. `npx solid-devtools` — CLI reactivity inspector
4. Solid DevTools browser extension
5. `npm create solid` — project scaffolding

## Rules
- createResource for all async data — never fetch in effects.
- Wrap resource consumers in Suspense.
- Validate forms with Zod on submit — both client and server.
- Children as functions for render-props pattern.
- CSS transitions are preferred — Solid Flip for list reorder.
- Avoid createEffect for data fetching — use createResource.
- Signals for local state, stores for shared state, createResource for server state.
- Use islands architecture for SSR — minimize JavaScript sent to client.
- Choose state management based on scope — don't use global store for local state.

## References
  - references/solid-data.md — SolidJS Data — createResource, Suspense, Error Boundaries, Lazy Loading
  - references/solid-forms.md — SolidJS Forms — Controlled Inputs, Validation, Field Arrays, Custom Form State
  - references/solidjs-routing.md — SolidJS Routing Patterns
  - references/solidjs-state.md — SolidJS State Management Patterns
  - references/solidjs-testing.md — SolidJS Testing Reference
  - references/solidjs-ui-patterns.md — SolidJS Patterns
## Handoff
No artifact produced.
Next skill: frontend-universal-testing for unit/integration tests in SolidJS.
Carry forward: resource patterns, form validation approach, composition patterns.
