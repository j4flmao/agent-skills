# Data Fetching Caching Strategies

## Overview

Client-side caching for server data requires different strategies than traditional HTTP caching. The key concepts are: stale-while-revalidate, cache-first, network-first, and how cache keys, staleTime, gcTime, and persistence interact. This reference covers every caching strategy available in TanStack Query, SWR, and RTK Query with implementation details and decision guides.

## Core Concepts

### staleTime vs gcTime

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,      // 30s: data is "fresh" for 30 seconds
      gcTime: 5 * 60 * 1000,     // 5min: unused data stays in cache for 5 minutes
      refetchInterval: false,     // No polling by default
      refetchOnWindowFocus: true, // Refetch when tab regains focus
      retry: 3,                   // Retry failed requests 3 times
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000), // Exponential backoff
    },
  },
})
```

- **staleTime**: How long until data is considered outdated. During this window, cached data is served without refetching.
- **gcTime** (v5) / **cacheTime** (v4): How long inactive query data remains in memory. After this, it's garbage collected.

### Stale-While-Revalidate

The fundamental pattern: serve cached (stale) data immediately, then revalidate in the background.

```typescript
// TanStack Query
function useTodos() {
  return useQuery({
    queryKey: ['todos'],
    queryFn: fetchTodos,
    staleTime: 30_000,     // 30s fresh, then stale
    refetchInterval: 60_000, // Re-poll every 60s
  })
}

// SWR equivalent
function useTodos() {
  return useSWR('/api/todos', fetcher, {
    dedupingInterval: 30000,
    refreshInterval: 60000,
  })
}
```

### Cache-First Strategy

For data that rarely changes (reference data, configuration):

```typescript
function useCountries() {
  return useQuery({
    queryKey: ['countries'],
    queryFn: fetchCountries,
    staleTime: Infinity,     // Never stale
    gcTime: 24 * 60 * 60 * 1000, // Keep in cache for 24h
  })
}
```

### Network-First Strategy

For data that should be fresh but can show cache as fallback:

```typescript
function useUserProfile(userId: string) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
    networkMode: 'online',   // Don't use cache if offline
    staleTime: 0,            // Always refetch
    retry: 1,
  })
}
```

## Query Key Design

### Hierarchical Keys

```typescript
// Good — hierarchical for targeted invalidation
const queryKeys = {
  todos: {
    all: ['todos'] as const,
    lists: () => [...queryKeys.todos.all, 'list'] as const,
    list: (filters: TodoFilters) => [...queryKeys.todos.lists(), filters] as const,
    details: () => [...queryKeys.todos.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.todos.details(), id] as const,
  },
  users: {
    all: ['users'] as const,
    detail: (id: string) => [...queryKeys.users.all, id] as const,
  },
}

// Usage
function useTodos(filters: TodoFilters) {
  return useQuery({
    queryKey: queryKeys.todos.list(filters),
    queryFn: () => fetchTodos(filters),
  })
}

// Invalidation: target specific level
queryClient.invalidateQueries({ queryKey: queryKeys.todos.lists() }) // All todo lists
queryClient.invalidateQueries({ queryKey: queryKeys.todos.all })     // All todos
```

### Key with dependent data

```typescript
function usePostWithComments(postId: string) {
  const post = useQuery({
    queryKey: ['posts', postId],
    queryFn: () => fetchPost(postId),
  })

  const comments = useQuery({
    queryKey: ['posts', postId, 'comments'],
    queryFn: () => fetchComments(postId),
    enabled: !!post.data, // Only fetch after post is loaded
  })

  return { post, comments }
}
```

## Prefetching

### Page-level prefetch

```typescript
// Prefetch when hovering over a link
function prefetchPost(id: string) {
  queryClient.prefetchQuery({
    queryKey: ['posts', id],
    queryFn: () => fetchPost(id),
    staleTime: 30_000,
  })
}

// Component
function PostLink({ id, title }: { id: string; title: string }) {
  return (
    <Link
      to={`/posts/${id}`}
      onMouseEnter={() => prefetchPost(id)}
      onFocus={() => prefetchPost(id)}
    >
      {title}
    </Link>
  )
}
```

### Pagination prefetch

```typescript
function usePaginatedTodos() {
  const [page, setPage] = useState(1)
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['todos', { page }],
    queryFn: () => fetchTodos(page),
    placeholderData: keepPreviousData,
  })

  // Prefetch next page
  useEffect(() => {
    if (query.data?.hasMore) {
      queryClient.prefetchQuery({
        queryKey: ['todos', { page: page + 1 }],
        queryFn: () => fetchTodos(page + 1),
      })
    }
  }, [page, query.data])

  return { ...query, setPage }
}
```

### Route-based prefetch (React Router)

```typescript
// In router configuration
const router = createBrowserRouter([
  {
    path: '/dashboard',
    element: <Dashboard />,
    loader: async ({ queryClient }) => {
      await queryClient.prefetchQuery({
        queryKey: ['dashboard'],
        queryFn: fetchDashboard,
      })
      return null
    },
  },
])
```

## Cache Persistence

### TanStack Query persist to localStorage

```typescript
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { persistQueryClient } from '@tanstack/react-query-persist-client'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
    },
  },
})

const localStoragePersister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'QUERY_CACHE',
  throttleTime: 1000,
})

persistQueryClient({
  queryClient,
  persister: localStoragePersister,
  maxAge: 1000 * 60 * 60 * 24, // 24 hours
  buster: BUILD_VERSION, // Bust cache on version change
})
```

### Selective persistence

```typescript
persistQueryClient({
  queryClient,
  persister: localStoragePersister,
  dehydrateOptions: {
    shouldDehydrateQuery: (query) => {
      const queryKey = query.queryKey[0] as string
      // Only persist non-sensitive, infrequently changing queries
      return ['countries', 'currencies', 'static-config'].includes(queryKey)
    },
  },
})
```

### SWR cache persistence

```typescript
import { CacheProvider } from 'swr'

function localStorageProvider() {
  const map = new Map(JSON.parse(localStorage.getItem('SWR_CACHE') || '[]'))

  window.addEventListener('beforeunload', () => {
    const appCache = JSON.stringify(Array.from(map.entries()))
    localStorage.setItem('SWR_CACHE', appCache)
  })

  return map
}

function App() {
  return (
    <CacheProvider value={localStorageProvider()}>
      <Main />
    </CacheProvider>
  )
}
```

## Cache Invalidation

### Targeted invalidation

```typescript
// Invalidate a single item
queryClient.invalidateQueries({ queryKey: ['todos', '123'] })

// Invalidate all lists
queryClient.invalidateQueries({ queryKey: ['todos', 'list'] })

// Invalidate everything
queryClient.invalidateQueries()

// Invalidate with predicate
queryClient.invalidateQueries({
  predicate: (query) => {
    return query.queryKey[0] === 'todos' && query.queryKey.length === 3
  },
})
```

### Invalidation after mutation

```typescript
const mutation = useMutation({
  mutationFn: createTodo,
  onSuccess: (newTodo) => {
    // Invalidate all todo lists
    queryClient.invalidateQueries({ queryKey: ['todos', 'list'] })

    // Or update cache directly
    queryClient.setQueryData(['todos', 'detail', newTodo.id], newTodo)
  },
})
```

### Optimistic update with rollback

```typescript
const mutation = useMutation({
  mutationFn: updateTodo,
  onMutate: async (updatedTodo) => {
    await queryClient.cancelQueries({ queryKey: ['todos', updatedTodo.id] })
    const previous = queryClient.getQueryData(['todos', updatedTodo.id])
    queryClient.setQueryData(['todos', updatedTodo.id], updatedTodo)
    return { previous }
  },
  onError: (err, updatedTodo, context) => {
    queryClient.setQueryData(['todos', updatedTodo.id], context?.previous)
  },
  onSettled: (data, err, updatedTodo) => {
    queryClient.invalidateQueries({ queryKey: ['todos', updatedTodo.id] })
  },
})
```

## Infinite Query Caching

### Cursor-based pagination

```typescript
function useInfiniteProjects() {
  return useInfiniteQuery({
    queryKey: ['projects'],
    queryFn: ({ pageParam }) => fetchProjects({ cursor: pageParam }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    getPreviousPageParam: (firstPage) => firstPage.prevCursor ?? undefined,
    staleTime: 60_000,
  })
}

// Access cached pages
function ProjectList() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteProjects()

  return (
    <div>
      {data.pages.map((page) =>
        page.projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))
      )}
      <button
        onClick={() => fetchNextPage()}
        disabled={!hasNextPage || isFetchingNextPage}
      >
        {isFetchingNextPage ? 'Loading more...' : hasNextPage ? 'Load More' : 'All loaded'}
      </button>
    </div>
  )
}
```

### Offset-based pagination

```typescript
function useOffsetPosts(page: number) {
  return useQuery({
    queryKey: ['posts', { page }],
    queryFn: () => fetchPosts(page),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })
}
```

## Request Deduplication

TanStack Query automatically deduplicates identical in-flight requests:

```typescript
// Both components mount simultaneously — only ONE request fires
function ComponentA() {
  const { data } = useQuery({ queryKey: ['todos'], queryFn: fetchTodos })
  return <div>{data?.length} todos</div>
}

function ComponentB() {
  const { data } = useQuery({ queryKey: ['todos'], queryFn: fetchTodos })
  return <div>{data?.length} todos</div>
}
```

## Window Focus Refetching

### Global configuration

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,  // Default. Can be 'always'
    },
  },
})
```

### Per-query override

```typescript
function useUserData() {
  return useQuery({
    queryKey: ['user'],
    queryFn: fetchUser,
    refetchOnWindowFocus: false,       // Don't refetch
    refetchOnMount: false,             // Don't refetch on remount
    refetchOnReconnect: false,         // Don't refetch on reconnect
    staleTime: 5 * 60 * 1000,         // 5 minutes fresh
  })
}
```

## Dependent Queries

### Serial queries

```typescript
function useUserWithPosts(userId: string | null) {
  const user = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId!),
    enabled: !!userId, // Only run when userId is truthy
  })

  const posts = useQuery({
    queryKey: ['user', userId, 'posts'],
    queryFn: () => fetchPosts(userId!),
    enabled: !!user.data, // Only run after user data is loaded
  })

  return { user, posts }
}
```

### Parallel queries

```typescript
function useDashboard() {
  const users = useQuery({ queryKey: ['users'], queryFn: fetchUsers })
  const orders = useQuery({ queryKey: ['orders'], queryFn: fetchOrders })
  const analytics = useQuery({ queryKey: ['analytics'], queryFn: fetchAnalytics })

  return { users, orders, analytics }
}
```

## Cache Time Calculation

| Data type | Example | staleTime | gcTime | Strategy |
|-----------|---------|-----------|--------|----------|
| Reference data | Countries, currencies | Infinity | 24h | Cache-first |
| User profile | Name, avatar | 5 min | 30 min | Stale-while-revalidate |
| Feed/Timeline | Posts, articles | 30 sec | 1 hour | Stale-while-revalidate |
| Real-time dashboard | Metrics, analytics | 0 (always stale) | 5 min | Polling |
| Search results | Query results | 60 sec | 10 min | Cache-first + invalidate |
| Auth data | Session, permissions | 0 | Session | Always fresh |

## Offline Support

### Pause queries when offline

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'offlineFirst', // Use cache when offline
    },
    mutations: {
      networkMode: 'online', // Don't attempt mutations offline
    },
  },
})
```

### Manual online/offline management

```typescript
import { onlineManager } from '@tanstack/react-query'

// Pause/resume all queries based on network state
onlineManager.setEventListener((setOnline) => {
  window.addEventListener('online', () => setOnline(true))
  window.addEventListener('offline', () => setOnline(false))
})
```

## Background Refetch Interval

### Polling

```typescript
function useLiveScores() {
  return useQuery({
    queryKey: ['scores'],
    queryFn: fetchScores,
    refetchInterval: 30_000,       // Poll every 30s
    refetchIntervalInBackground: false, // Only when tab is focused
  })
}
```

### Conditional polling

```typescript
function useActivePoll(enabled: boolean) {
  return useQuery({
    queryKey: ['live-data'],
    queryFn: fetchLiveData,
    refetchInterval: enabled ? 10_000 : false, // Only poll when active
  })
}
```

## Cache Monitoring and Debugging

```typescript
// Subscribe to cache changes
const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
  console.log('Cache event:', event.type, event.query.queryKey)
})

// Get all cached queries
const queries = queryClient.getQueryCache().getAll()
queries.forEach((query) => {
  console.log(query.queryKey, query.state)
})

// Clear all cache
queryClient.clear()
```

## Migration Between Versions

### v4 -> v5 changes

```typescript
// v4
const query = useQuery('todos', fetchTodos, { cacheTime: 300000 })

// v5
const query = useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  gcTime: 300000, // renamed from cacheTime
})
```

| v4 | v5 | Notes |
|----|----|-------|
| `cacheTime` | `gcTime` | Renamed, same behavior |
| `keepPreviousData` | `placeholderData: keepPreviousData` | Changed API |
| `onSuccess` | Removed | Use `queryClient.setQueryDefaults` |
| `queryCache` | `queryClient.getQueryCache()` | Restructured |
| `useQueries` | Same | API updated |
