# Fetching Patterns

Additional patterns: SWR, RTK Query, race condition handling, request deduplication, retry strategies.

---

## SWR Patterns

```ts
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';

const { data, error, isLoading, isValidating, mutate } = useSWR('/api/user', fetcher, {
  revalidateOnFocus: true,
  dedupingInterval: 2000,
  errorRetryCount: 3,
});

const { trigger, isMutating } = useSWRMutation('/api/user', updateFetcher, {
  onSuccess: () => mutate(),
});
```

SWR is read-optimized. For complex mutations, prefer TanStack Query or pair SWR with a separate mutation library.

---

## RTK Query

```ts
const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  endpoints: (builder) => ({
    getUsers: builder.query<User[], void>({
      query: () => '/users',
      providesTags: ['User'],
    }),
    updateUser: builder.mutation<User, Partial<User> & { id: string }>({
      query: ({ id, ...body }) => ({ url: `/users/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['User'],
    }),
  }),
});
```

- `providesTags` / `invalidatesTags` replaces manual cache invalidation.
- RTK Query automatically deduplicates requests with the same endpoint + args.
- Use auto-generated hooks like `useGetUsersQuery`.

---

## Race Conditions

```ts
useEffect(() => {
  let cancelled = false;
  fetch(`/api/users?q=${query}`)
    .then(r => r.json())
    .then(data => { if (!cancelled) setResults(data); });
  return () => { cancelled = true; };
}, [query]);
```

Using a fetching library (TanStack Query, SWR, RTK Query) eliminates most race conditions by design.

---

## Request Deduplication

| Library | Dedup Mechanism |
|---------|----------------|
| TanStack Query | Same query key + same options → single request |
| SWR | Same key within `dedupingInterval` |
| RTK Query | Same endpoint + args → single request |
| Manual | AbortController per key |

```ts
const inflight = new Map<string, Promise<any>>();
async function dedupedFetch<T>(key: string, url: string): Promise<T> {
  if (inflight.has(key)) return inflight.get(key);
  const promise = fetch(url).then(r => r.json()).finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
}
```

---

## Retry Strategies

| Status Code | Retry? | Strategy |
|-------------|--------|----------|
| 401 | No | Redirect to login |
| 403 | No | Show permission error |
| 404 | No | Show not found |
| 422 | No | Show validation errors |
| 429 | Yes | Retry after Retry-After header |
| 5xx | Yes | Exponential backoff, max 3x |
| Network error | Yes | Retry on reconnect, max 5x |

```ts
async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url);
    if (res.ok) return res;
    if (res.status < 500) throw new Error(`HTTP ${res.status}`);
    await new Promise(r => setTimeout(r, 1000 * 2 ** i));
  }
  throw new Error('Max retries exceeded');
}
```
