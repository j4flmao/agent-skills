# State Testing Patterns

## Testing Stores

### Zustand

```typescript
import { useCounterStore } from './counter'

describe('CounterStore', () => {
  beforeEach(() => {
    useCounterStore.setState({ count: 0 })
  })

  it('should increment count', () => {
    const { increment } = useCounterStore.getState()
    increment()
    expect(useCounterStore.getState().count).toBe(1)
  })

  it('should reset to initial value', () => {
    useCounterStore.setState({ count: 5 })
    const { reset } = useCounterStore.getState()
    reset()
    expect(useCounterStore.getState().count).toBe(0)
  })
})
```

### Pinia

```typescript
import { setActivePinia, createPinia } from 'pinia'
import { useCounterStore } from './counter'

describe('CounterStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('increments count', () => {
    const store = useCounterStore()
    store.increment()
    expect(store.count).toBe(1)
  })
})
```

### NgRx Signal Store

```typescript
import { TestBed } from '@angular/core/testing'
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals'

describe('UserStore', () => {
  const Store = signalStore(
    withState({ users: [] as User[], loading: false }),
    withMethods((store) => ({
      addUser(user: User) { patchState(store, { users: [...store.users(), user] }) },
    }))
  )

  it('should add user', () => {
    const store = new Store()
    store.addUser({ id: '1', name: 'Alice' })
    expect(store.users().length).toBe(1)
  })
})
```

## Testing Server State (TanStack Query)

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

it('should fetch and display users', async () => {
  render(<UserList />, { wrapper: createWrapper() })
  expect(await screen.findByText('Alice')).toBeInTheDocument()
})
```

## Testing Async Store Operations

```typescript
import { useUserStore } from './users'

describe('UserStore async actions', () => {
  beforeEach(() => {
    useUserStore.setState({ users: [], loading: false, error: null })
  })

  it('should fetch users successfully', async () => {
    const store = useUserStore.getState()
    await store.fetchUsers()
    const { users, loading, error } = useUserStore.getState()
    expect(users.length).toBeGreaterThan(0)
    expect(loading).toBe(false)
    expect(error).toBeNull()
  })

  it('should handle fetch error', async () => {
    // Mock API failure
    vi.spyOn(api, 'getUsers').mockRejectedValue(new Error('Network error'))
    const store = useUserStore.getState()
    await store.fetchUsers()
    expect(useUserStore.getState().error).toBe('Network error')
  })
})
```

## State Testing Rules

| Rule | Reason |
|------|--------|
| Reset store between tests | Isolate test state |
| Test actions, not internals | Black-box testing |
| Mock API, not store logic | Integration testing |
| Test loading/error states | Coverage completeness |
| Use store selectors in assertions | Match production usage |
