# Rendering Performance

## Purpose

Rendering performance covers how quickly and smoothly the browser paints UI in response to data changes. This includes choosing the right rendering strategy (CSR vs SSR vs SSG vs ISR), optimizing hydration, virtualizing large lists, using memoization effectively, profiling render performance, and preventing layout thrashing.

## Rendering Patterns

### CSR (Client-Side Rendering)

```typescript
// Browser loads empty HTML shell, JS renders everything
// Best for: authenticated dashboards, interactive apps with frequent updates
// Trade-off: Slow initial load, fast subsequent navigation
function App() {
  const [data, setData] = useState(null)

  useEffect(() => {
    fetch('/api/data').then(r => r.json()).then(setData)
  }, [])

  if (!data) return <Spinner />
  return <Dashboard data={data} />
}
```

### SSR (Server-Side Rendering)

```typescript
// Next.js — pages router
export async function getServerSideProps(context) {
  const data = await fetchData(context.params.id)
  return { props: { data } }
}

// Server renders HTML, browser hydrates on load
// Best for: SEO-critical pages, pages with dynamic per-request data
// Trade-off: Slower TTFB but faster LCP/FCP
```

### SSG (Static Site Generation)

```typescript
// Next.js — generate at build time
export async function getStaticProps() {
  const data = await fetchData()
  return { props: { data }, revalidate: 3600 } // ISR
}

export async function getStaticPaths() {
  const posts = await fetchPostSlugs()
  return {
    paths: posts.map(p => ({ params: { slug: p.slug } })),
    fallback: 'blocking',
  }
}

// Pre-rendered HTML served from CDN
// Best for: content pages, blogs, marketing sites
// Trade-off: Stale data between rebuilds
```

### ISR (Incremental Static Regeneration)

```typescript
// Next.js — stale-while-revalidate at the page level
export async function getStaticProps() {
  const data = await fetchData()
  return {
    props: { data },
    revalidate: 60, // Regenerate in background every 60s
  }
}

// On-demand ISR (Next.js 12.1+)
export default async function handler(req, res) {
  await res.revalidate('/products')
  res.json({ revalidated: true })
}
```

### Rendering Strategy Decision Matrix

| Criterion | CSR | SSR | SSG | ISR |
|-----------|-----|-----|-----|-----|
| SEO | Poor | Good | Great | Great |
| First load speed | Slow | Medium | Fast | Fast |
| Data freshness | Always fresh | Always fresh | Stale | Near-fresh |
| Server cost | Low | High | Low | Medium |
| TTFB | Fast | Slow | Fast | Fast |
| Use case | Dashboard | Product pages | Blog | E-commerce |

## Hydration Optimization

### Selective Hydration (React 18+)

```typescript
import { lazy, Suspense } from 'react'
import { hydrateRoot } from 'react-dom/client'

// Non-critical components hydrate after the main app
const Comments = lazy(() => import('./Comments'))
const RelatedProducts = lazy(() => import('./RelatedProducts'))

function ProductPage({ product }) {
  return (
    <div>
      <ProductDetails product={product} />           {/* Hydrated first */}
      <Suspense fallback={<CommentsSkeleton />}>
        <Comments productId={product.id} />           {/* Hydrated later */}
      </Suspense>
    </div>
  )
}
```

### Progressive Hydration (Qwik)

Qwik resumes JavaScript only when the user interacts with a component — the page starts as pure HTML/CSS with no hydration cost.

```tsx
// Qwik — lazy-load component only on interaction
export default component$(() => {
  return (
    <button onClick$={async () => {
      // This code never loads until user clicks
      const { doSomething } = await import('./heavy-logic')
      doSomething()
    }}>
      Click me
    </button>
  )
})
```

### Islands Architecture (Astro)

Astro renders static HTML and hydrates only interactive "islands" on the page.

```astro
---
// Astro component — most of the page is static HTML
import StaticHeader from '../components/StaticHeader.astro'
import InteractiveCart from '../components/InteractiveCart.tsx'
---

<StaticHeader />
<InteractiveCart client:load />  <!-- Hydrated on page load -->
<InteractiveReviews client:visible />  <!-- Hydrated when scrolled into view -->
```

## Virtualization

### When to Virtualize

Virtualization renders only the visible items in a long list — typically when you have 100+ items displayed at once or when DOM node count exceeds 2000.

### react-window

```typescript
import { FixedSizeList as List } from 'react-window'
import AutoSizer from 'react-virtualized-auto-sizer'

function UserList({ users }: { users: User[] }) {
  return (
    <AutoSizer>
      {({ height, width }) => (
        <List
          height={height}
          itemCount={users.length}
          itemSize={72}  // Fixed row height (px)
          width={width}
          overscanCount={5}  // Extra items rendered above/below viewport
        >
          {({ index, style }) => (
            <div style={style}>
              <UserRow user={users[index]} />
            </div>
          )}
        </List>
      )}
    </AutoSizer>
  )
}
```

### Variable Height Rows

```typescript
import { VariableSizeList as List } from 'react-window'

function Feed({ posts }: { posts: Post[] }) {
  const listRef = useRef<List>(null)
  const sizeMap = useRef<Map<number, number>>(new Map())

  const getItemSize = (index: number) => {
    return sizeMap.current.get(index) ?? 150  // Default height
  }

  const setItemSize = (index: number, size: number) => {
    sizeMap.current.set(index, size)
    listRef.current?.resetAfterIndex(index)
  }

  return (
    <List
      ref={listRef}
      itemCount={posts.length}
      itemSize={getItemSize}
      height={800}
      width="100%"
    >
      {({ index, style }) => (
        <PostItem
          post={posts[index]}
          style={style}
          onHeightChange={(h) => setItemSize(index, h)}
        />
      )}
    </List>
  )
}
```

### TanStack Virtual

```typescript
import { useVirtualizer } from '@tanstack/react-virtual'

function VirtualTable({ rows, columns }) {
  const parentRef = useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,  // Estimated row height
    overscan: 10,
  })

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
        {rowVirtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <Row row={rows[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  )
}
```

## Memoization Strategies

### React.memo

```typescript
// Only re-renders when props change (shallow comparison)
const UserRow = React.memo(function UserRow({ user, onSelect }: Props) {
  return (
    <div onClick={() => onSelect(user.id)}>
      {user.name} — {user.email}
    </div>
  )
})

// Custom comparison function
const ExpensiveChart = React.memo(
  function ExpensiveChart({ data }: { data: DataPoint[] }) {
    return <Chart series={data} />
  },
  (prevProps, nextProps) => {
    // Only re-render if data actually changed
    return prevProps.data.length === nextProps.data.length
      && prevProps.data[0]?.value === nextProps.data[0]?.value
  }
)
```

### useMemo

```typescript
function OrderSummary({ items, taxRate }: Props) {
  // Expensive computation — only recalculated when dependencies change
  const totals = useMemo(() => {
    return items.reduce(
      (acc, item) => ({
        subtotal: acc.subtotal + item.price * item.quantity,
        count: acc.count + item.quantity,
        weight: acc.weight + (item.weight ?? 0) * item.quantity,
      }),
      { subtotal: 0, count: 0, weight: 0 }
    )
  }, [items])

  const tax = useMemo(() => totals.subtotal * taxRate, [totals.subtotal, taxRate])

  return (
    <div>
      <p>Items: {totals.count}</p>
      <p>Subtotal: ${totals.subtotal.toFixed(2)}</p>
      <p>Tax: ${tax.toFixed(2)}</p>
    </div>
  )
}
```

### useCallback

```typescript
function UserList({ users }: { users: User[] }) {
  // Stable callback reference — prevents re-renders of memoized children
  const handleSelect = useCallback((userId: string) => {
    analytics.track('user_selected', { userId })
  }, [])

  return (
    <div>
      {users.map(user => (
        <UserRow key={user.id} user={user} onSelect={handleSelect} />
      ))}
    </div>
  )
}
```

## UseMemo / useCallback Profiling

### When to Use Memoization

```
Is the computation expensive (>1ms)?
  YES → useMemo
  NO  → Is the value used as a dependency for other hooks?
    YES → useMemo (prevents cascading re-computations)
    NO  → Is the component re-rendering due to parent?
      YES → Is the value passed to memoized child?
        YES → useMemo / useCallback
        NO  → Don't memoize (overhead > benefit)
```

### Profiling with why-did-you-render

```typescript
// Install: npm install @welldone-software/why-did-you-render
import whyDidYouRender from '@welldone-software/why-did-you-render'

if (process.env.NODE_ENV === 'development') {
  whyDidYouRender(React, {
    trackAllPureComponents: true,
    trackHooks: true,
    logOnDifferentValues: true,
  })
}

// Mark component for tracking
UserRow.whyDidYouRender = true
```

### React DevTools Profiler

- Record an interaction (e.g., typing in a search box)
- Look for components that re-rendered unnecessarily
- Check render duration — components taking >1ms may need optimization
- Flamegraph view shows which components re-rendered and why

## List Rendering Optimization

### Key Management

```typescript
// BAD — using index as key (causes incorrect state preservation)
{items.map((item, index) => <ListItem key={index} item={item} />)}

// GOOD — using stable unique ID
{items.map(item => <ListItem key={item.id} item={item} />)}

// ACCEPTABLE — using a combination when no stable ID exists
{items.map((item, index) => (
  <ListItem key={`${item.type}-${index}`} item={item} />
))}
```

### Windowing Patterns

```typescript
// Windowed list with infinite scroll
function InfiniteUserList() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteUsers()
  const allUsers = data?.pages.flatMap(p => p.users) ?? []

  const parentRef = useRef<HTMLDivElement>(null)
  const rowVirtualizer = useVirtualizer({
    count: allUsers.length + (hasNextPage ? 1 : 0),
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 5,
  })

  // Load more when approaching the end of the list
  useEffect(() => {
    const lastItem = rowVirtualizer.getVirtualItems().at(-1)
    if (lastItem && lastItem.index >= allUsers.length - 5 && hasNextPage) {
      fetchNextPage()
    }
  }, [rowVirtualizer.getVirtualItems(), allUsers.length, hasNextPage, fetchNextPage])

  return (
    <div ref={parentRef} style={{ height: '100%', overflow: 'auto' }}>
      <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
        {rowVirtualizer.getVirtualItems().map(virtualRow => (
          <div key={virtualRow.index} style={{
            position: 'absolute', top: 0, left: 0, width: '100%',
            height: `${virtualRow.size}px`,
            transform: `translateY(${virtualRow.start}px)`,
          }}>
            {virtualRow.index < allUsers.length ? (
              <UserRow user={allUsers[virtualRow.index]} />
            ) : (
              <LoadingIndicator />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
```

## Layout Thrashing Prevention

### What is Layout Thrashing

Layout thrashing occurs when JavaScript reads layout properties (offsetTop, clientHeight, getBoundingClientRect) after writing to the DOM, forcing the browser to synchronously recalculate layout. This is the #1 cause of jank.

### Batch DOM Reads and Writes

```typescript
// BAD — causes layout thrashing
function badAnimation(elements: HTMLElement[]) {
  elements.forEach(el => {
    el.style.width = '100px'          // Write
    const height = el.offsetHeight    // Read — forces recalc!
    el.style.height = `${height}px`   // Write — forces recalc!
  })
}

// GOOD — batch reads first, then writes
function goodAnimation(elements: HTMLElement[]) {
  const heights = elements.map(el => el.offsetHeight)  // Read all
  elements.forEach((el, i) => {
    el.style.width = '100px'                            // Write all
    el.style.height = `${heights[i]}px`                 // Write all
  })
}
```

### requestAnimationFrame Batching

```typescript
// Use rAF to batch layout reads
function measureElements(elements: HTMLElement[]): Promise<Rect[]> {
  return new Promise(resolve => {
    requestAnimationFrame(() => {
      const rects = elements.map(el => el.getBoundingClientRect())
      resolve(rects)
    })
  })
}
```

### FastDOM Library

```typescript
// fastdom batches all reads and writes across the application
import fastdom from 'fastdom'

fastdom.measure(() => {
  const height = element.offsetHeight
  fastdom.mutate(() => {
    otherElement.style.height = `${height}px`
  })
})
```

### CSS Containment

```css
/* Limit the scope of layout recalculations */
.widget {
  contain: layout style paint;
  /* Tells browser: changes inside .widget don't affect outside */
}

/* For virtualized items */
.virtual-item {
  contain: strict;
  /* Maximum isolation — ideal for virtual list items */
}
```

## Paint / TILE Metrics

### Avoiding Expensive Paint Operations

```css
/* BAD — triggers repaint on scroll */
.parallax {
  transform: translateZ(0); /* Old GPU hacks */
}

/* GOOD — compositor-only properties */
.element {
  transform: translateX(100px);
  opacity: 0.5;
}
/* transform and opacity are composited on GPU — no paint needed */
```

### will-change

```css
/* Use sparingly — only for elements that will animate */
.animated-element {
  will-change: transform, opacity;
  /* Creates a new compositor layer */
  /* CAREFUL: too many layers = GPU memory pressure */
}
```

### Layer Creation Best Practices

- Use `will-change` only on elements that will animate
- Promote scrollable areas to their own layer
- Avoid creating layers for every list item
- Use GPU timeline in DevTools to verify layer counts
- Target: <50 layers on desktop, <20 on mobile

## Key Points

- Choose CSR for interactive apps, SSR for dynamic content, SSG/ISR for content pages.
- Hydration is expensive — use selective hydration, progressive hydration (Qwik), or islands (Astro).
- Virtualize lists with 100+ items using react-window or TanStack Virtual.
- Memoize expensive computations with useMemo and stable callbacks with useCallback.
- Profile before memoizing — unnecessary memoization adds overhead without benefit.
- Use stable keys (not indexes) for lists to preserve state and minimize re-renders.
- Batch DOM reads before writes to prevent layout thrashing (measure then mutate).
- Use compositor-only properties (transform, opacity) for animations — avoid layout-triggering properties.
- Apply CSS containment (`contain: layout style paint`) to isolate rendering scopes.
- Measure with React DevTools Profiler, why-did-you-render, and browser Performance panel.
