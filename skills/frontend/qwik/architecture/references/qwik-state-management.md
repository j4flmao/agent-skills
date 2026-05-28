# Qwik State Management

## Overview

Qwik state management is fundamentally different from React, Vue, or Angular. Because Qwik uses resumability (not hydration), state must be serializable to HTML and deserialized on the client without running component code. This imposes constraints on what kinds of state can be used and how it flows through the application.

## Core State Primitives

### useSignal

The most basic reactive primitive. Used for simple values that trigger updates when changed.

```tsx
import { component$, useSignal } from '@builder.io/qwik'

export default component$(() => {
  const count = useSignal(0)
  const name = useSignal('World')

  return (
    <div>
      <p>Count: {count.value}</p>
      <p>Name: {name.value}</p>
      <button onClick$={() => count.value++}>Increment</button>
      <button onClick$={() => name.value = 'Qwik'}>Set Name</button>
    </div>
  )
})
```

Key behaviors:
- `useSignal(T)` creates a signal with initial value T
- Access via `.value` property (not function call like SolidJS)
- Assignment triggers updates only for consumers tracking this signal
- Signals are deeply serialized into HTML as JSON
- Only the signal owner component can write to it

### useStore

For complex objects and nested state. Provides deep reactivity.

```tsx
import { component$, useStore } from '@builder.io/qwik'

interface FormState {
  user: { name: string; email: string }
  items: { id: number; text: string; completed: boolean }[]
  metadata: { tags: string[] }
}

export default component$(() => {
  const state = useStore<FormState>({
    user: { name: '', email: '' },
    items: [],
    metadata: { tags: [] },
  })

  return (
    <div>
      <input
        value={state.user.name}
        onInput$={(e, el) => state.user.name = el.value}
      />
      <ul>
        {state.items.map((item, i) => (
          <li key={item.id}>
            <span>{item.text}</span>
            <button onClick$={() => state.items.splice(i, 1)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  )
})
```

Key behaviors:
- Deeply reactive — mutations at any nesting level trigger updates
- Arrays support `push`, `splice`, `pop` (proxy traps)
- Objects support property assignment, deletion
- Must be initialized with all keys — cannot add new properties later
- Serialized to HTML as JSON in a `<script type="qwik/json">` tag

### useComputed$

Derived values that recompute when dependencies change.

```tsx
import { component$, useSignal, useComputed$ } from '@builder.io/qwik'

export default component$(() => {
  const items = useStore([
    { text: 'Learn Qwik', completed: false },
    { text: 'Build app', completed: true },
  ])
  const filter = useSignal<'all' | 'active' | 'completed'>('all')

  const filteredItems = useComputed$(() => {
    if (filter.value === 'all') return items
    const done = filter.value === 'completed'
    return items.filter(item => item.completed === done)
  })

  return (
    <div>
      <select value={filter.value} onChange$={(e, el) => filter.value = el.value}>
        <option value="all">All</option>
        <option value="active">Active</option>
        <option value="completed">Completed</option>
      </select>
      <ul>
        {filteredItems.value.map(item => <li>{item.text}</li>)}
      </ul>
    </div>
  )
})
```

Key behaviors:
- Takes a function that returns a derived value
- Automatically tracks signal/store reads inside the function
- Recomputes lazily when any dependency changes
- The `$` suffix makes this a lazy boundary — the computation can be code-split

### useContext and useContextProvider

For sharing state across components without prop drilling.

```tsx
import { createContextId, useContext, useContextProvider } from '@builder.io/qwik'

interface ThemeContext {
  theme: 'light' | 'dark'
  toggle: () => void
}

export const ThemeContextId = createContextId<ThemeContext>('theme')

// Provider (in root or layout)
export default component$(() => {
  useContextProvider(ThemeContextId, {
    theme: useSignal('light'),
    toggle: $(() => theme.value = theme.value === 'light' ? 'dark' : 'light'),
  })

  return <Slot />
})

// Consumer (any descendant)
export default component$(() => {
  const theme = useContext(ThemeContextId)
  return <div class={theme.theme.value}>
    <button onClick$={theme.toggle}>Toggle Theme</button>
  </div>
})
```

Key behaviors:
- `createContextId<T>(id)` creates a typed context key
- `useContextProvider` in a parent component sets the value
- `useContext` in any descendant retrieves the value
- Context is serialized — the provided value must be serializable
- Context is tree-scoped, not global

## Serialization Constraints

Qwik's resumability model requires that all state be serialized to HTML on the server and deserialized on the client. This imposes important constraints:

### What Can Be Serialized

| Type | Serializable | Notes |
|------|-------------|-------|
| Primitives (string, number, boolean) | Yes | Direct JSON conversion |
| Plain objects | Yes | Must have known keys |
| Arrays | Yes | Elements must be serializable |
| Dates | Yes | Converted to ISO string |
| Maps, Sets | No | Not JSON-serializable |
| Functions | No | Cannot be serialized |
| Promises | No | Cannot be serialized |
| DOM elements | No | Cannot be serialized |
| Class instances | Partial | Only own enumerable properties |

### Serialization Best Practices

```tsx
// Good — plain serializable state
const state = useStore({
  id: 123,
  name: 'Product',
  tags: ['sale', 'new'],
  metadata: { views: 0 },
})

// Bad — non-serializable state
const state = useStore({
  date: new Date(),          // OK (ISO string)
  map: new Map(),            // Not serializable
  handler: (x: number) => x, // Not serializable
  element: document.body,    // Not serializable
})

// Workaround for non-serializable values
const state = useStore({
  dateString: new Date().toISOString(),  // Store as string
  handlerRef: null as (() => void) | null, // Set after deserialization
})

// After mount, attach non-serializable stuff
useVisibleTask$(() => {
  state.handlerRef = () => console.log('mounted')
})
```

## State Flow Patterns

### Pattern 1: Props Down, Events Up

```tsx
// Parent
export default component$(() => {
  const items = useStore<string[]>([])

  return (
    <Child
      items={items}
      onAddItem={$((item: string) => items.push(item))}
    />
  )
})

// Child
interface ChildProps {
  items: string[]
  onAddItem: (item: string) => void
}

export default component$((props: ChildProps) => {
  return (
    <div>
      <button onClick$={() => props.onAddItem('new')}>Add</button>
      {props.items.map(item => <p>{item}</p>)}
    </div>
  )
})
```

### Pattern 2: Context for Global State

```tsx
// auth-context.ts
import { createContextId, type Signal } from '@builder.io/qwik'

export interface AuthState {
  user: { id: string; name: string; email: string } | null
  token: string | null
  isAuthenticated: boolean
}

export const AuthContextId = createContextId<AuthState>('auth')
export const AuthActionsId = createContextId<{
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}>('auth-actions')
```

### Pattern 3: URL as State

Qwik City integrates URL state with route params and search params:

```tsx
import { useLocation, useNavigate } from '@builder.io/qwik-city'

export default component$(() => {
  const loc = useLocation()
  const nav = useNavigate()

  // URL search params
  const page = loc.url.searchParams.get('page') ?? '1'
  const query = loc.url.searchParams.get('q') ?? ''

  return (
    <div>
      <input
        value={query}
        onInput$={(e, el) => nav(`?q=${el.value}&page=1`)}
      />
      <p>Page {page}</p>
    </div>
  )
})
```

## Advanced State Patterns

### Derived State with useComputed$

For expensive computations, `useComputed$` caches results and only recomputes when dependencies change:

```tsx
export default component$(() => {
  const items = useStore([
    { id: 1, text: 'A', score: 10 },
    { id: 2, text: 'B', score: 20 },
    { id: 3, text: 'C', score: 5 },
  ])
  const sortBy = useSignal<'score' | 'name'>('score')

  const sortedItems = useComputed$(() => {
    const sorted = [...items]
    if (sortBy.value === 'score') {
      sorted.sort((a, b) => b.score - a.score)
    } else {
      sorted.sort((a, b) => a.text.localeCompare(b.text))
    }
    return sorted
  })

  const totalScore = useComputed$(() =>
    items.reduce((sum, item) => sum + item.score, 0)
  )

  return (
    <div>
      <p>Total: {totalScore.value}</p>
      <button onClick$={() => sortBy.value = 'score'}>Sort by Score</button>
      <button onClick$={() => sortBy.value = 'name'}>Sort by Name</button>
      <ul>
        {sortedItems.value.map(item => <li>{item.text} ({item.score})</li>)}
      </ul>
    </div>
  )
})
```

### useVisibleTask$ for Non-Serializable State

When you need state that cannot be serialized (DOM measurements, third-party library instances, WebSocket connections):

```tsx
export default component$(() => {
  const dimensions = useSignal({ width: 0, height: 0 })
  const socket = useSignal<WebSocket | null>(null)

  useVisibleTask$(() => {
    // Measure DOM — cannot be done on server
    dimensions.value = {
      width: window.innerWidth,
      height: window.innerHeight,
    }

    // WebSocket — cannot be serialized
    const ws = new WebSocket('wss://example.com')
    socket.value = ws

    return () => {
      ws.close()
    }
  })

  return (
    <div>
      <p>Window: {dimensions.value.width}x{dimensions.value.height}</p>
    </div>
  )
})
```

### Task-Based State Synchronization

Qwik provides `useTask$` for running logic when state changes, similar to `$effect` in Svelte or `createEffect` in SolidJS:

```tsx
import { component$, useSignal, useTask$ } from '@builder.io/qwik'

export default component$(() => {
  const searchQuery = useSignal('')
  const results = useSignal<string[]>([])
  const isSearching = useSignal(false)

  useTask$(({ track, cleanup }) => {
    track(() => searchQuery.value)

    if (!searchQuery.value) {
      results.value = []
      return
    }

    isSearching.value = true
    const controller = new AbortController()
    cleanup(() => controller.abort())

    const timeout = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${searchQuery.value}`, {
        signal: controller.signal,
      })
      results.value = await res.json()
      isSearching.value = false
    }, 300)

    cleanup(() => clearTimeout(timeout))
  })

  return (
    <div>
      <input
        value={searchQuery.value}
        onInput$={(e, el) => searchQuery.value = el.value}
      />
      {isSearching.value && <p>Searching...</p>}
      <ul>
        {results.value.map(r => <li>{r}</li>)}
      </ul>
    </div>
  )
})
```

Key `useTask$` behaviors:
- `track(fn)` registers dependencies — reruns when tracked signals change
- `cleanup(fn)` registers a cleanup function for the previous run
- Runs eagerly on first render (use `useVisibleTask$` for browser-only)
- The `$` suffix makes it a lazy boundary

### useServerData$ for SSR Data

Bridges server-side data to the client without re-fetching:

```tsx
// In a route
export const useServerTime = server$(async () => {
  return { time: new Date().toISOString(), server: 'Node' }
})

// In a component
export default component$(() => {
  const serverData = useServerTime()

  return (
    <div>
      <p>Server time: {serverData.value.time}</p>
    </div>
  )
})
```

## State and Routing

### Route Loader State

```tsx
// src/routes/products/[id]/index.tsx
import { component$ } from '@builder.io/qwik'
import { routeLoader$ } from '@builder.io/qwik-city'

export const useProductLoader = routeLoader$(async ({ params, request }) => {
  const res = await fetch(`https://api.example.com/products/${params.id}`, {
    headers: { Authorization: request.headers.get('Authorization') ?? '' },
  })
  if (!res.ok) throw new Response('Not Found', { status: 404 })
  return res.json() as Product
})

export default component$(() => {
  const product = useProductLoader()

  return (
    <div>
      <h1>{product.value.name}</h1>
      <p>{product.value.description}</p>
      <p>${product.value.price}</p>
    </div>
  )
})
```

### Form Action State

```tsx
export const useCreateProduct = routeAction$(async (form, { fail, redirect }) => {
  const name = form.get('name') as string
  const price = Number(form.get('price'))

  if (!name || name.length < 2) {
    return fail(400, { fieldErrors: { name: 'Name must be at least 2 characters' } })
  }

  if (isNaN(price) || price <= 0) {
    return fail(400, { fieldErrors: { price: 'Price must be a positive number' } })
  }

  const product = await db.product.create({ data: { name, price } })
  throw redirect(302, `/products/${product.id}`)
})

export default component$(() => {
  const action = useCreateProduct()

  return (
    <Form action={action}>
      <div>
        <label>Name</label>
        <input name="name" />
        {action.value?.fieldErrors?.name && <p>{action.value.fieldErrors.name}</p>}
      </div>
      <div>
        <label>Price</label>
        <input name="price" type="number" step="0.01" />
        {action.value?.fieldErrors?.price && <p>{action.value.fieldErrors.price}</p>}
      </div>
      <button type="submit">Create</button>
    </Form>
  )
})
```

## Performance Considerations

### Serialization Size

Each signal and store is serialized as JSON in the HTML. For large data:
- Avoid storing computed/derived data alongside raw data
- Use `useComputed$` for derivations instead of pre-computing
- Consider pagination for lists over 100 items
- Benchmark HTML size with `qwik inspect` command

### Signal vs Store Selection

- `useSignal`: Best for single values (count, toggle, input text). Lower overhead than a store with one key.
- `useStore`: Best for objects with 2+ properties or arrays. Provides deep reactivity.
- `useComputed$`: Best for derived values. Only recomputes when dependencies change.

### Avoiding Unnecessary Reactivity

```tsx
// Bad — entire store tracked even when only one property is read
const state = useStore({ count: 0, name: 'Qwik', items: [] })
// Reading state.name creates a dependency on the entire store

// Better — separate signals for independent concerns
const count = useSignal(0)
const name = useSignal('Qwik')
const items = useStore([])
```

### Context Overhead

`useContext` creates a dependency on the entire context value. If the context object has 10 properties and a component only reads one, it still re-renders when any property changes. Split large contexts into smaller, focused contexts.

## Testing State

```tsx
import { createDOM } from '@builder.io/qwik/testing'

it('should increment count', async () => {
  const { screen, render } = await createDOM()
  await render(<Counter />)

  const button = screen.querySelector('button')!
  expect(screen.querySelector('p')?.textContent).toBe('Count: 0')

  button.click()
  await waitFor()
  expect(screen.querySelector('p')?.textContent).toBe('Count: 1')
})
```

## Summary

| Pattern | When to Use | Serializable |
|---------|-------------|-------------|
| useSignal | Single values | Yes |
| useStore | Complex objects, arrays | Yes |
| useComputed$ | Derived values | No (computed lazily) |
| useContext | Shared scoped state | Yes (value must be) |
| useTask$ | State change reactions | No |
| useVisibleTask$ | Browser-only state | No |
| routeLoader$ | Server data for routes | Yes |
| routeAction$ | Form mutations | Yes |
