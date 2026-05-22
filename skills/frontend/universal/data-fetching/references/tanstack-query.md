# TanStack Query

Patterns for queries, mutations, cache management, pagination, and SSR.

---

## Query Definitions

```ts
import { useQuery } from '@tanstack/react-query';

export function useUser(id: string) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => fetch(`/api/users/${id}`).then(r => r.json()),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });
}
```

### Dependent Queries
```ts
const { data: user } = useQuery({ queryKey: ['users', id], ... });
const { data: posts } = useQuery({
  queryKey: ['posts', user?.id],
  queryFn: () => fetchPosts(user.id),
  enabled: !!user?.id,
});
```

---

## Mutations

```ts
const mutation = useMutation({
  mutationFn: (data: UpdateUser) => fetch(`/api/users/${data.id}`, {
    method: 'PUT', body: JSON.stringify(data),
  }),
  onMutate: async (newData) => {
    await queryClient.cancelQueries({ queryKey: ['users', newData.id] });
    const previous = queryClient.getQueryData(['users', newData.id]);
    queryClient.setQueryData(['users', newData.id], newData);
    return { previous };
  },
  onError: (err, newData, context) => {
    queryClient.setQueryData(['users', newData.id], context?.previous);
  },
  onSettled: (data, err, variables) => {
    queryClient.invalidateQueries({ queryKey: ['users', variables.id] });
  },
});
```

---

## Pagination & Infinite Scroll

```ts
function useInfinitePosts() {
  return useInfiniteQuery({
    queryKey: ['posts'],
    queryFn: ({ pageParam }) => fetch(`/api/posts?cursor=${pageParam}`).then(r => r.json()),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? null,
  });
}
```

```tsx
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfinitePosts();

<Observer onIntersect={() => hasNextPage && fetchNextPage()} />
{isFetchingNextPage && <Spinner />}
```

- `useInfiniteQuery` returns `data.pages` (array of page arrays). Flatten: `data.pages.flat()`.
- `getNextPageParam` returns `undefined` or `null` to signal no more pages.

---

## SSR / Initial Data

```ts
await queryClient.prefetchQuery({ queryKey: ['users'], queryFn: fetchUsers });

<HydrationBoundary state={dehydrate(queryClient)}>
  <App />
</HydrationBoundary>
```

On client, `HydrationBoundary` rehydrates the cache so no initial loading flash occurs.

---

## Query Key Conventions

| Pattern | Example | When |
|---------|---------|------|
| `[entity]` | `['users']` | List of all |
| `[entity, id]` | `['users', '123']` | Single item |
| `[entity, { filters }]` | `['users', { role: 'admin' }]` | Filtered list |
| `[entity, id, 'detail']` | `['users', '123', 'posts']` | Nested resource |

Query keys are serialized deterministically — order of object keys matters.
