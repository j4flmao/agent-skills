# Data Fetching Patterns

## Fetching Strategy Comparison

| Strategy | Stale Time | Behavior | Use Case |
|----------|------------|----------|----------|
| Stale-while-revalidate | 0 | Show cache, refetch | Default for dynamic data |
| Cache-first | ∞ | Ignore network | Static reference data |
| Network-only | — | Always fetch | Mutations, sensitive data |
| Cache-and-network | Custom | Show cache, then network update | News feed, social |
| Refetch on focus | Configurable | Refetch when tab gains focus | Dashboard data |
| Polling | `refetchInterval` | Auto-refresh every N ms | Real-time dashboards |
| Prefetching | Manual | Load data before navigation | Detail pages |

## Request Deduplication

```typescript
// TanStack Query deduplicates by queryKey automatically
// Same key = same request = one network call

// Manual deduplication for custom fetcher
const inflightRequests = new Map<string, Promise<Response>>()

async function dedupedFetch(url: string): Promise<Response> {
  if (inflightRequests.has(url)) {
    return inflightRequests.get(url)!
  }

  const promise = fetch(url).finally(() => inflightRequests.delete(url))
  inflightRequests.set(url, promise)
  return promise
}
```

## Dependent Queries

```typescript
// Query depends on data from another query
function UserDashboard({ userId }: { userId: string }) {
  const user = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  })

  const orders = useQuery({
    queryKey: ['orders', user.data?.id],
    queryFn: () => fetchOrders(user.data!.id),
    enabled: !!user.data, // don't run until user data is ready
  })

  return orders.isLoading ? <Spinner /> : <OrderList orders={orders.data} />
}
```

## Race Condition Handling

```typescript
// ❌ Race condition: slow response for query "b" may overwrite "a"
useEffect(() => {
  fetchData(query).then(setData)
}, [query])

// ✅ TanStack Query handles this — only latest queryKey wins
// ✅ Manual: use AbortController
function useAbortableFetch(query: string) {
  useEffect(() => {
    const ctrl = new AbortController()
    fetch(`/api?q=${query}`, { signal: ctrl.signal })
      .then(res => res.json())
      .then(setData)
      .catch(err => { if (err.name !== 'AbortError') throw err })
    return () => ctrl.abort()
  }, [query])
}
```

## Parallel Queries

```typescript
// Static parallel queries
function Dashboard() {
  const users = useQuery({ queryKey: ['users'], queryFn: fetchUsers })
  const orders = useQuery({ queryKey: ['orders'], queryFn: fetchOrders })
  const products = useQuery({ queryKey: ['products'], queryFn: fetchProducts })

  // All three fetch in parallel automatically
}

// Dynamic parallel queries (variable count)
function UserProfiles({ userIds }: { userIds: string[] }) {
  const userQueries = useQueries({
    queries: userIds.map(id => ({
      queryKey: ['user', id],
      queryFn: () => fetchUser(id),
    })),
  })
}
```

## Background Refetch Configuration

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,        // 30s fresh
      gcTime: 5 * 60 * 1000,       // 5min in cache after unused
      refetchOnWindowFocus: true,   // refetch on tab focus
      refetchOnReconnect: true,     // refetch on network recovery
      retry: 3,                     // retry 3 times
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    },
  },
})
```

## Pagination Patterns

| Type | Hook | Key Pattern | Use Case |
|------|------|-------------|----------|
| Offset | `useQuery` | `['items', page]` | Admin tables, skip/take |
| Cursor | `useInfiniteQuery` | `['items', cursor]` | Infinite scroll feeds |
| Keyset | `useInfiniteQuery` | `['items', lastId]` | Real-time ordered lists |

```typescript
function InfiniteFeed() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: ({ pageParam }) => fetchFeed({ cursor: pageParam }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  })

  // IntersectionObserver triggers fetchNextPage
  const observerRef = useRef(null)
  useInView(observerRef, { onChange: (inView) => {
    if (inView && hasNextPage) fetchNextPage()
  }})

  return (
    <>
      {data?.pages.map(page => page.items.map(item => <Item key={item.id} {...item} />))}
      <div ref={observerRef}>{isFetchingNextPage && <Spinner />}</div>
    </>
  )
}
```

## Prefetching Patterns

```typescript
// Prefetch on hover
function ProductCard({ id }: { id: string }) {
  const queryClient = useQueryClient()

  return (
    <div
      onMouseEnter={() => {
        queryClient.prefetchQuery({
          queryKey: ['product', id],
          queryFn: () => fetchProduct(id),
          staleTime: 60 * 1000,
        })
      }}
    >
      <ProductPreview />
    </div>
  )
}

// Prefetch in route loader
const router = createBrowserRouter([
  {
    path: '/products/:id',
    loader: async ({ params }) => {
      const queryClient = getQueryClient()
      await queryClient.prefetchQuery({
        queryKey: ['product', params.id],
        queryFn: () => fetchProduct(params.id!),
      })
      return { id: params.id }
    },
    element: <ProductPage />,
  },
])
```

## Optimistic Update Rollback

```typescript
function useToggleLike() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (postId: string) => api.post(`/posts/${postId}/like`),
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ['posts'] })
      const previous = queryClient.getQueriesData({ queryKey: ['posts'] })
      queryClient.setQueryData(['posts'], (old: Post[]) =>
        old.map(p => p.id === postId ? { ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) } : p)
      )
      return { previous }
    },
    onError: (_err, _postId, context) => {
      queryClient.setQueriesData({ queryKey: ['posts'] }, context?.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
    },
  })
}
```
