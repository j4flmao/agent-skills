# React Query Patterns

## Query Configuration

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
})

function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

## Custom Query Hooks

```typescript
interface UseUsersOptions {
  page: number
  pageSize: number
  search?: string
  enabled?: boolean
}

function useUsers({ page, pageSize, search, enabled }: UseUsersOptions) {
  return useQuery({
    queryKey: ['users', { page, pageSize, search }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        ...(search && { search }),
      })
      const response = await fetch(`/api/users?${params}`)
      if (!response.ok) throw new Error('Failed to fetch users')
      return response.json() as Promise<PaginatedResponse<User>>
    },
    placeholderData: keepPreviousData,
    enabled,
  })
}

function useUser(id: string) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: async () => {
      const response = await fetch(`/api/users/${id}`)
      if (!response.ok) throw new Error('Failed to fetch user')
      return response.json() as Promise<User>
    },
    enabled: !!id,
  })
}
```

## Optimistic Updates

```typescript
function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (user: User) => {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify(user),
        headers: { 'Content-Type': 'application/json' },
      })
      if (!response.ok) throw new Error('Failed to update user')
      return response.json() as Promise<User>
    },
    onMutate: async (updatedUser) => {
      await queryClient.cancelQueries({ queryKey: ['user', updatedUser.id] })
      const previous = queryClient.getQueryData(['user', updatedUser.id])
      queryClient.setQueryData(['user', updatedUser.id], updatedUser)
      return { previous }
    },
    onError: (err, updatedUser, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['user', updatedUser.id], context.previous)
      }
    },
    onSettled: (data, error, updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ['user', updatedUser.id] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}
```

## Infinite Loading

```typescript
function useInfiniteUsers() {
  return useInfiniteQuery({
    queryKey: ['users', 'infinite'],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await fetch(`/api/users?page=${pageParam}`)
      return response.json() as Promise<PaginatedResponse<User>>
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      return lastPage.page < lastPage.totalPages
        ? lastPage.page + 1
        : undefined
    },
  })
}

function UserList() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteUsers()

  return (
    <div>
      {data?.pages.map((page, i) => (
        <Fragment key={i}>
          {page.data.map(user => <UserCard key={user.id} user={user} />)}
        </Fragment>
      ))}
      {hasNextPage && (
        <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? 'Loading...' : 'Load more'}
        </button>
      )}
    </div>
  )
}
```

## Key Points

- Configure global defaults for staleTime, retry, and gcTime
- Use query key factories for consistent cache management
- Implement optimistic updates for responsive UIs
- Use keepPreviousData for paginated queries
- Leverage infinite queries for load-more patterns
- Separate queries from mutations with clear responsibilities
- Invalidate related queries after mutations
- Use query cancellation to prevent stale updates
- Handle loading and error states at the hook level
- Prefetch data for anticipated user actions
- Use mutation callbacks for side effects
- Monitor query cache size and performance
