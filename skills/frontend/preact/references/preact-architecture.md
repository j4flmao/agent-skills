# Preact Architecture Patterns

## Component Architecture

### Functional Components with Hooks

```typescript
// components/UserList.tsx
export function UserList({ users, onSelect }: UserListProps) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<'name' | 'email'>('name')

  const filtered = useMemo(() => {
    const filtered = users.filter(u =>
      u.name.toLowerCase().includes(search.toLowerCase())
    )
    return [...filtered].sort((a, b) => a[sortKey].localeCompare(b[sortKey]))
  }, [users, search, sortKey])

  return (
    <div>
      <input value={search} onInput={e => setSearch(e.currentTarget.value)} />
      <For each={filtered}>
        {user => <UserCard user={user} onSelect={() => onSelect(user.id)} />}
      </For>
    </div>
  )
}
```

### Custom Hooks

```typescript
// hooks/useDebounce.ts
export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}

// hooks/useMediaQuery.ts
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(query)
    setMatches(mq.matches)
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [query])

  return matches
}
```

## State Architecture

### Signal Store Pattern

```typescript
// stores/cart.store.ts
import { signal, computed } from '@preact/signals'

export interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
}

const items = signal<CartItem[]>([])
const coupon = signal<string | null>(null)

export const cartStore = {
  items,
  coupon,
  count: computed(() => items.value.reduce((s, i) => s + i.quantity, 0)),
  subtotal: computed(() => items.value.reduce((s, i) => s + i.price * i.quantity, 0)),
  discount: computed(() => coupon.value ? cartStore.subtotal.value * 0.1 : 0),
  total: computed(() => cartStore.subtotal.value - cartStore.discount.value),

  addItem(product: Product, qty = 1) {
    const existing = items.value.find(i => i.id === product.id)
    if (existing) {
      existing.quantity += qty
      items.value = [...items.value]
    } else {
      items.value = [...items.value, { ...product, quantity: qty }]
    }
  },

  removeItem(id: string) {
    items.value = items.value.filter(i => i.id !== id)
  },

  async checkout() {
    const order = { items: items.value, coupon: coupon.value }
    const result = await api.createOrder(order)
    if (result.ok) items.value = []
    return result
  },
}
```

## Routing Architecture

```tsx
// App.tsx
import { Router, Route } from 'preact-router'
import { lazy } from 'preact/compat'

const Home = lazy(() => import('./routes/Home'))
const Products = lazy(() => import('./routes/Products'))

export function App() {
  return (
    <div id="app">
      <Header />
      <Suspense fallback={<Loading />}>
        <Router>
          <Route path="/" component={Home} />
          <Route path="/products" component={Products} />
          <Route path="/products/:id" component={lazy(() => import('./routes/ProductDetail'))} />
          <Route path="/cart" component={lazy(() => import('./routes/Cart'))} />
          <Route default component={NotFound} />
        </Router>
      </Suspense>
    </div>
  )
}
```

## Data Fetching Architecture

```typescript
// hooks/useFetch.ts
export function useFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    fetch(url)
      .then(r => r.json())
      .then(d => { if (!cancelled) setData(d) })
      .catch(e => { if (!cancelled) setError(e) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [url])

  return { data, error, loading }
}
```

## Testing Architecture

```tsx
import { render, screen } from '@testing-library/preact'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'

describe('UserForm', () => {
  it('submits form data', async () => {
    const onSubmit = vi.fn()
    render(<UserForm onSubmit={onSubmit} />)

    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com')
    await userEvent.click(screen.getByRole('button', { name: /submit/i }))

    expect(onSubmit).toHaveBeenCalledWith({ email: 'test@example.com' })
  })
})
```

## Performance Architecture

| Pattern | Technique | Impact |
|---------|-----------|--------|
| Code splitting | lazy() + Suspense | -50% initial bundle |
| Signal over state | @preact/signals | Skip virtual DOM diffing |
| useMemo | Memoize heavy computations | Reduce re-renders |
| useCallback | Stable function references | Optimize child re-renders |
| Virtual list | Only render visible items | Smooth 10k+ lists |
