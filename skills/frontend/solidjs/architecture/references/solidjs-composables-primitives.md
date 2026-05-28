# SolidJS Composables and Primitives

## Introduction

SolidJS primitives are the building blocks of reactive logic. Unlike React hooks (which re-run on every render), SolidJS primitives run once and establish permanent reactive connections. This makes them more composable and predictable. This guide covers the full spectrum of built-in primitives, custom primitive patterns, and reusable composable strategies.

## Built-in Primitives Catalog

### State Primitives

| Primitive | Purpose | Returns |
|-----------|---------|---------|
| createSignal | Local reactive state | [getter, setter] |
| createStore | Deep reactive object | [state, setState] |
| createMutable | Mutable store | proxy |
| createResource | Async data | [resource, { mutate, refetch }] |

### Derived Primitives

| Primitive | Purpose | Returns |
|-----------|---------|---------|
| createMemo | Cached derived value | getter |
| createComputed | Synchronous derived | void (runs immediately) |

### Side Effect Primitives

| Primitive | Purpose | Timing |
|-----------|---------|--------|
| createEffect | Side effects | After DOM update |
| createRenderEffect | Pre-DOM effects | Before DOM update |
| on | Explicit dependency effect | Configurable |
| onMount | Mount callback | After first render |
| onCleanup | Cleanup callback | On dispose |
| onError | Error handler | On error in scope |

### Context and Ref Primitives

| Primitive | Purpose |
|-----------|---------|
| createContext | Context definition |
| useContext | Context consumption |
| createUniqueId | Unique ID generation |

## Custom Primitive Patterns

### Pattern 1: Composing Signals

```tsx
function createCounter(initialValue = 0) {
  const [count, setCount] = createSignal(initialValue)

  return {
    count,
    increment: () => setCount(c => c + 1),
    decrement: () => setCount(c => c - 1),
    reset: () => setCount(initialValue),
    set: setCount,
  }
}

// Usage
function Counter() {
  const { count, increment, decrement } = createCounter(10)

  return (
    <div>
      <button onClick={decrement}>-</button>
      <span>{count()}</span>
      <button onClick={increment}>+</button>
    </div>
  )
}
```

### Pattern 2: Toggle Primitive

```tsx
function createToggle(initialValue = false) {
  const [value, setValue] = createSignal(initialValue)

  return {
    get value() { return value() },
    get isActive() { return value() },
    toggle: () => setValue(v => !v),
    on: () => setValue(true),
    off: () => setValue(false),
    set: setValue,
  }
}

// Usage
function Modal() {
  const modal = createToggle()

  return (
    <div>
      <button onClick={modal.on}>Open Modal</button>
      {modal.isActive && <div class="modal">Content</div>}
    </div>
  )
}
```

### Pattern 3: Debounced Input

```tsx
function createDebounced(source: () => any, delay = 300) {
  const [debounced, setDebounced] = createSignal(source())

  createEffect(() => {
    const value = source()
    const timeout = setTimeout(() => setDebounced(value), delay)
    onCleanup(() => clearTimeout(timeout))
  })

  return debounced
}

// Usage
function Search() {
  const [query, setQuery] = createSignal('')
  const debouncedQuery = createDebounced(query, 300)

  createEffect(() => {
    if (debouncedQuery()) {
      fetch(`/api/search?q=${debouncedQuery()}`)
    }
  })

  return <input onInput={(e) => setQuery(e.currentTarget.value)} />
}
```

### Pattern 4: Local Storage Persistence

```tsx
function createLocalStorage<T>(key: string, initialValue: T) {
  const stored = localStorage.getItem(key)
  const [value, setValue] = createSignal<T>(
    stored ? JSON.parse(stored) : initialValue
  )

  // Sync to localStorage on change
  createEffect(() => {
    localStorage.setItem(key, JSON.stringify(value()))
  })

  return [value, setValue] as const
}

// Usage
function Settings() {
  const [theme, setTheme] = createLocalStorage('theme', 'light')

  return (
    <select value={theme()} onChange={(e) => setTheme(e.currentTarget.value)}>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  )
}
```

### Pattern 5: Media Query

```tsx
function createMediaQuery(query: string) {
  const [matches, setMatches] = createSignal(false)

  onMount(() => {
    const mql = window.matchMedia(query)
    setMatches(mql.matches)

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    mql.addEventListener('change', handler)
    onCleanup(() => mql.removeEventListener('change', handler))
  })

  return matches
}

// Usage
function ResponsiveComponent() {
  const isDesktop = createMediaQuery('(min-width: 1024px)')

  return (
    <div>
      {isDesktop() ? <DesktopLayout /> : <MobileLayout />}
    </div>
  )
}
```

### Pattern 6: Interval Timer

```tsx
function createInterval(fn: () => void, delay: () => number) {
  createEffect(() => {
    const d = delay()
    if (d <= 0) return

    const id = setInterval(fn, d)
    onCleanup(() => clearInterval(id))
  })
}

// Usage
function Timer() {
  const [count, setCount] = createSignal(0)
  const [speed, setSpeed] = createSignal(1000)

  createInterval(
    () => setCount(c => c + 1),
    speed
  )

  return (
    <div>
      <p>Count: {count()}</p>
      <button onClick={() => setSpeed(500)}>Faster</button>
    </div>
  )
}
```

### Pattern 7: Undo/Redo History

```tsx
function createHistory<T>(initialValue: T) {
  const [present, setPresent] = createSignal(initialValue)
  const past: T[] = []
  const future: T[] = []

  return {
    get value() { return present() },
    set value(v: T) {
      past.push(present())
      future.length = 0
      setPresent(v)
    },
    undo: () => {
      if (past.length === 0) return
      future.push(present())
      setPresent(past.pop()!)
    },
    redo: () => {
      if (future.length === 0) return
      past.push(present())
      setPresent(future.pop()!)
    },
    get canUndo() { return past.length > 0 },
    get canRedo() { return future.length > 0 },
    reset: () => {
      past.length = 0
      future.length = 0
      setPresent(initialValue)
    },
  }
}
```

### Pattern 8: Async Action with Loading State

```tsx
function createAsyncAction<T, Args extends any[]>(
  fn: (...args: Args) => Promise<T>
) {
  const [pending, setPending] = createSignal(false)
  const [error, setError] = createSignal<Error | null>(null)

  const execute = async (...args: Args): Promise<T | null> => {
    setPending(true)
    setError(null)
    try {
      const result = await fn(...args)
      return result
    } catch (err) {
      setError(err as Error)
      return null
    } finally {
      setPending(false)
    }
  }

  return { execute, pending, error }
}

// Usage
function UserForm() {
  const saveUser = createAsyncAction(async (data: UserData) => {
    const res = await fetch('/api/users', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Failed to save')
    return res.json()
  })

  return (
    <div>
      <button
        onClick={() => saveUser.execute({ name: 'Alice' })}
        disabled={saveUser.pending()}
      >
        {saveUser.pending() ? 'Saving...' : 'Save'}
      </button>
      {saveUser.error() && <p>Error: {saveUser.error().message}</p>}
    </div>
  )
}
```

### Pattern 9: Form State Management

```tsx
function createFormState<T extends Record<string, any>>(initialValues: T) {
  const [values, setValues] = createStore<T>(initialValues)
  const [errors, setErrors] = createStore<Partial<Record<keyof T, string>>>({})
  const [touched, setTouched] = createStore<Partial<Record<keyof T, boolean>>>({})
  const [submitting, setSubmitting] = createSignal(false)

  const isDirty = createMemo(() => {
    return Object.keys(initialValues).some(
      key => values[key as keyof T] !== initialValues[key as keyof T]
    )
  })

  const isValid = createMemo(() => {
    return Object.keys(errors).length === 0
  })

  const setFieldValue = (field: keyof T, value: any) => {
    setValues(field as any, value)
  }

  const setFieldError = (field: keyof T, error: string) => {
    setErrors(field as any, error)
  }

  const setFieldTouched = (field: keyof T) => {
    setTouched(field as any, true)
  }

  const reset = () => {
    setValues(initialValues)
    setErrors({})
    setTouched({})
  }

  return {
    values,
    errors,
    touched,
    submitting,
    isDirty,
    isValid,
    setFieldValue,
    setFieldError,
    setFieldTouched,
    reset,
  }
}
```

### Pattern 10: WebSocket Connection

```tsx
function createWebSocket(url: () => string) {
  const [connected, setConnected] = createSignal(false)
  const [lastMessage, setLastMessage] = createSignal<any>(null)
  let ws: WebSocket | null = null

  const connect = () => {
    ws = new WebSocket(url())

    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      setLastMessage(data)
    }
    ws.onerror = (err) => console.error('WebSocket error', err)
  }

  const disconnect = () => {
    ws?.close()
    ws = null
  }

  const send = (data: any) => {
    ws?.send(JSON.stringify(data))
  }

  createEffect(() => {
    url() // Track URL changes
    connect()
    onCleanup(() => disconnect())
  })

  return { connected, lastMessage, send, connect, disconnect }
}
```

## Composable Patterns

### Hierarchical Composition

Primitives can compose into higher-level abstractions:

```tsx
function createUserSession() {
  const [session, setSession] = createSignal<Session | null>(null)
  const [loading, setLoading] = createSignal(true)

  const auth = createAsyncAction(async (credentials: Credentials) => {
    const session = await login(credentials)
    setSession(session)
    return session
  })

  const logout = createAsyncAction(async () => {
    await api.logout()
    setSession(null)
  })

  return {
    session,
    loading,
    login: auth.execute,
    logout: logout.execute,
    isAuthenticated: () => session() !== null,
    user: () => session()?.user,
  }
}
```

### Context-Based Composition

```tsx
const AuthContext = createContext<ReturnType<typeof createUserSession>>()

function AuthProvider(props: { children: JSX.Element }) {
  const session = createUserSession()

  return (
    <AuthContext.Provider value={session}>
      {props.children}
    </AuthContext.Provider>
  )
}

function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
```

## Primitive Lifecycle

### Component Mount

1. Component function executes
2. All createSignal/createStore calls initialize
3. All createMemo calls register (but don't compute yet)
4. All createEffect calls register and run immediately
5. DOM is created and inserted
6. onMount callbacks fire

### Component Update

1. A signal changes
2. Dirty memos are marked
3. When memos are read, they recompute
4. Dirty effects are queued
5. Effects run synchronously (or batched)
6. DOM updates automatically

### Component Unmount

1. onCleanup callbacks fire (reverse registration order)
2. Effect cleanup functions run
3. All reactive nodes in the root are disposed
4. DOM is removed

## Testing Primitives

```tsx
import { createRoot } from 'solid-js'
import { describe, it, expect } from 'vitest'

describe('createCounter', () => {
  it('should increment and decrement', () => {
    createRoot(() => {
      const counter = createCounter(5)

      expect(counter.count()).toBe(5)

      counter.increment()
      expect(counter.count()).toBe(6)

      counter.decrement()
      expect(counter.count()).toBe(5)

      counter.reset()
      expect(counter.count()).toBe(5)
    })
  })
})
```

Always wrap primitive tests in `createRoot` to create a proper disposal scope.

## Primitive Best Practices

### Do

- Return getters (functions) for reactive values
- Accept signals or getters as parameters for composability
- Clean up all subscriptions with onCleanup
- Use createRoot for test isolation
- Keep primitives focused on one concern

### Don't

- Store DOM references inside primitives (pass them as params)
- Create side effects outside createEffect/createRenderEffect
- Mix JSX with primitive logic
- Create circular reactive dependencies
- Forget to handle error states

## Summary

| Pattern | Use Case | Dependencies |
|---------|----------|--------------|
| createCounter | Counter state | Built-in |
| createToggle | Boolean toggle | Built-in |
| createDebounced | Input delay | Built-in |
| createLocalStorage | Persistence | Built-in + localStorage |
| createMediaQuery | Responsive design | window.matchMedia |
| createInterval | Periodic execution | setInterval |
| createHistory | Undo/redo | Array storage |
| createAsyncAction | Loading/error states | Built-in |
| createFormState | Form management | createStore |
| createWebSocket | Real-time comms | WebSocket API |
