# Isomorphic Rendering

## Universal Code Patterns

```typescript
// Code that runs on both server and client
function formatDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale).format(date)
}

// Guard browser-only APIs
function getLocalStorageItem(key: string): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(key)
}

// Guard for hooks (client-only)
function useClientOnly(fn: () => void) {
  useEffect(() => {
    fn()
  }, [])
}
```

## Server/Client Component Boundary

```tsx
// ✅ Server Component (Next.js App Router — default)
// - Can use async/await
// - Cannot use hooks or browser APIs
// - Reduces client bundle
async function ProductList() {
  const products = await db.products.findMany()
  return (
    <ul>
      {products.map(p => (
        <li key={p.id}>
          {p.name} — {p.price}
        </li>
      ))}
    </ul>
  )
}

// ❌ Cannot do this in Server Component:
// useState, useEffect, onClick, window, localStorage

// Client Component — opt in with "use client"
"use client"
function AddToCartButton({ productId }: { productId: string }) {
  const [added, setAdded] = useState(false)

  return (
    <button onClick={() => {
      addToCart(productId)
      setAdded(true)
    }}>
      {added ? 'Added!' : 'Add to Cart'}
    </button>
  )
}
```

## Data Hydration

```typescript
// SSR: Pass serialized data from server to client
// Server
const data = await fetchData()
const serialized = JSON.stringify(data)

res.send(`
  <div id="root">${appHtml}</div>
  <script>window.__INITIAL_DATA__ = ${serialized}</script>
  <script src="/app.js"></script>
`)

// Client
function App() {
  const [data, setData] = useState(window.__INITIAL_DATA__)

  useEffect(() => {
    // Optionally re-fetch after hydration
    if (shouldRevalidate()) {
      fetchData().then(setData)
    }
    // Clear global to prevent memory leak
    delete window.__INITIAL_DATA__
  }, [])

  return <Page data={data} />
}
```

## Hydration Mismatch Prevention

```typescript
// Common causes of hydration mismatch:
// 1. Browser-only data (localStorage, cookies)
// 2. Non-deterministic rendering (Math.random, Date.now)
// 3. Missing provider wrappers
// 4. Different locale/currency formatting

// ✅ Fix: match server and client output
function useClientValue<T>(serverValue: T, clientValue: T): T {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return mounted ? clientValue : serverValue
}

// Usage
function ThemeAware() {
  const prefersDark = useClientValue(false, window.matchMedia('(prefers-color-scheme: dark)').matches)
  return <div data-theme={prefersDark ? 'dark' : 'light'} />
}

// ✅ Fix: suppress hydration warning for benign mismatches
function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null
  return <>{children}</>
}
```

## Cache Synchronization

```typescript
// TanStack Query SSR hydration
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'

// Server
export async function getServerSideProps() {
  const queryClient = new QueryClient()

  await queryClient.prefetchQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
  })

  return {
    props: {
      dehydratedState: dehydrate(queryClient),
    },
  }
}

// Client
function App({ dehydratedState }) {
  return (
    <HydrationBoundary state={dehydratedState}>
      <RouterProvider router={router} />
    </HydrationBoundary>
  )
}
```

## Environment Detection

```typescript
// Determine environment
const isServer = typeof window === 'undefined'
const isClient = !isServer
const isDev = process.env.NODE_ENV === 'development'
const isProd = process.env.NODE_ENV === 'production'

// Conditional imports (dynamic import for browser-only modules)
let storage: Storage
if (isClient) {
  storage = localStorage
} else {
  storage = new Map() as unknown as Storage // server mock
}

// Tree-shake server-only code
// Tools like @preconstruct or package.json exports can help
```

## Framework-Specific Isomorphic Patterns

| Framework | Server | Client | Shared |
|-----------|--------|--------|--------|
| Next.js | Server Components (`.server.tsx`) | Client Components (`.client.tsx`) | Layouts, shared utilities |
| Nuxt | `useAsyncData` in `<script setup>` | `onMounted` | Composables |
| SvelteKit | `+page.server.ts` | `+page.ts` (universal) | `+page.svelte` |
| Remix | `loader` functions | `useLoaderData` | Components |
| Astro | `---` frontmatter (build-time) | `client:*` directives | Components (islands) |

## Isomorphic Rendering Best Practices

| Practice | Reason |
|----------|--------|
| Minimize client component boundaries | Fewer "use client" = smaller JS bundle |
| Push data fetching to server | Direct DB access, no API calls from browser |
| Use Suspense boundaries for streaming | Faster time to first byte |
| Avoid browser APIs in shared components | Prevents hydration mismatch |
| Co-locate server and client components | Easy to reason about boundaries |
| Hydrate critical interactivity first | Better perceived performance |
| Dehydrate and rehydrate query caches | Seamless SSR → client transition |
