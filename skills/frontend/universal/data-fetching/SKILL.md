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

**Description:** Implements client-side data fetching with caching, pagination, mutations, and optimistic updates. Triggered by "data fetching", "TanStack Query", "SWR", "React Query", "server state", "API client", "data fetching pattern", "cache invalidation", "optimistic update", "pagination data", "infinite scroll", "stale-while-revalidate".

**Version:** 1.0.0
**Author:** j4flmao
**License:** MIT

---

## Purpose

Manage server state efficiently on the client — eliminating boilerplate, providing caching, deduplication, background refetching, and optimistic mutations while keeping server state out of global client stores.

---

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

---

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

---

## Rules

1. Server state is not client state — never put server data in global stores (Redux, Zustand).
2. Cache key must uniquely identify the data (include params, filters).
3. `staleTime` reflects how fresh data needs to be — set per query, not globally.
4. Optimistic updates must always have rollback logic.
5. Error boundaries should catch query errors gracefully (show fallback UI).
6. Prefetch next page / detail views for instant navigation.
7. Retry only on transient errors (network, 5xx) — never on 4xx.
8. Persist cache to localStorage only when offline support is required.

---

## References

- `references/tanstack-query.md` — Queries, mutations, cache, pagination, SSR
- `references/fetching-patterns.md` — SWR, RTK Query, race conditions, request dedup, retry

---

## Handoff

If data fetching requires complex WebSocket sync, optimistic offline queue with conflict resolution, or server-side data hydration beyond basic SSR, flag for senior engineer review. Otherwise implement complete fetching layer.
