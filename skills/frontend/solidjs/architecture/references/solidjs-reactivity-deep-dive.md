# SolidJS Reactivity Deep Dive

## The Reactive System

SolidJS implements a fine-grained reactive system based on the observer pattern. Unlike React (which re-renders entire components) or Vue (which uses proxy-based reactivity at the component level), SolidJS tracks dependencies at the individual signal level and updates only the specific DOM nodes that depend on a changed signal.

### Core Concepts

1. **Signals** — The atomic unit of reactive state. A signal is a getter/setter pair.
2. **Memos** — Derived values that cache their result and only recompute when dependencies change.
3. **Effects** — Side effects that run when their tracked dependencies change.
4. **Resources** — Async data loading with Suspense integration.
5. **Stores** — Deeply reactive objects with path-based updates.

### Reactive Graph

```
Signal A ──> Memo C ──> Effect E
                │
Signal B ───────┘─> Memo D ──> Effect F
                               └─> DOM Node
```

Dependencies are tracked at read time. When Signal A changes, Memo C and Memo D invalidate. Memo C and Memo D recompute lazily (only when read). Effect E and F re-run after recomputation.

## Signal Internals

### How Signals Work

```ts
// Simplified implementation
function createSignal<T>(initialValue: T): [() => T, (value: T | ((prev: T) => T)) => void] {
  let value = initialValue
  const observers = new Set<() => void>()

  const read = () => {
    // If there's an active tracking scope, register this signal
    if (currentTrackingScope) {
      observers.add(currentTrackingScope)
      currentTrackingScope.dependencies.add(read)
    }
    return value
  }

  const write = (nextValue: T | ((prev: T) => T)) => {
    value = typeof nextValue === 'function'
      ? (nextValue as (prev: T) => T)(value)
      : nextValue

    // Notify all observers
    for (const observer of observers) {
      observer()
    }
  }

  return [read, write]
}
```

Key behaviors:
- `read` is the getter (called as `signal()`)
- `write` is the setter (called as `setSignal(v)` or `setSignal(p => p + 1)`)
- Tracking scope: When a signal is read inside `createEffect` or `createMemo`, it registers as a dependency
- Notification: When a signal is written, all registered effects/memos are marked dirty

### Lazy Evaluation

Signals are lazy — nothing happens when a signal is created or updated until its value is read inside a tracking scope:

```tsx
const [count, setCount] = createSignal(0)
// Nothing has executed yet

// count() reads the value but does NOT create tracking scope outside effect/memo
console.log(count()) // 0 — no tracking

createEffect(() => {
  console.log(count()) // 0 — now tracking count
})

setCount(1) // Triggers the effect
```

### Root Disposal

Every reactive node belongs to a root. When the root is disposed (component unmounts), all signals, memos, and effects in that root are cleaned up:

```tsx
import { createRoot } from 'solid-js'

const dispose = createRoot((dispose) => {
  const [count, setCount] = createSignal(0)

  createEffect(() => {
    console.log(count())
  })

  return dispose
})

// Later: dispose() cleans up all reactivity in this root
```

## createMemo Deep Dive

### Eager vs Lazy Memos

```tsx
const [a, setA] = createSignal(1)
const [b, setB] = createSignal(2)

const sum = createMemo(() => {
  console.log('Computing sum')
  return a() + b()
})

// sum() has not been called yet — memo has NOT computed
console.log('Before first read')

// First read triggers computation
console.log(sum()) // "Computing sum", then 3

// Subsequent reads return cached value
console.log(sum()) // 3 (no "Computing sum" log)
```

Memos compute lazily (on first read) and cache their result. They recompute only when dependencies change and the memo is read again.

### Memo as Signal Input

```tsx
const [count, setCount] = createSignal(0)
const doubled = createMemo(() => count() * 2)

// Use memo in another memo
const description = createMemo(() => {
  if (doubled() > 10) return 'Large'
  return 'Small'
})

// Use memo in effects
createEffect(() => {
  console.log(`Description: ${description()}`)
})
```

### Untracked Reads in Memos

```tsx
import { untrack } from 'solid-js'

const [a, setA] = createSignal(1)
const [b, setB] = createSignal(2)

const sum = createMemo(() => {
  // Only tracks 'a', not 'b'
  return a() + untrack(() => b())
})
```

## createEffect Deep Dive

### Effect Scheduling

```tsx
const [count, setCount] = createSignal(0)

createEffect(() => {
  console.log(`Count: ${count()}`)
})

// Effects run synchronously after creation
// Log: "Count: 0"

setCount(1)
// Log: "Count: 1" — effect runs synchronously

// Multiple updates batch notifications
setCount(2)
setCount(3)
// The effect runs once after all updates settle (microtask)
```

### Effect Cleanup

```tsx
createEffect(() => {
  const id = setInterval(() => {
    console.log(count())
  }, 1000)

  // Return cleanup function
  onCleanup(() => {
    clearInterval(id)
  })
})
```

`onCleanup` registers a cleanup function that runs when:
- The effect re-runs (dependencies changed)
- The owning component unmounts
- The root is disposed

### Nested Effects

```tsx
createEffect(() => {
  console.log('Outer effect')

  createEffect(() => {
    console.log(`Inner effect: ${count()}`)
  })
})
```

Nested effects are disposed when the parent effect re-runs. This pattern is useful for conditional subscriptions.

## createResource Deep Dive

### Basic Resource

```tsx
const [user, { mutate, refetch }] = createResource(
  () => params.id,
  async (id) => {
    const res = await fetch(`/api/users/${id}`)
    return res.json()
  }
)

// user() returns the current value (or undefined while loading)
// user.loading — boolean
// user.error — error object
```

### Resource with Source Signal

```tsx
const [id, setId] = createSignal(1)

const [user] = createResource(id, async (id) => {
  const res = await fetch(`/api/users/${id}`)
  return res.json()
})
```

When `id` changes, the resource automatically refetches. The source signal is tracked like any other dependency.

### Resource with Refetch

```tsx
const [user, { mutate, refetch }] = createResource(fetchUser)

// Optimistic update
mutate({ name: 'Optimistic Name' })

// Force refetch
await refetch()
```

### Resource Error Handling

```tsx
const [user] = createResource(id, async (id) => {
  const res = await fetch(`/api/users/${id}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
})

return (
  <Switch>
    <Match when={user.loading}>
      <p>Loading...</p>
    </Match>
    <Match when={user.error}>
      <p>Error: {user.error.message}</p>
    </Match>
    <Match when={user()}>
      <p>User: {user().name}</p>
    </Match>
  </Switch>
)
```

## createStore Deep Dive

### Proxy-Based Reactivity

```tsx
const [state, setState] = createStore({
  user: { name: 'Alice', settings: { theme: 'dark' } },
  items: [
    { id: 1, text: 'Item 1', completed: false },
  ],
})
```

`createStore` wraps the object in a JavaScript Proxy. The Proxy intercepts:

- **Property access** (`state.user.name`) — registers dependency on that path
- **Property assignment** (`state.user.name = 'Bob'`) — triggers updates on that path
- **Array mutations** (`state.items.push(item)`) — intercepts push, pop, splice, shift, unshift, sort, reverse
- **Property deletion** (`delete state.user.name`) — triggers update

### Path Syntax

```tsx
// Direct path: 'user', 'name'
setState('user', 'name', 'Bob')

// Nested path: 'user', 'settings', 'theme'
setState('user', 'settings', 'theme', 'light')

// Array index: 'items', 0, 'completed'
setState('items', 0, 'completed', true)

// Function updater
setState('user', 'name', prev => prev.toUpperCase())
setState('items', items => [...items, { id: 2 }])

// Merge object
setState('user', { name: 'Charlie', age: 30 })
```

### Fine-Grained Store Updates

```tsx
const [state, setState] = createStore({
  users: [
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob', email: 'bob@example.com' },
  ],
})

function updateEmail(userId: number, email: string) {
  // Only updates the specific email field
  // No other users, no other fields of this user are affected
  setState('users', user => user.id === userId, 'email', email)
}
```

### Store with Derived Data

```tsx
const [state, setState] = createStore({
  items: [],
  filter: 'all' as 'all' | 'active' | 'completed',
})

// Derived — recomputes when items or filter change
const filteredItems = createMemo(() => {
  if (state.filter === 'all') return state.items
  const done = state.filter === 'completed'
  return state.items.filter(item => item.completed === done)
})

const stats = createMemo(() => ({
  total: state.items.length,
  completed: state.items.filter(i => i.completed).length,
  active: state.items.filter(i => !i.completed).length,
}))
```

## Batching

### Purpose

Batching prevents unnecessary intermediate notifications when multiple signals update together:

```tsx
import { batch } from 'solid-js'

const [a, setA] = createSignal(0)
const [b, setB] = createSignal(0)

createEffect(() => {
  console.log(`a=${a()}, b=${b()}`)
})

// Without batching — effect runs twice
setA(1) // Effect runs: "a=1, b=0"
setB(1) // Effect runs: "a=1, b=1"

// With batching — effect runs once
batch(() => {
  setA(2)
  setB(2)
})
// Effect runs: "a=2, b=2"
```

### Automatic Batching in Solid 2.0+

SolidJS 2.0 batches updates within setTimeout, requestAnimationFrame, and event handlers automatically. Manual `batch()` is only needed in synchronous code outside these contexts.

## createRenderEffect

### Timing Difference

```tsx
import { createRenderEffect, createEffect, createSignal } from 'solid-js'

const [count, setCount] = createSignal(0)

createRenderEffect(() => {
  console.log(`Render effect: ${count()}`)
  // Runs synchronously before DOM update
})

createEffect(() => {
  console.log(`Effect: ${count()}`)
  // Runs after DOM update
})

setCount(1)
// Log order:
// 1. "Render effect: 1" (before DOM paint)
// 2. DOM updates
// 3. "Effect: 1" (after DOM paint)
```

Use `createRenderEffect` for:
- Reading DOM layout before paint
- Synchronizing non-Solid state with DOM
- Performance-critical measurements

## on and onCleanup

### on — Explicit Dependencies

```tsx
import { on } from 'solid-js'

const [a, setA] = createSignal(0)
const [b, setB] = createSignal(0)

// Track only 'a', not 'b'
createEffect(on(a, (current, previous) => {
  console.log(`a changed from ${previous} to ${current}`)
}))

// Track multiple explicit deps
createEffect(on(
  () => [a(), b()],
  ([newA, newB], [oldA, oldB]) => {
    console.log(`a: ${oldA} -> ${newA}, b: ${oldB} -> ${newB}`)
  }
))

// Defer first run (don't execute on creation)
createEffect(on(a, () => {
  console.log('a changed')
}, { defer: true }))
```

### onCleanup

```tsx
import { onCleanup } from 'solid-js'

function Component(props) {
  const timer = setInterval(() => {}, 1000)

  onCleanup(() => {
    clearInterval(timer)
  })
}
```

`onCleanup` can be called multiple times. Cleanup functions run in reverse registration order (LIFO).

## Error Handling in Reactivity

### Error Boundaries

```tsx
import { ErrorBoundary } from 'solid-js'

function App() {
  return (
    <ErrorBoundary fallback={(err, reset) => (
      <div>
        <p>Error: {err.message}</p>
        <button onclick={reset}>Retry</button>
      </div>
    )}>
      <ComponentThatMightError />
    </ErrorBoundary>
  )
}
```

### onError

```tsx
import { onError } from 'solid-js'

createEffect(() => {
  onError((err) => {
    console.error('Caught in effect:', err)
  })

  // This error is caught by onError
  throw new Error('Something went wrong')
})
```

## Reactive Utilities

### untrack

```tsx
import { untrack } from 'solid-js'

const [a, setA] = createSignal(0)
const [b, setB] = createSignal(0)

createEffect(() => {
  console.log(a())        // Tracks 'a'
  console.log(untrack(b)) // Reads 'b' without tracking
})
```

### getOwner and runWithOwner

```tsx
import { getOwner, runWithOwner } from 'solid-js'

const owner = getOwner()

// Later, outside reactive context
runWithOwner(owner, () => {
  const [signal] = createSignal(0)
  // Signal is associated with 'owner's root
})
```

## Reactivity Comparison

| Library | Tracking | Granularity | Lazy | Proxy-Based |
|---------|----------|-------------|------|-------------|
| SolidJS | Automatic | Signal-level | Yes (memos) | No (signals), Yes (stores) |
| Svelte 5 | Automatic | Variable-level | Yes (derived) | Yes ($state) |
| Vue 3 | Automatic | Component-level | Yes (computed) | Yes (reactive) |
| Preact Signals | Automatic | Signal-level | Yes | No |
| React | Manual (deps array) | Component-level | No | No |
| Angular Signals | Automatic | Signal-level | Yes (computed) | No |
| MobX | Automatic | Observable-level | Yes (computed) | Yes |

## Performance Characteristics

| Operation | Cost | Notes |
|-----------|------|-------|
| createSignal | ~200 bytes + closure | One-time allocation |
| signal read | <1 microsecond | Direct function call |
| signal write + notify | 1-5 microseconds | Depends on observer count |
| createMemo | ~300 bytes | Allocates caching structure |
| createEffect | ~300 bytes + first run | Side effect setup |
| createStore | Proxy overhead per property | ~500 bytes + Proxy per object |
| batch() | Negligible | Disables intermediate notifications |

## Summary

| API | Purpose | Tracking | Lazy |
|-----|---------|----------|------|
| createSignal | Local state | Manual read | No |
| createMemo | Derived state | Automatic | Yes (on read) |
| createEffect | Side effects | Automatic | No (runs immediately) |
| createResource | Async data | Automatic (source) | Yes |
| createStore | Deep state | Automatic (path) | No |
| batch | Group updates | — | — |
| untrack | Read without tracking | No | — |
| on | Explicit deps | Explicit | Yes (defer option) |
| onCleanup | Effect cleanup | — | — |
