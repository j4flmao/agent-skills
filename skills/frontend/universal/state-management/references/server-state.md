# Server State

## Purpose

Server state management handles data that lives on the server and is fetched by the client. This includes API responses, database records, and any data whose source of truth is external to the frontend. Server state libraries (TanStack Query, RTK Query, SWR, Apollo) provide caching, background synchronization, optimistic updates, and cache invalidation — eliminating the need to put server data in a global store.

## Server State Libraries

### TanStack Query (React Query)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Basic query
function useUsers(page: number) {
  return useQuery({
    queryKey: ['users', { page }],
    queryFn: () => api.getUsers({ page }),
    staleTime: 30_000,           // Data is fresh for 30s
    gcTime: 5 * 60_000,          // Keep in cache for 5 min after unmount
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    refetchOnWindowFocus: true,
    placeholderData: keepPreviousData,  // Keep previous page data while loading next
  })
}
```

### RTK Query

```typescript
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['User', 'Order'],
  endpoints: (builder) => ({
    getUsers: builder.query<User[], { page: number }>({
      query: ({ page }) => `users?page=${page}`,
      providesTags: (result) =>
        result
          ? [...result.map(({ id }) => ({ type: 'User' as const, id })), { type: 'User', id: 'LIST' }]
          : [{ type: 'User', id: 'LIST' }],
    }),
    updateUser: builder.mutation<User, Partial<User> & { id: string }>({
      query: ({ id, ...body }) => ({ url: `users/${id}`, method: 'PATCH', body }),
      invalidatesTags: (result, error, { id }) => [{ type: 'User', id }],
    }),
  }),
})
```

### SWR

```typescript
import useSWR from 'swr'
import useSWRMutation from 'swr/mutation'

const fetcher = (url: string) => fetch(url).then(r => r.json())

function useProfile() {
  const { data, error, isLoading, mutate } = useSWR('/api/profile', fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 2000,
    errorRetryCount: 3,
  })

  return { profile: data, isLoading, isError: !!error, mutate }
}

// Mutation with optimistic update
function useUpdateProfile() {
  const { trigger, isMutating } = useSWRMutation(
    '/api/profile',
    async (url, { arg }: { arg: Partial<Profile> }) =>
      fetch(url, { method: 'PATCH', body: JSON.stringify(arg), headers: { 'Content-Type': 'application/json' } })
  )

  return { updateProfile: trigger, isUpdating: isMutating }
}
```

### Apollo Client (GraphQL)

```typescript
import { useQuery, useMutation, gql } from '@apollo/client'

const GET_USERS = gql`
  query GetUsers($page: Int!) {
    users(page: $page) {
      id name email
    }
  }
`

function UsersList() {
  const { loading, error, data, fetchMore } = useQuery(GET_USERS, {
    variables: { page: 1 },
    fetchPolicy: 'cache-and-network',  // Show cached data, fetch in background
    nextFetchPolicy: 'cache-first',    // After initial load, prefer cache
  })
}

const UPDATE_USER = gql`
  mutation UpdateUser($id: ID!, $name: String!) {
    updateUser(id: $id, name: $name) { id name }
  }
`

function useUpdateUser() {
  const [mutate] = useMutation(UPDATE_USER, {
    update(cache, { data }) {
      // Update cached queries after mutation
      cache.modify({
        fields: {
          users(existing = []) {
            return existing.map(u =>
              u.__ref === `User:${data.updateUser.id}` ? { ...u, ...data.updateUser } : u
            )
          },
        },
      })
    },
  })
}
```

## Caching Strategy

### Cache Lifecycle

```
Query Mounted → Cache Miss → Fetch → Cache Fresh → Stale → Re-fetch (if trigger)
                     ↓                                 ↓
                Loading UI                        Show stale data
                (background fetch)

Cache Fresh (staleTime window):
  - Data is considered up-to-date
  - No refetches on mount, window refocus, or interval

Cache Stale (after staleTime):
  - Data may be outdated
  - Refetches on mount, window refocus, interval triggers
```

### Configuring staleTime and gcTime

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,           // Default: immediately stale (refetch on mount)
      gcTime: 5 * 60_000,    // 5 minutes garbage collection
      retry: 3,
      refetchOnWindowFocus: true,
    },
  },
})

// Per-query configuration based on data volatility
const userProfileQuery = useQuery({
  queryKey: ['user', userId],
  queryFn: () => api.getUser(userId),
  staleTime: 5 * 60_000,      // Profile rarely changes — 5 min fresh window
  gcTime: 30 * 60_000,        // Keep in cache for 30 min after unmount
})

const liveMetricsQuery = useQuery({
  queryKey: ['metrics'],
  queryFn: () => api.getMetrics(),
  staleTime: 5_000,            // Live data — 5 seconds fresh window
  refetchInterval: 10_000,     // Poll every 10 seconds
})

const staticContentQuery = useQuery({
  queryKey: ['content', slug],
  queryFn: () => api.getContent(slug),
  staleTime: Infinity,         // Content never goes stale (immutable)
  gcTime: 60 * 60_000,        // Keep cached for 1 hour
})
```

### Cache Invalidation

```typescript
const queryClient = useQueryClient()

// Invalidate specific query
queryClient.invalidateQueries({ queryKey: ['users'] })

// Invalidate with filter
queryClient.invalidateQueries({
  queryKey: ['orders'],
  predicate: (query) => {
    const { page } = query.queryKey[1] as { page: number }
    return page <= 3  // Only invalidate first 3 pages
  },
})

// Invalidate and refetch
queryClient.invalidateQueries({
  queryKey: ['users'],
  refetchType: 'active',  // Only refetch active (mounted) queries
})
```

## Stale-While-Revalidate

### Pattern

The stale-while-revalidate pattern serves cached (stale) data immediately and fetches fresh data in the background.

```typescript
function useOrders() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: fetchOrders,
    staleTime: 10_000,        // 10 seconds fresh
    // After 10s, data is stale but still shown
    // Background refetch happens and updates the UI when complete
  })
}

// Manual stale-while-revalidate with SWR
const { data, isValidating } = useSWR('/api/orders', fetcher, {
  revalidateIfStale: true,
  revalidateOnMount: true,
  revalidateOnFocus: true,
  // data: stale cached data (if available)
  // isValidating: true during background revalidation
})
```

## Optimistic Updates

### Pattern

Optimistic updates update the UI immediately before the server confirms the mutation, then roll back on failure.

```typescript
function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (newUser: NewUser) => api.createUser(newUser),

    onMutate: async (newUser) => {
      // Cancel outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ['users'] })

      // Snapshot previous value
      const previousUsers = queryClient.getQueryData(['users'])

      // Optimistically update cache
      queryClient.setQueryData(['users'], (old: User[]) => [
        { id: 'temp-' + Date.now(), ...newUser, status: 'creating' },
        ...(old ?? []),
      ])

      return { previousUsers }  // Pass to onError for rollback
    },

    onError: (err, newUser, context) => {
      // Rollback on failure
      queryClient.setQueryData(['users'], context?.previousUsers)
      toast.error('Failed to create user')
    },

    onSettled: () => {
      // Always refetch to ensure cache is in sync with server
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}
```

### List Optimistic Update

```typescript
function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...data }: Partial<User> & { id: string }) =>
      api.updateUser(id, data),

    onMutate: async ({ id, ...data }) => {
      await queryClient.cancelQueries({ queryKey: ['users'] })

      // Update user in list cache
      queryClient.setQueryData(['users'], (old: User[] | undefined) =>
        old?.map(u => (u.id === id ? { ...u, ...data } : u))
      )

      // Update individual user cache
      queryClient.setQueryData(['user', id], (old: User | undefined) =>
        old ? { ...old, ...data } : old
      )
    },

    onError: (err, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['user', variables.id] })
    },
  })
}
```

## Pagination and Infinite Scroll

### Offset Pagination

```typescript
function UsersPage() {
  const [page, setPage] = useState(1)

  const { data, isLoading, isPreviousData } = useQuery({
    queryKey: ['users', page],
    queryFn: () => api.getUsers({ page, limit: 20 }),
    placeholderData: keepPreviousData,
  })

  return (
    <div>
      {data?.users.map(user => <UserCard key={user.id} user={user} />)}
      <Pagination
        page={page}
        totalPages={data?.totalPages}
        onPageChange={(p) => setPage(p)}
        disabled={isPreviousData}  // Disable buttons while loading next page
      />
    </div>
  )
}
```

### Infinite Scroll (Cursor-Based)

```typescript
function useInfiniteUsers() {
  return useInfiniteQuery({
    queryKey: ['users'],
    queryFn: ({ pageParam }) => api.getUsers({ cursor: pageParam, limit: 20 }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    getPreviousPageParam: (firstPage) => firstPage.previousCursor ?? undefined,
  })
}

function UsersList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
  } = useInfiniteUsers()

  // Intersection Observer for infinite scroll
  const loadMoreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!loadMoreRef.current) return
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasNextPage) {
        fetchNextPage()
      }
    })
    observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [hasNextPage, fetchNextPage])

  return (
    <div>
      {data?.pages.map((page, i) => (
        <Fragment key={i}>
          {page.users.map(user => <UserCard key={user.id} user={user} />)}
        </Fragment>
      ))}
      <div ref={loadMoreRef}>
        {isFetchingNextPage && <Spinner />}
        {!hasNextPage && <p>No more users</p>}
      </div>
    </div>
  )
}
```

## Prefetching

### Proactive Prefetching

```typescript
function UserProfile({ userId }: { userId: string }) {
  const queryClient = useQueryClient()

  // Prefetch user's orders when hovering over profile
  const prefetchOrders = () => {
    queryClient.prefetchQuery({
      queryKey: ['orders', userId],
      queryFn: () => api.getUserOrders(userId),
      staleTime: 30_000,
    })
  }

  return (
    <div onMouseEnter={prefetchOrders}>
      <UserDetails userId={userId} />
    </div>
  )
}
```

### Router-Level Prefetching

```typescript
// Next.js — prefetch page data on link hover
<Link
  href="/users/123"
  prefetch={true}  // Fetch page data in background
>
  View User
</Link>

// TanStack Router — prefetch query on route preload
const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',  // Preload on hover/focus
})
```

### Initial Data for SSR

```typescript
// Server-side prefetching with Next.js
export async function getServerSideProps() {
  const queryClient = new QueryClient()

  await queryClient.prefetchQuery({
    queryKey: ['users'],
    queryFn: () => api.getUsers({ page: 1 }),
  })

  return {
    props: {
      dehydratedState: dehydrate(queryClient),
    },
  }
}
```

## Mutations

### Mutation Lifecycle

```typescript
function useCreateOrder() {
  return useMutation({
    mutationFn: (order: NewOrder) => api.createOrder(order),

    onMutate: (order) => {
      // Called before mutation fires
      // Good for optimistic updates, disable buttons
      showLoadingIndicator()
    },

    onSuccess: (result, order) => {
      // Mutation succeeded
      toast.success(`Order ${result.id} created`)
      invalidateRelatedQueries()
    },

    onError: (error, order) => {
      // Mutation failed
      toast.error(`Failed to create order: ${error.message}`)
    },

    onSettled: (data, error, order) => {
      // Called after both success and error
      hideLoadingIndicator()
    },
  })
}
```

### Dependent Mutations

```typescript
function OrderWizard() {
  const createOrder = useCreateOrder()
  const processPayment = useProcessPayment()
  const confirmOrder = useConfirmOrder()

  const handleSubmit = async (orderData: OrderData) => {
    try {
      const order = await createOrder.mutateAsync(orderData)
      const payment = await processPayment.mutateAsync({ orderId: order.id, ...orderData.payment })
      await confirmOrder.mutateAsync({ orderId: order.id, paymentId: payment.id })
      toast.success('Order completed!')
    } catch (error) {
      toast.error('Order failed')
    }
  }
}
```

## Background Refetching

### Refetch Triggers

```typescript
// On mount (if stale)
useQuery({ queryKey: ['users'], queryFn, staleTime: 30_000 })

// On window focus
useQuery({ queryKey: ['users'], queryFn, refetchOnWindowFocus: true })

// On interval
useQuery({ queryKey: ['notifications'], queryFn, refetchInterval: 30_000 })

// On network reconnect
useQuery({ queryKey: ['users'], queryFn, refetchOnReconnect: true })

// Manual refetch
const { refetch } = useQuery({ queryKey: ['users'], queryFn, enabled: false })
<button onClick={() => refetch()}>Refresh</button>
```

### Selective Refetching

```typescript
// Refetch only specific queries
queryClient.refetchQueries({
  predicate: (query) => {
    return query.queryKey[0] === 'orders' && query.queryKey[1]?.status === 'pending'
  },
})

// Refetch all active queries
queryClient.refetchQueries({ type: 'active' })

// Refetch and wait for completion
await queryClient.refetchQueries({ queryKey: ['users'] })
```

## Key Points

- Server state belongs in TanStack Query / RTK Query / SWR / Apollo — never in a global client store.
- staleTime defines how long data is considered fresh. Set based on data volatility.
- gcTime (formerly cacheTime) defines how long data lives after unmount.
- Stale-while-revalidate serves cached data immediately and refreshes in background.
- Optimistic updates update the UI before server confirmation, roll back on error.
- Infinite queries handle cursor-based pagination with automatic page fetching.
- Prefetching loads data before the user navigates or interacts.
- Mutations invalidate related queries on success to keep data in sync.
- Background refetching on mount, focus, interval, and reconnect keeps data fresh.
- KeepPreviousData provides a smooth pagination experience during page transitions.
