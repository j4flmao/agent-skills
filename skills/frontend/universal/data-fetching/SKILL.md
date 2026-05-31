---
name: frontend-data-fetching
description: >
  Use this skill when the user says 'data fetching', 'TanStack Query', 'SWR', 'React Query', 'server state', 'API client', 'data fetching pattern', 'cache invalidation', 'optimistic update', 'pagination data', 'infinite scroll', 'stale-while-revalidate'. Design data fetching layer for frontend apps. Do NOT use for: backend API design or database queries.
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, data-fetching, phase-7, universal]
version: "1.0.0"
author: "j4flmao"
license: "MIT"
---

# Frontend Data Fetching

## Purpose
Manage server state efficiently on the client — eliminating boilerplate, providing caching, deduplication, background refetching, and optimistic mutations while keeping server state out of global client stores.

## Agent Protocol

### Trigger
User request includes any of: "data fetching", "TanStack Query", "SWR", "React Query", "server state", "API client", "data fetching pattern", "cache invalidation", "optimistic update", "pagination data", "infinite scroll", "stale-while-revalidate".

### Input Context
- Framework (React, Vue, Solid, Svelte)
- Existing state management library
- API patterns (REST, GraphQL, tRPC)
- Auth / token handling approach

### Output Artifact
Data fetching architecture with query/mutation patterns and caching strategy.

### Response Format
```
## Strategy
<library, cache-key-design, staleTime>

## Query Layer
<query-hooks, pagination, revalidation>

## Mutation Layer
<optimistic-updates, invalidation, error-handling>

## Cache Config
<staleTime, cacheTime, persistence>

—
Compression footer: frontend-data-fetching/v1 | 4 sections | lib: <selected> | cache: <persisted|memory>
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- All server data queries cached with appropriate staleTime
- Mutations invalidate related queries or apply optimistic updates
- Pagination / infinite scroll working with loading states
- Error states handled globally and per-query
- Refetch on focus / reconnect configured

### Max Response Length
4096 tokens

## Workflow

### 1. Library Selection
- **TanStack Query (React Query):** Complex apps with mutations, optimistic updates, pagination, infinite scroll. Rich devtools. Best for: most production apps.
- **SWR:** Lightweight, simple API. Good for: small apps, read-heavy, minimal mutation needs.
- **RTK Query:** Redux ecosystem apps. Tight integration with Redux DevTools. Best for: projects already using Redux.

### 2. Query Patterns
- Stale-while-revalidate: show cached data, refetch in background.
- Cache-first to network: use cache until explicitly invalidated.
- Refetch on window focus configurable per query (default: true).
- Polling for real-time data via `refetchInterval`.
- Dependent queries: enable second query only when first has data.

### 3. Mutations
- Optimistic updates: apply new data immediately, rollback on error.
- Invalidate related queries after mutation success.
- Mutation side effects via callbacks: `onMutate`, `onError`, `onSettled`.
- Show optimistic UI state during mutation.

### 4. Pagination
- Offset-based: `useQuery` with page param, prefetch next page.
- Cursor-based: `useInfiniteQuery` with `getNextPageParam`.
- Infinite scroll: IntersectionObserver triggers `fetchNextPage`.
- Loading states: `isFetchingNextPage` vs `isLoading`.

### 5. Error Handling
- Global error handler via `QueryCache.onError` / `MutationCache.onError`.
- Retry with exponential backoff configurable (default: 3 retries).
- Error boundaries catch unhandled query errors.
- Display stale data when refetch fails — never show blank screen.
- Refetch on reconnect via `refetchOnReconnect: true`.

### 6. Caching Strategy
- `staleTime`: how long data is considered fresh (default 0). Set per query based on update frequency.
- `gcTime` (v5) / `cacheTime` (v4): how long unused data stays in cache (default 5 min).
- Cache key uniquely identifies data — include all params.
- Persist cache to localStorage for offline resilience.

### 7. Query Key Design
```typescript
// Hierarchical key structure
['todos']                          // All todos
['todos', todoId]                  // Single todo
['todos', { status: 'done' }]     // Filtered todos
['todos', todoId, 'comments']       // Comments on a todo
['users', userId, 'posts', postFilters]  // Nested resources
```

## Component Architecture

### Data Flow Decision Tree
```
Is the data from a server?
  No -> Use client state (Zustand, Context, Redux)
  Yes -> Does it need caching/deduplication?
    No -> Plain fetch in useEffect
    Yes -> Is app complex with mutations?
      Yes -> TanStack Query
      No -> SWR

Is the data user-specific?
  Yes -> Include userId in query key
  No -> Global cache key, longer staleTime

Does the data need to update in real-time?
  Yes -> Polling or WebSocket integration
  No -> Stale-while-revalidate
```

## Common Pitfalls

1. **Putting server state in global stores**: Server data in Redux/Zustand duplicates cache and causes sync issues.
2. **Global staleTime of 0**: Zero staleTime means refetch on every mount — wastes bandwidth.
3. **Not handling mutation errors**: On mutation failure, UI shows success state while data is stale.
4. **Missing query key dependencies**: Omitting filter params from keys causes cache collisions.
5. **Infinite queries without getNextPageParam**: Without it, fetchNextPage has no cursor to paginate with.
6. **Retrying on 4xx errors**: Only retry 5xx and network errors; 4xx means client error.
7. **Not canceling query on unmount**: In-flight requests may update state on unmounted component.

## Best Practices

1. Set sensible global defaults (staleTime: 30s, retry: 3, refetchOnWindowFocus: true).
2. Override staleTime per query based on how often data changes.
3. Use structured query keys (array hierarchy) for targeted invalidation.
4. Prefetch next page or detail view on hover for instant UX.
5. Keep query functions pure — same input always produces same output.
6. Invalidate queries after mutations, not after manual delay.
7. Display stale data during refetch — avoid loading spinners for background updates.
8. Use optimistic updates for fast UI but always provide rollback.

## Compared With

| Feature | TanStack Query v5 | SWR | RTK Query |
|---------|-------------------|-----|-----------|
| Bundle size | ~13KB | ~4KB | ~12KB (with Redux) |
| Pagination | useInfiniteQuery | useSWRInfinite | endpoints with pagination |
| Optimistic updates | onMutate + rollback | mutate with revalidate | onQueryStarted |
| Devtools | Rich UI | Basic | Redux DevTools |
| Cache persistence | @tanstack/query-persist-client-key | LocalStorage plugin | Redux persist |
| Framework agnostic | Yes (React, Vue, Solid) | React only | Redux only |

## Performance

1. **Request deduplication**: Identical in-flight queries are merged into one request.
2. **Background refetching**: Data refreshes without blocking UI interaction.
3. **Cache garbage collection**: Unused data is evicted after gcTime.
4. **Window focus refetch**: Automatically keeps data fresh when user returns to tab.
5. **Pagination prefetching**: Load next page data before user scrolls to it.
6. **Selective subscriptions**: Components re-render only when their selected data changes.

## Tooling

1. `@tanstack/react-query-devtools` — visual cache inspector, query toggle, data explorer.
2. `@sentry` integration — capture query failures as breadcrumbs.
3. React Query ESLint plugin — enforce query key naming conventions.
4. `@tanstack/query-sync-storage-persister` — persist cache to localStorage/AsyncStorage.
5. `@tanstack/query-broadcast-client-experimental` — sync cache across tabs.
6. `msw` (Mock Service Worker) — mock API responses for development and testing.
7. `@tanstack/react-query-network-devtools` — inspect network requests for queries.

## Rules

1. Server state is not client state — never put server data in global stores (Redux, Zustand).
2. Cache key must uniquely identify the data (include params, filters).
3. `staleTime` reflects how fresh data needs to be — set per query, not globally.
4. Optimistic updates must always have rollback logic.
5. Error boundaries should catch query errors gracefully (show fallback UI).
6. Prefetch next page / detail views for instant navigation.
7. Retry only on transient errors (network, 5xx) — never on 4xx.
8. Persist cache to localStorage only when offline support is required.
9. Mutations always invalidate related queries on success.
10. Queries never write to server state directly — use mutation hooks.

## References
  - references/data-fetching-caching.md — Data Fetching Caching
  - references/data-fetching-patterns.md — Data Fetching Patterns
  - references/fetching-patterns.md — Fetching Patterns
  - references/react-query-patterns.md — React Query Patterns
  - references/swr-patterns.md — SWR Patterns
  - references/tanstack-query.md — TanStack Query
  - references/data-fetching-caching-strategies.md — Caching Strategies Reference
  - references/data-fetching-error-handling.md — Error Handling Reference

## Handoff
If data fetching requires complex WebSocket sync, optimistic offline queue with conflict resolution, or server-side data hydration beyond basic SSR, flag for senior engineer review. Otherwise implement complete fetching layer.
