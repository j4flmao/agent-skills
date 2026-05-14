# State Management Patterns

## State Decision Tree
```
Is it server state? (data from API, DB)
  → YES: TanStack Query / SWR / Apollo (server state library)
  → NO:
    Is it shared across unrelated components?
      → YES: Global store (Zustand, Pinia, Signals)
      → NO:
        Is it local UI state?
          → YES: useState / ref / local component state
          → NO: Prop drilling or composition (prefer composition)
```

## Server State (TanStack Query)
```typescript
function useOrders(userId: string) {
  return useQuery({
    queryKey: ['orders', userId],
    queryFn: () => fetch(`/api/orders?userId=${userId}`).then(r => r.json()),
    staleTime: 30_000,        // 30s before refetch
    gcTime: 5 * 60_000,       // keep in cache 5min
    retry: 2,
  })
}

// Mutations
function useCreateOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (order: NewOrder) => fetch('/api/orders', { method: 'POST', body: JSON.stringify(order) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  })
}
```

## Global UI State (Zustand)
```typescript
import { create } from 'zustand'

interface UIStore {
  sidebarOpen: boolean
  toggleSidebar: () => void
  theme: 'light' | 'dark'
  setTheme: (theme: 'light' | 'dark') => void
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  theme: 'light',
  setTheme: (theme) => set({ theme }),
}))
```

## Local State
```typescript
function SearchInput() {
  const [query, setQuery] = useState('')
  const [debounced] = useDebounce(query, 300)

  return <input value={query} onChange={(e) => setQuery(e.target.value)} />
}
```
