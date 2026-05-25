# SolidJS Reactivity Patterns

## Signals — Fine-Grained Reactivity

```tsx
import { createSignal, createMemo, createEffect, createResource } from 'solid-js'

function Counter() {
  const [count, setCount] = createSignal(0)
  const doubled = createMemo(() => count() * 2)

  createEffect(() => {
    console.log(`Count: ${count()}, Double: ${doubled()}`)
  })

  return <button onClick={() => setCount(c => c + 1)}>{count()}</button>
}
```

**Key insight**: Signals are functions. `count()` reads, `setCount()` writes. Nothing re-runs until a signal is read inside a tracking scope.

| API | Purpose | When it runs |
|-----|---------|-------------|
| `createSignal` | Writable state | On read inside tracking |
| `createMemo` | Derived/Computed | When dependencies change |
| `createEffect` | Side effects | After DOM updates |
| `createResource` | Async data | When source signal changes |
| `createStore` | Deep reactive state | On path update |
| `createMutable` | Mutable state | On direct mutation |

## createStore — Deep Reactivity

```tsx
const [state, setState] = createStore({
  user: { name: 'Alice', address: { city: 'NYC' } },
  orders: [],
  filters: { search: '', sort: 'date' },
})

// Targeted path updates
setState('user', 'name', 'Bob')
setState('filters', 'search', 'query')
setState('orders', orders => [...orders, newOrder])

// Batch updates
setState({
  ...state,
  filters: { search: '', sort: 'name' },
})
```

## createResource — Data Fetching

```tsx
function UserProfile(props: { userId: () => string }) {
  const [user] = createResource(props.userId, async (id) => {
    const res = await fetch(`/api/users/${id}`)
    if (!res.ok) throw new Error('Failed to load')
    return res.json()
  })

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div>{user()?.name}</div>
    </Suspense>
  )
}
```

## createEffect Guidelines

```tsx
// ✅ Correct: Side effects
createEffect(() => {
  localStorage.setItem('theme', theme())
})

// ❌ Wrong: Computing derived values
const doubled = createMemo(() => count() * 2)

// ❌ Wrong: Data fetching
createEffect(() => {
  fetch(`/api/users/${id()}`).then(r => r.json()).then(setUser)
})
// ✅ Correct: Use createResource instead
```

## Batching

```tsx
import { batch } from 'solid-js'

function handleSubmit(values: FormValues) {
  batch(() => {
    setErrors({})
    setSubmitting(true)
    setData(values)
  })
  // Only one update notification
}
```

## Component Lifecycle

Components run once. JSX expressions re-execute individually:

```tsx
function Timer() {
  const [elapsed, setElapsed] = createSignal(0)

  // onMount equivalent
  createEffect(() => {
    const timer = setInterval(() => setElapsed(t => t + 1), 1000)
    // onCleanup
    onCleanup(() => clearInterval(timer))
  })

  return <div>{elapsed()} seconds</div>
}
```

## Context API

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
  const { theme, toggle } = useContext(ThemeContext)!
  return <button onClick={toggle}>Current: {theme()}</button>
}
```
