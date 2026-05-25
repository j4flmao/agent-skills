# Qwik Optimization Patterns

## Prefetch Strategy

```tsx
// src/root.tsx — enable service worker prefetching
import { PrefetchServiceWorker } from '@builder.io/qwik/prefetch-service-worker'

export default component$(() => {
  return (
    <html>
      <head>
        <PrefetchServiceWorker />
      </head>
      <body><Slot /></body>
    </html>
  )
})
```

PrefetchServiceWorker automatically:
- Preloads QRL chunks for visible links
- Uses service worker to cache bundles
- Enables instant navigation without waterfall

## Bundle Optimization

```tsx
// ❌ Avoid: Too much in one component
export default component$(() => {
  const [data, setData] = useSignal(null)
  const [analytics, setAnalytics] = useSignal(null)
  // Heavy logic in render
  return <div>...</div>
})

// ✅ Better: Split into smaller lazy boundaries
export default component$(() => {
  return (
    <div>
      <DataPanel />    {/* separate lazy chunk */}
      <AnalyticsPanel /> {/* separate lazy chunk */}
    </div>
  )
})
```

## useVisibleTask$ Guidelines

```tsx
// ✅ OK: Client-only task (analytics, intersection observer)
useVisibleTask$(() => {
  const observer = new IntersectionObserver(() => {})
  observer.observe(element.value!)
})

// ❌ Wrong: Data fetching in visibleTask
useVisibleTask$(async () => {
  const data = await fetch('/api/data')  // Use routeLoader$ instead
})

// ✅ Right: Data via route loader
export const useData = routeLoader$(async () => {
  return await fetch('/api/data').then(r => r.json())
})
```

| When to use `useVisibleTask$` | When NOT to use it |
|------------------------------|-------------------|
| Browser-only APIs | Data fetching |
| Analytics tracking | Form submissions |
| DOM measurements | Authentication |
| Third-party widget init | State initialization |
| Intersection observers | Route transitions |

## Image Optimization

```tsx
import { Image } from '@unpic/qwik'

export default component$(() => {
  return (
    <Image
      src="/hero.jpg"
      layout="fullWidth"
      width={1200}
      height={600}
      alt="Hero"
      priority
    />
  )
})
```

## Code Splitting Tips

| Strategy | Implementation |
|----------|---------------|
| Route splitting | Automatic via Qwik City |
| Component splitting | Each `component$()` is a separate chunk |
| Event splitting | Each `onClick$` etc. is separate |
| Lazy import | `const Chart = lazy$(() => import('./chart'))` |
| Inline critical | Keep minimal code outside `$()` |
| Defer non-critical | `useVisibleTask$` for non-critical work |

## Performance Budget

| Metric | Target |
|--------|--------|
| Initial JS | <10kB |
| First interaction | <50ms |
| LCP | <2s |
| TTI | <1s |
| Bundle per handler | <2kB |

## Progressive Loading

```tsx
export default component$(() => {
  const visible = useSignal(false)

  return (
    <div>
      <button onClick$={() => visible.value = true}>Show Chart</button>
      {visible.value && <HeavyChart />}
    </div>
  )
})
```

When `HeavyChart` renders, only then is its component$ chunk fetched and executed.
