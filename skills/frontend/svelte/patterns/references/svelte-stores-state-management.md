# Svelte Stores and State Management

## Introduction

Svelte 5 introduces runes ($state, $derived, $effect) as the primary reactivity model. However, stores (writable, readable, derived) remain available for backward compatibility and specific use cases. This guide covers both approaches — the modern runes-based state management and the legacy store pattern — with migration strategies and performance considerations.

## The Two Eras of Svelte State Management

### Svelte 4: Stores

```svelte
<script>
  import { writable, derived } from 'svelte/store'

  // Create a store
  const count = writable(0)

  // Derived store
  const doubled = derived(count, $count => $count * 2)
</script>

<!-- Auto-subscribe with $ prefix -->
<p>Count: {$count}</p>
<p>Doubled: {$doubled}</p>
<button on:click={() => count.update(n => n + 1)}>+1</button>
```

### Svelte 5: Runes

```svelte
<script>
  let count = $state(0)
  let doubled = $derived(count * 2)
</script>

<p>Count: {count}</p>
<p>Doubled: {doubled}</p>
<button onclick={() => count++}>+1</button>
```

### When to Use Each

| Use Case | Stores | Runes |
|----------|--------|-------|
| Component-local state | No | Yes (preferred) |
| Shared state across components | Yes (legacy) | $state in .svelte.js |
| Svelte 5 new projects | No | Yes (preferred) |
| Existing Svelte 4 codebase | Yes | No (migrate later) |
| Integration with external libs | Yes (subscribe API) | toStore/toValue helpers |
| SSR data (SvelteKit) | No | SvelteKit load functions |

## Runes-Based State Management

### Local State ($state)

```svelte
<script>
  let count = $state(0)
  let user = $state({ name: 'Alice', email: 'alice@example.com' })
  let items = $state<string[]>([])
  let nested = $state({ a: { b: { c: 'deep' } } })
</script>

<button onclick={() => count++}>{count}</button>
<input bind:value={user.name} />
```

### Shared State (.svelte.js Module)

```ts
// store.svelte.ts
class AppStore {
  theme = $state<'light' | 'dark'>('light')
  user = $state<{ id: string; name: string } | null>(null)
  notifications = $state<Notification[]>([])

  toggleTheme() {
    this.theme = this.theme === 'light' ? 'dark' : 'light'
  }

  login(user: { id: string; name: string }) {
    this.user = user
  }

  logout() {
    this.user = null
  }

  addNotification(n: Notification) {
    this.notifications = [...this.notifications, n]
  }

  get unreadCount() {
    return this.notifications.filter(n => !n.read).length
  }
}

export const store = new AppStore()
```

```svelte
<script>
  import { store } from './store.svelte.js'
</script>

<button onclick={() => store.toggleTheme()}>
  Theme: {store.theme}
</button>

{#each store.notifications as notification}
  <p>{notification.message}</p>
{/each}
```

### Context-Based Scoped State

```svelte
<script>
  // provider.svelte
  import { setContext } from 'svelte'

  const KEY = Symbol('counter')
  let count = $state(0)

  setContext(KEY, {
    get count() { return count },
    increment: () => count++,
    decrement: () => count--,
    reset: () => count = 0,
  })
</script>

<slot />
```

```svelte
<script>
  // consumer.svelte
  import { getContext } from 'svelte'

  const KEY = Symbol('counter')
  const counter = getContext<ReturnType<typeof createCounter>>(KEY)
</script>

<p>Count: {counter.count}</p>
<button onclick={counter.increment}>+</button>
```

## Store API Reference

### writable

```typescript
import { writable } from 'svelte/store'

// Creation
const count = writable(0)
const user = writable<User | null>(null, () => {
  // Optional start function — called when first subscriber appears
  console.log('First subscriber')

  return () => {
    // Optional stop function — called when last subscriber leaves
    console.log('No more subscribers')
  }
})

// Methods
count.set(5)                    // Set value
count.update(n => n + 1)        // Update with function
count.subscribe(value => {})    // Subscribe (returns unsubscribe function)
```

### readable

```typescript
import { readable } from 'svelte/store'

// Read-only store with a start function
const time = readable(new Date(), (set) => {
  const interval = setInterval(() => {
    set(new Date())
  }, 1000)

  return () => clearInterval(interval)
})

// Simple readable (no start function)
const version = readable('1.0.0')
```

### derived

```typescript
import { derived } from 'svelte/store'

const count = writable(0)

// Simple derived
const doubled = derived(count, $count => $count * 2)

// Derived with multiple stores
const firstName = writable('John')
const lastName = writable('Doe')
const fullName = derived(
  [firstName, lastName],
  ([$first, $last]) => `${$first} ${$last}`
)

// Derived with set
const asyncValue = derived(count, ($count, set) => {
  const timer = setTimeout(() => {
    set($count * 2)
  }, 1000)

  return () => clearTimeout(timer)
})
```

### Custom Store

```typescript
import { writable } from 'svelte/store'

function createCounter(initial = 0) {
  const { subscribe, set, update } = writable(initial)

  return {
    subscribe,
    increment: () => update(n => n + 1),
    decrement: () => update(n => n - 1),
    reset: () => set(initial),
  }
}

export const counter = createCounter()
```

## Store Patterns

### Pattern 1: Persistent Store

```typescript
// persistent-store.ts
import { writable } from 'svelte/store'

export function persistentStore<T>(key: string, initial: T) {
  const stored = typeof localStorage !== 'undefined'
    ? localStorage.getItem(key)
    : null

  const store = writable<T>(stored ? JSON.parse(stored) : initial)

  store.subscribe(value => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(value))
    }
  })

  return store
}

// Usage
export const theme = persistentStore('theme', 'light')
export const user = persistentStore('user', null)
```

### Pattern 2: Toggle Store

```typescript
// toggle-store.ts
import { writable, derived } from 'svelte/store'

export function createToggle(initial = false) {
  const { subscribe, set, update } = writable(initial)

  return {
    subscribe,
    toggle: () => update(v => !v),
    on: () => set(true),
    off: () => set(false),
    set,
  }
}

export const sidebar = createToggle()
```

### Pattern 3: Undoable Store

```typescript
// undoable-store.ts
import { writable, derived } from 'svelte/store'

export function undoableStore<T>(initial: T) {
  const past: T[] = []
  const future: T[] = []
  const { subscribe, set } = writable(initial)

  return {
    subscribe,
    set: (value: T) => {
      past.push(initial)
      future.length = 0
      set(value)
    },
    undo: () => {
      if (past.length === 0) return
      future.push(initial)
      set(past.pop()!)
    },
    redo: () => {
      if (future.length === 0) return
      past.push(initial)
      set(future.pop()!)
    },
  }
}
```

### Pattern 4: Async Store

```typescript
// async-store.ts
import { writable, derived } from 'svelte/store'

type AsyncState<T> = {
  loading: boolean
  data: T | null
  error: string | null
}

export function asyncStore<T>() {
  const { subscribe, set, update } = writable<AsyncState<T>>({
    loading: false,
    data: null,
    error: null,
  })

  return {
    subscribe,
    load: async (fetcher: () => Promise<T>) => {
      update(state => ({ ...state, loading: true, error: null }))
      try {
        const data = await fetcher()
        update(state => ({ ...state, data, loading: false }))
        return data
      } catch (err) {
        update(state => ({
          ...state,
          error: err instanceof Error ? err.message : 'Unknown error',
          loading: false,
        }))
        return null
      }
    },
    set: (data: T) => set({ loading: false, data, error: null }),
    reset: () => set({ loading: false, data: null, error: null }),
  }
}

// Usage
export const userStore = asyncStore<User>()
```

### Pattern 5: Derived State from Stores

```typescript
// cart-store.ts
import { writable, derived } from 'svelte/store'

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
}

export const cart = writable<CartItem[]>([])

export const totalItems = derived(cart, $cart =>
  $cart.reduce((sum, item) => sum + item.quantity, 0)
)

export const subtotal = derived(cart, $cart =>
  $cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
)

export const tax = derived(subtotal, $subtotal => $subtotal * 0.08)

export const total = derived([subtotal, tax], ([$subtotal, $tax]) =>
  $subtotal + $tax
)

export const formattedTotal = derived(total, $total =>
  `$${$total.toFixed(2)}`
)
```

## Store Composition

### Combining Multiple Stores

```typescript
// composed-store.ts
import { derived } from 'svelte/store'
import { user } from './user-store'
import { notifications } from './notification-store'
import { settings } from './settings-store'

export const appState = derived(
  [user, notifications, settings],
  ([$user, $notifications, $settings]) => ({
    user: $user,
    unreadCount: $notifications.filter(n => !n.read).length,
    theme: $settings.theme,
    isAuthenticated: $user !== null,
  })
)
```

### Store Subscriptions

```svelte
<script>
  import { onDestroy } from 'svelte'
  import { count } from './stores'

  // Manual subscription
  const unsubscribe = count.subscribe(value => {
    console.log('Count changed:', value)
  })

  onDestroy(unsubscribe)

  // Auto-subscription with $ prefix (in template)
  // {$count}
</script>
```

## Migration: Stores to Runes

### Step 1: Component-Level State

```svelte
<!-- Before (Svelte 4 store) -->
<script>
  import { count } from './stores'
</script>

<button on:click={() => count.update(n => n + 1)}>
  {$count}
</button>

<!-- After (Svelte 5 runes) -->
<script>
  let count = $state(0)
</script>

<button onclick={() => count++}>
  {count}
</button>
```

### Step 2: Shared State

```ts
// Before: stores/counter.ts
import { writable, derived } from 'svelte/store'
export const count = writable(0)
export const doubled = derived(count, $c => $c * 2)

// After: counter.svelte.ts
export class CounterStore {
  value = $state(0)
  doubled = $derived(this.value * 2)
  increment() { this.value++ }
  decrement() { this.value-- }
}
export const counter = new CounterStore()
```

### Step 3: Derived State

```svelte
<!-- Before: $: derived (Svelte 4) -->
<script>
  export let items = []
  $: total = items.reduce((s, i) => s + i.price, 0)
</script>

<!-- After: $derived (Svelte 5) -->
<script>
  let { items } = $props()
  let total = $derived(items.reduce((s, i) => s + i.price, 0))
</script>
```

## Performance Considerations

### Store Subscription Cost

| Aspect | Svelte 4 Store | Svelte 5 Rune |
|--------|---------------|---------------|
| Memory per subscription | ~200 bytes | 0 (compiled away) |
| Subscription setup | Microtask | Compile-time |
| Value notification | Synchronous | Synchronous |
| Cleanup | Manual (unsubscribe) | Automatic (component destroy) |

### When Stores Are Still Useful

- **Third-party integrations**: Libraries expecting observable contract
- **External state sync**: When state needs to be updated from non-Svelte code
- **Complex derived chains**: Derived stores with multiple dependencies
- **Readable stores**: For values that shouldn't be directly settable

## Testing State

### Testing Runes

```svelte
<!-- Counter.svelte -->
<script>
  let count = $state(0)
  let doubled = $derived(count * 2)
</script>

<p>{count} x 2 = {doubled}</p>
<button onclick={() => count++}>+1</button>
```

```ts
import { render, screen } from '@testing-library/svelte'
import { expect, test } from 'vitest'
import Counter from './Counter.svelte'

test('increments count', async () => {
  render(Counter)
  const button = screen.getByText('+1')
  await user.click(button)
  expect(screen.getByText('1 x 2 = 2')).toBeDefined()
})
```

### Testing Stores

```ts
import { get } from 'svelte/store'
import { counter } from './stores'

test('counter increments', () => {
  counter.set(0)
  counter.update(n => n + 1)
  expect(get(counter)).toBe(1)
})
```

## Summary

| Concept | Svelte 4 (Store) | Svelte 5 (Rune) |
|---------|------------------|-----------------|
| Local variable | `writable(0)` | `$state(0)` |
| Assignment | `count.set(5)` | `count = 5` |
| Mutation | `count.update(n => n + 1)` | `count++` |
| Derived | `derived(a, $a => $a * 2)` | `$derived(a * 2)` |
| Read in template | `{$count}` | `{count}` |
| Read in script | `get(count)` | `count` |
| Shared state | Module-level store | `$state` class in .svelte.js |
| Context | `setContext`/`getContext` | Same |
