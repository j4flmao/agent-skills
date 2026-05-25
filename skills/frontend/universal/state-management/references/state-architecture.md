# State Architecture Patterns

## State Categories

```
┌─────────────────────────────────────┐
│             STATE                    │
├─────────────┬───────────────────────┤
│  Server     │    Client             │
│  (API, DB)  │  ┌─────┬──────┬────┐ │
│             │  │Local│Shared│ URL│ │
│             │  └─────┴──────┴────┘ │
└─────────────┴───────────────────────┘
```

## State Location Rules

```typescript
// 1. Server state → TanStack Query
const { data, isLoading } = useQuery({
  queryKey: ['users'],
  queryFn: () => api.getUsers(),
  staleTime: 30_000,
})

// 2. Form/UI state → Component local
function SearchInput() {
  const [query, setQuery] = useState('')

// 3. Shared UI → Lightweight store
const useUIStore = create((set) => ({
  sidebarOpen: false,
  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
}))

// 4. URL state → Router
const [searchParams, setSearchParams] = useSearchParams()
const page = Number(searchParams.get('page')) || 1

// 5. Complex state → Redux/XState
const orderMachine = createMachine({
  initial: 'idle',
  states: { idle: {}, loading: {}, success: {}, error: {} },
})
```

## Store Design Guidelines

### Single Responsibility

```typescript
// ❌ Wrong: One store for everything
const useAppStore = create((set) => ({
  users: [], orders: [], theme: 'light', sidebar: false,
  cart: [], notifications: [],
}))

// ✅ Correct: Split by domain
const useUserStore = create(...)     // User data
const useCartStore = create(...)     // Shopping cart
const useUIStore = create(...)       // Theme, sidebar
const useNotificationStore = create(...)  // Alerts
```

### Normalized Data

```typescript
// ❌ Wrong: Nested data
{
  order: { id: 1, user: { id: 1, name: 'Alice' }, items: [{ product: { id: 1 } }] }
}

// ✅ Correct: Normalized
{
  orders: { byId: { 1: { id: 1, userId: 1, itemIds: [1] } } },
  users: { byId: { 1: { id: 1, name: 'Alice' } } },
  items: { byId: { 1: { id: 1, productId: 1 } } },
}
```

### Selector Pattern

```typescript
// ✅ Correct: Memoized selectors
const selectUserById = (id: string) => (state: State) =>
  state.users.byId[id]

// Derived selectors
const selectActiveUser = createSelector(
  [selectUsers, (state) => state.auth.userId],
  (users, userId) => users.find(u => u.id === userId)
)
```

## Common Anti-Patterns

| Anti-Pattern | Problem | Fix |
|--------------|---------|-----|
| Server data in global store | Stale, no cache invalidation | Use TanStack Query |
| Context for state management | Re-renders all consumers | Use Zustand/Pinia |
| One giant store | Poor code splitting | Split by domain |
| Derived data in state | Inconsistency | Compute with selectors |
| URL state duplication | Sync bugs | Read from router only |
