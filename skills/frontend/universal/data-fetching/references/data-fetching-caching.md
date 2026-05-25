# Data Fetching Caching

## Cache Layer Architecture

```
┌─────────────┐    Query Key     ┌──────────────┐   Fresh?   ┌────────────┐
│  Component   │ ──────────────→ │   Cache Store  │ ────────→ │  Network   │
│  (useQuery)  │ ←────────────── │ (in-memory)   │ ←──────── │  (fetch)   │
└─────────────┘   Cached Data    └──────────────┘  Stale?    └────────────┘
                                       │
                                  ┌────┴────┐
                                  │ Persist? │
                                  │ (optional)│
                                  └─────────┘
```

## Cache Lifecycle

```
Fetch → Cache → Fresh → Stale → GC (removed)
                    ↓
              Background refetch
                    ↓
              Fresh again
```

- **Fresh**: data shown from cache, no network request
- **Stale**: data shown from cache, background refetch triggered
- **GC**: data removed from cache after `gcTime` of inactivity

## Stale Time Recommendations

| Data Type | staleTime | Rationale |
|-----------|-----------|-----------|
| User profile | 5 min | Changes infrequently |
| Settings/config | 10 min | Rarely changes |
| Product list | 1 min | Acceptable staleness |
| Order status | 30s | Users expect prompt updates |
| Search results | 0 (instant stale) | Must be fresh per query |
| Reference data (countries) | Infinity | Never changes |
| Comments | 30s | Social context matters |
| Notifications | 0 | Must be fresh always |

## Cache Persistence

```typescript
import { persistQueryClient } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'

const queryClient = new QueryClient()

const localStoragePersister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'APP_QUERY_CACHE',
  throttleTime: 1000,
})

persistQueryClient({
  queryClient,
  persister: localStoragePersister,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  buster: APP_VERSION, // bust cache on version change
})
```

## Cache Key Design

```typescript
// Good — unique, stable, serializable
['user', userId]
['posts', { filter: 'recent', page: 2 }]
['comments', postId, { sort: 'newest' }]

// Bad — non-serializable or unstable
[Math.random()]           // different every render
[new Date()]              // different every render
[{ nested: { ref } }]    // object with cyclic reference
[undefined]               // ambiguous

// Key includes all query parameters
function useProducts(filters: ProductFilters) {
  return useQuery({
    queryKey: ['products', filters],  // { category, minPrice, maxPrice, sort }
    queryFn: () => api.getProducts(filters),
  })
}
```

## Cache Invalidation Patterns

```typescript
// Invalidate single query
queryClient.invalidateQueries({ queryKey: ['user', userId] })

// Invalidate all queries matching a prefix
queryClient.invalidateQueries({ queryKey: ['posts'] }) // ['posts'], ['posts', id], etc.

// Invalidate and refetch exact
queryClient.invalidateQueries({ queryKey: ['user', userId], exact: true })

// Remove (not refetch)
queryClient.removeQueries({ queryKey: ['temp-data'] })

// Refetch without invalidating (keeps staleTime)
queryClient.refetchQueries({ queryKey: ['dashboard'] })

// Invalidate after mutation
function useCreatePost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (post: NewPost) => api.post('/posts', post),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      queryClient.invalidateQueries({ queryKey: ['feed'] })
    },
  })
}
```

## Cache Garbage Collection

```typescript
// Default: gcTime: 5 * 60 * 1000 (5 minutes)
// After all observers unmount, data stays for gcTime, then removed

// Disable GC for always-mounted queries
useQuery({ queryKey: ['settings'], queryFn: fetchSettings, gcTime: Infinity })

// Clear entire cache
queryClient.clear()
```

## Persisted Cache Strategy

| Strategy | TTL | Storage | Use Case |
|----------|-----|---------|----------|
| In-memory only | Session | RAM | Default, security-sensitive |
| localStorage | 24h | Disk | Offline support, slow network |
| IndexedDB | 7 days | Disk | Large datasets, PWA |
| Session storage | Tab | Disk | Short sessions |

## Offline Support

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'offlineFirst', // serve cache, then try network
      retry: 3,
      retryDelay: 1000,
    },
    mutations: {
      networkMode: 'online', // mutations only when online
    },
  },
})

// Detect online/offline
const onlineManager = OnlineManager.getInstance()
onlineManager.setEventListener((setOnline) => {
  return window.addEventListener('online', () => setOnline(true))
})
```

## Cache Debugging

```typescript
// TanStack Query Devtools
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

// Programmatic cache inspection
const cache = queryClient.getQueryCache()
const queries = cache.getAll()
queries.forEach(q => console.log(q.queryKey, q.state))
```
