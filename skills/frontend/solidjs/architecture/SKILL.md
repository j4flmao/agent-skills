---
name: frontend-solidjs-architecture
description: >
  Use this skill when the user says 'SolidJS', 'SolidJS architecture', 'Solid signal', 'Solid component', 'Solid reactivity', 'SolidJS app', 'Solid router', 'SolidJS vs React', 'SolidJS fine-grained'. This skill enforces: fine-grained reactivity via Signals/Memos/Effects, compiled JSX with no virtual DOM, declarative control flow components (Show/For/Switch), createStore for deep reactivity, and @solidjs/router for routing. Requires SolidJS project (package.json with solid-js). Do NOT use for: React, Vue, or Svelte projects.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, solidjs, phase-7]
---

# SolidJS Architecture

## Purpose
Build applications with SolidJS fine-grained reactivity — no virtual DOM, compiled JSX, signals-based state management, and declarative control flow.

## Agent Protocol

### Trigger
Exact user phrases: "SolidJS", "SolidJS architecture", "Solid signal", "Solid component", "Solid reactivity", "SolidJS app", "Solid router", "SolidJS vs React", "SolidJS fine-grained".

### Input Context
Before activating, verify:
- package.json has solid-js dependency.
- Whether the project uses Vite with the Solid plugin.
- Whether @solidjs/router is installed for routing.

### Output Artifact
No file output. Produces component patterns, signal/store usage, control flow examples, and routing setup as text.

### Response Format
Code: show signal/component definitions. No imports. Control flow with Show/For/Switch.

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Components use signals (createSignal) for local state.
- [ ] Derived values use createMemo, not createEffect.
- [ ] Deep state uses createStore with path syntax for updates.
- [ ] Control flow uses <Show>, <For>, <Switch>, <Index> components.
- [ ] @solidjs/router configured with lazy loading for code splitting.
- [ ] No use of hooks rules — components run once.
- [ ] JSX compiles to real DOM expressions, not vdom.

### Max Response Length
Code: 15 lines per example. Unlimited patterns.

## Component Architecture / Decision Trees

### Architecture Options

| Approach | Trade-off | When to Use |
|----------|-----------|-------------|
| createSignal for local state | Simple, per-value granularity | Individual values, toggles, inputs |
| createStore for deep objects | Path-based updates, nested tracking | Forms, complex state objects |
| createMutable for mutable syntax | Direct mutation, less boilerplate | Legacy code migration, prototyping |
| Context + createContext | Shared state via provider tree | Theming, auth, i18n |
| Resources (createResource) | Async data with Suspense | API data fetching |
| createMemo for derived state | Cached computation | Computed values from signals/stores |

### Decision Tree: State Management

```
Is the state local to one component?
  ├── Is it a single value? -> createSignal
  ├── Is it a complex object? -> createStore
  └── Is it an async resource? -> createResource
  └── No (shared) -> Is it tree-scoped?
       ├── Yes -> Context + createContext
       └── No -> Module-level signal or store
```

### Decision Tree: Control Flow

```
Are you conditionally showing content?
  ├── Simple if/else -> <Show>
  ├── Multiple conditions -> <Switch> + <Match>
  └── List rendering:
       ├── Array of primitives -> <Index>
       └── Array of objects -> <For> (with stable keys)
```

### Decision Tree: Effect Strategy

```
What kind of side effect?
  ├── React to signal change -> createEffect with tracking
  ├── DOM mutation after render -> createEffect (DOM access safe here)
  ├── Cleanup on dispose -> onCleanup inside createEffect
  └── No tracking needed -> createRenderEffect (runs before DOM paint)
```

## Component Design Patterns

### Counter with createSignal

```tsx
function Counter(props: { initial?: number }) {
  const [count, setCount] = createSignal(props.initial ?? 0)
  const doubled = createMemo(() => count() * 2)
  return (
    <div>
      <p>Count: {count()}</p>
      <p>Doubled: {doubled()}</p>
      <button onClick={() => setCount(c => c + 1)}>+</button>
      <button onClick={() => setCount(c => c - 1)}>-</button>
    </div>
  )
}
```

### Form with createStore

```tsx
function SignupForm() {
  const [form, setForm] = createStore({
    email: '', password: '', confirmPassword: '',
    errors: {} as Record<string, string>,
  })
  const [submitted, setSubmitted] = createSignal(false)

  const isValid = createMemo(() =>
    form.email.includes('@') && form.password.length >= 8
  )

  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    const result = schema.safeParse({ email: form.email, password: form.password })
    if (!result.success) {
      setForm('errors', result.error.flatten().fieldErrors)
      return
    }
    await submitToApi(result.data)
    setSubmitted(true)
  }

  return (
    <form onSubmit={handleSubmit}>
      <input value={form.email} onInput={(e) => setForm('email', e.currentTarget.value)} />
      {form.errors.email && <span>{form.errors.email}</span>}
      <input type="password" value={form.password} onInput={(e) => setForm('password', e.currentTarget.value)} />
      <button type="submit" disabled={!isValid()}>Submit</button>
    </form>
  )
}
```

### Data Fetching with createResource

```tsx
function UserProfile() {
  const params = useParams()
  const [user, { mutate, refetch }] = createResource(() => params.id, fetchUser)

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Show when={user()} fallback={<div>User not found</div>}>
        <h1>{user().name}</h1>
        <p>{user().email}</p>
        <button onClick={() => mutate({ ...user()!, name: 'Updated' })}>Optimistic Update</button>
        <button onClick={refetch}>Refresh</button>
      </Show>
    </Suspense>
  )
}
```

### Context Provider Pattern

```tsx
const ThemeContext = createContext<{ theme: () => string; toggle: () => void }>()

function ThemeProvider(props: { children: any }) {
  const [theme, setTheme] = createSignal('light')
  const toggle = () => setTheme(t => t === 'light' ? 'dark' : 'light')
  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {props.children}
    </ThemeContext.Provider>
  )
}

function ThemedButton() {
  const ctx = useContext(ThemeContext)!
  return <button class={`btn-${ctx.theme()}`} onClick={ctx.toggle}>Toggle Theme</button>
}
```

## State Management Patterns

### Local State with createSignal

```tsx
const [count, setCount] = createSignal(0)
const [name, setName] = createSignal('')
const [items, setItems] = createSignal<string[]>([])

setCount(5)
setName('John')
setItems([...items(), 'new item'])
setItems(items => [...items, 'new item']) // functional update
```

### Derived State with createMemo

```tsx
const count = createSignal(0)
const doubled = createMemo(() => count() * 2)
const label = createMemo(() => count() > 10 ? 'High' : 'Low')
// doubled() and label() are cached until count() changes
```

### Complex State with createStore

```tsx
const [state, setState] = createStore({
  user: { profile: { name: 'Alice', email: 'alice@test.com' }, settings: { theme: 'dark' } },
  items: [] as Item[],
})
setState('user', 'profile', 'name', 'Bob') // path syntax
setState('items', items => [...items, newItem]) // functional
```

### Shared State with Context

```tsx
const AuthContext = createContext<{ user: () => User | null; login: (e: string, p: string) => Promise<void> }>()

function AuthProvider(props: { children: any }) {
  const [user, setUser] = createSignal<User | null>(null)
  const login = async (email: string, password: string) => {
    const u = await api.login(email, password)
    setUser(u)
  }
  return <AuthContext.Provider value={{ user, login }}>{props.children}</AuthContext.Provider>
}
```

### Server State with createResource

```tsx
const [data, { mutate, refetch }] = createResource(source, fetcher)
// source: reactive signal — refetches when source changes
// fetcher: async function that returns data
// mutate: optimistic update without refetch
// refetch: force re-fetch
```

## Performance Optimization

### No VDOM Overhead
SolidJS skips the virtual DOM entirely. The compiler produces direct DOM manipulation code:
```tsx
// Input
<p>Count: {count()}</p>
// Compiled output (conceptual):
// textNode.data = `Count: ${count()}`
```
No diffing, no reconciliation, no component-level re-renders.

### Granular Updates
When a signal changes, only the specific DOM nodes reading that signal update. A list of 1000 items updating one item updates exactly one DOM node — not the list, not the parent, not the component.

### createStore Proxy Cost
`createStore` wraps objects in proxies for deep tracking. For very large arrays (10K+), proxy overhead can be significant. Use `createSignal` with immutable updates for performance-critical large lists.

### Bundle Size
- SolidJS runtime: ~8KB gzipped (vs React ~45KB, Vue ~30KB).
- No JSX runtime needed — compiled away at build time.
- Lazy imports via `lazy()` for route-level code splitting.

### createEffect Best Practices
- Effects run after DOM paint — safe to access DOM elements
- Use `onCleanup` for subscriptions, intervals, listeners
- Keep effects focused on one concern
- Avoid reading signals in effects that don't need tracking (use `untrack`)

## Build & Bundle Considerations

### Vite Configuration

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'

export default defineConfig({
  plugins: [solidPlugin()],
  build: {
    target: 'esnext',
    polyfillDynamicImport: false,
  },
})
```

### Build Commands
```bash
npm run build    # Production build to dist/
npm run dev      # Dev server with HMR
```

### Code Splitting

```tsx
import { lazy } from 'solid-js'
const Home = lazy(() => import('./pages/Home'))
const Users = lazy(() => import('./pages/Users'))

<Router>
  <Route path="/" component={Home} />
  <Route path="/users" component={Users} />
</Router>
```

### SolidJS with TypeScript
- Use `Component<Props>` type for component definitions
- Signal types inferred automatically
- Use `JSX.Element` for children/rendered content type

## Testing Strategies

### Unit Testing Signals

```tsx
import { createSignal, createMemo, createEffect } from 'solid-js'
import { describe, it, expect } from 'vitest'

describe('signals', () => {
  it('createSignal works', () => {
    const [count, setCount] = createSignal(0)
    expect(count()).toBe(0)
    setCount(5)
    expect(count()).toBe(5)
  })

  it('createMemo caches derived values', () => {
    const [count, setCount] = createSignal(0)
    const doubled = createMemo(() => count() * 2)
    expect(doubled()).toBe(0)
    setCount(5)
    expect(doubled()).toBe(10)
  })
})
```

### Testing Components

```tsx
// __tests__/Counter.test.tsx
import { render, screen, fireEvent } from 'solid-testing-library'
import { describe, it, expect } from 'vitest'
import Counter from './Counter'

describe('Counter', () => {
  it('renders initial count', () => {
    render(() => <Counter initial={5} />)
    expect(screen.getByText('5')).toBeDefined()
  })

  it('increments on click', async () => {
    render(() => <Counter />)
    const btn = screen.getByRole('button')
    fireEvent.click(btn)
    expect(screen.getByText('1')).toBeDefined()
  })
})
```

### E2E Testing

```tsx
// e2e/app.spec.ts
import { test, expect } from '@playwright/test'

test('loads home page', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('h1')).toBeVisible()
})
```

## Migration Patterns

### React to SolidJS

```tsx
// React: useState + useEffect + useMemo
const [count, setCount] = useState(0)
const doubled = useMemo(() => count * 2, [count])
useEffect(() => { document.title = `Count: ${count}` }, [count])

// SolidJS: createSignal + createMemo + createEffect
const [count, setCount] = createSignal(0)
const doubled = createMemo(() => count() * 2)
createEffect(() => { document.title = `Count: ${count()}` })
```

| React | SolidJS |
|-------|---------|
| useState | createSignal |
| useReducer | createStore with manual actions |
| useEffect | createEffect |
| useMemo | createMemo |
| useCallback | $() or module-level function |
| useContext + createContext | createContext |
| useRef | createSignal (for DOM) or ref prop |

## Anti-Patterns

### Destructuring Signals

```tsx
// Anti-pattern: destructuring loses tracking
const { count, setCount } = useCounter()
// <p>{count}</p> — never updates

// Correct: keep as signal
const count = useCounter()
// <p>{count()}</p>
```

### createEffect for Derived State

```tsx
// Anti-pattern: effect for computation
createEffect(() => { setDoubled(count() * 2) })

// Correct: memo
const doubled = createMemo(() => count() * 2)
```

### Conditional createSignal

```tsx
// Anti-pattern: signal inside condition
if (condition) { const [x] = createSignal(0) }

// Correct: always at top level
const [x] = createSignal(0)
```

### Forgetting onCleanup

```tsx
// Anti-pattern: no cleanup
createEffect(() => {
  const interval = setInterval(tick, 1000)
  // memory leak!
})

// Correct
createEffect(() => {
  const interval = setInterval(tick, 1000)
  onCleanup(() => clearInterval(interval))
})
```

## Common Pitfalls

### Pitfall 1: Destructuring Signals
```tsx
// Wrong — destructuring breaks reactivity tracking
const [count, setCount] = createSignal(0)
const doubled = () => count() * 2 // trackable

// Wrong in JSX:
// <p>{count}</p> — count is a function, not the value
// Correct:
// <p>{count()}</p>
```
Signals are getter functions. Always call them as `count()` inside reactive scopes.

### Pitfall 2: Using createEffect for Derived State
```tsx
// Wrong — effect for computation
createEffect(() => { setDoubled(count() * 2) })
// Correct — memo for derived values
const doubled = createMemo(() => count() * 2)
```

### Pitfall 3: Conditional Hook Calls
Unlike React, SolidJS components run once. You cannot call createSignal conditionally or inside loops:
```tsx
// Wrong — signal created conditionally
if (condition) { const [x] = createSignal(0) }
// Correct — signal at top level
const [x] = createSignal(0)
```

### Pitfall 4: Forgetting onCleanup
Effects and event listeners need cleanup to prevent memory leaks:
```tsx
createEffect(() => {
  const interval = setInterval(tick, 1000)
  onCleanup(() => clearInterval(interval))
})
```

### Pitfall 5: Overusing createStore for Simple Values
`createStore` adds proxy overhead. For single primitive values or simple objects, `createSignal` is more efficient and easier to use.

## Compared With

### SolidJS vs React
| Aspect | SolidJS | React |
|--------|---------|-------|
| Rendering | No VDOM, direct DOM updates | VDOM diffing |
| Reactivity | Fine-grained signals | Component-level re-render |
| Component execution | Once | Every render cycle |
| State | createSignal/createStore | useState/useReducer |
| Derived state | createMemo | useMemo |
| Side effects | createEffect | useEffect |
| Bundle size | ~8KB (no runtime) | ~45KB + react-dom |
| Learning curve | Moderate (signals pattern) | High (hooks rules, deps) |

### SolidJS vs Vue
Vue uses a proxy-based reactivity system similar to SolidJS's stores. SolidJS compiles JSX to discrete DOM operations, while Vue uses a virtual DOM. SolidJS is generally faster but Vue has a larger ecosystem.

### SolidJS vs Svelte
Both compile to fine-grained DOM updates. Svelte uses template syntax with magic assignments; SolidJS uses JSX with explicit function calls for signals. SolidJS feels more like React; Svelte feels more like vanilla HTML.

## Ecosystem & Tooling

### Core Packages
| Package | Purpose |
|---------|---------|
| solid-js | Core framework (signals, stores, components) |
| @solidjs/router | File-like routing with signals |
| @solidjs/start | Meta-framework (SSR, server functions) |
| solid-mdx | MDX support for SolidJS |

### Tools
- **Solid VS Code Extension** — Syntax highlighting, IntelliSense for signals and JSX.
- **Vite Plugin Solid** — Official Vite plugin with HMR.
- **Solid DevTools** — Chrome extension for inspecting signals and component graph.
- **solid-devtools** — CLI-based dev tools for reactivity inspection.

### UI Libraries
- **Solid UI** — Component library for SolidJS.
- **Kobalte** — Headless UI primitives (port of Radix UI).
- **Hope UI** — Chakra UI-inspired component library.
- **Mantine Solid** — Mantine port for SolidJS.

### Community
- Docs: solidjs.com
- GitHub: github.com/solidjs/solid
- Discord: discord.gg/solidjs
- Playground: playground.solidjs.com

## Workflow

### Step 1: Reactivity Model
```tsx
const [count, setCount] = createSignal(0)
const doubled = createMemo(() => count() * 2)
createEffect(() => console.log(`Count: ${count()}`))

setCount(5)
setCount(p => p + 1)
```
Signals are lazy — nothing recomputes until a signal is read inside a tracking scope.

### Step 2: Component Model
```tsx
function Counter(props: { initial?: number }) {
  const [count, setCount] = createSignal(props.initial ?? 0)
  return <button onClick={() => setCount(c => c + 1)}>{count()}</button>
}
```
Components run once. JSX compiles to `document.createElement` calls. Only signal expressions re-execute — not the whole component.

### Step 3: Control Flow
```tsx
<Show when={user()} fallback={<p>Loading...</p>}>
  <p>Welcome {user().name}</p>
</Show>

<For each={items()}>{(item, i) => <li>{i()}: {item.name}</li>}</For>

<Switch fallback={<p>Unknown</p>}>
  <Match when={tab() === 'info'}><Info /></Match>
  <Match when={tab() === 'settings'}><Settings /></Match>
</Switch>

<Index each={letters()}>{(letter, i) => <span>{i()}: {letter()}</span>}</Index>
```

### Step 4: State Management with createStore
```tsx
const [state, setState] = createStore({ user: { name: 'Alice' }, items: [] })
setState('user', 'name', 'Bob')
setState('items', items => [...items, { id: 1 }])

const mutable = createMutable({ count: 0 })
mutable.count++
```
Use createStore for complex state. Prefer path syntax over destructuring stores.

### Step 5: Resources and Suspense
```tsx
const [user] = createResource(() => params.id, fetchUser)

<Suspense fallback={<p>Loading user...</p>}>
  <p>{user()?.name}</p>
</Suspense>
```
Resources automatically track dependencies and refetch when params change.

### Step 6: Routing
```tsx
import { Router, Route } from '@solidjs/router'
import { lazy } from 'solid-js'

const Home = lazy(() => import('./pages/Home'))
const Users = lazy(() => import('./pages/Users'))

<Router>
  <Route path="/" component={Home} />
  <Route path="/users" component={Users} />
  <Route path="/users/:id" component={lazy(() => import('./pages/UserDetail'))} />
</Router>
```
Route params are signals: `const params = useParams()`. Prefetch with `<Link>`.

## Rules
- No hooks rules — components run once. Don't call signals conditionally.
- JSX is compiled, not interpreted. No dynamic component creation.
- Destructure signals with care — use `props.name` as `() => props.name`.
- Use createMemo for derived values. Never use createEffect for computing values.
- Solid is compile-time optimized — trust the compiler.
- createStore path syntax for targeted updates. Avoid replacing entire objects.
- Always call signals as functions (`count()`) inside reactive contexts.
- onCleanup inside createEffect for subscriptions, intervals, event listeners.
- Use createResource for async data with Suspense boundaries.
- Avoid createMutable in production — prefer createStore for predictability.

## References
- references/solid-components.md — SolidJS Components — JSX, Control Flow, Context, Portals, Lifecycle
- references/solid-reactivity.md — SolidJS Reactivity — Signals, Memos, Effects, Stores, Batching
- references/solidjs-component-architecture.md — SolidJS Component Architecture
- references/solidjs-optimization.md — SolidJS Optimization Patterns
- references/solidjs-reactivity.md — SolidJS Reactivity Patterns
- references/solidjs-signal-patterns.md — SolidJS Signal Patterns
- references/solidjs-reactivity-deep-dive.md — SolidJS Reactivity Deep Dive
- references/solidjs-composables-primitives.md — SolidJS Composables and Primitives

## Handoff
No artifact produced.
Next skill: frontend-solidjs-patterns for data fetching, forms, composition, and animation.
Carry forward: signal patterns, store usage, control flow conventions.
