# Performance Patterns

## Image Optimization

```html
<!-- Responsive images with srcset -->
<img
  src="hero-400.webp"
  srcset="hero-400.webp 400w, hero-800.webp 800w, hero-1200.webp 1200w"
  sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 800px"
  width="800"
  height="600"
  loading="lazy"
  decoding="async"
  alt="Hero image"
>

<!-- Early LCP image -->
<link rel="preload" href="hero.webp" as="image" fetchpriority="high">
<img src="hero.webp" fetchpriority="high" alt="Hero">
```

## Lazy Loading

```typescript
// Intersection Observer for custom lazy loading
function useLazyLoad(ref: Ref<HTMLElement | null>) {
  const isVisible = ref(false)

  onMounted(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { isVisible.value = true; observer.disconnect() } },
      { rootMargin: '200px' }
    )
    if (ref.value) observer.observe(ref.value)
  })

  return isVisible
}
```

## Virtual Scrolling

```typescript
// Virtual scrolling for large lists
function VirtualList<T>({ items, itemHeight, renderItem }: {
  items: T[]
  itemHeight: number
  renderItem: (item: T, index: number) => ReactNode
}) {
  const [scrollTop, setScrollTop] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const visibleCount = Math.ceil((containerRef.current?.clientHeight ?? 600) / itemHeight)
  const start = Math.floor(scrollTop / itemHeight)
  const visibleItems = items.slice(start, start + visibleCount + 1)

  return (
    <div ref={containerRef} onScroll={() => setScrollTop(containerRef.current!.scrollTop)}>
      <div style={{ height: items.length * itemHeight }}>
        <div style={{ transform: `translateY(${start * itemHeight}px)` }}>
          {visibleItems.map((item, i) => renderItem(item, start + i))}
        </div>
      </div>
    </div>
  )
}
```

## Debounce & Throttle

```typescript
function debounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

function throttle<T extends (...args: any[]) => void>(fn: T, limit: number) {
  let inThrottle = false
  return (...args: Parameters<T>) => {
    if (!inThrottle) { fn(...args); inThrottle = true; setTimeout(() => inThrottle = false, limit) }
  }
}
```

## Font Optimization

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
```

```css
/* font-display: optional prevents layout shift */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter.woff2') format('woff2');
  font-display: optional;
}
```

## Critical CSS

```html
<!-- Inline critical CSS in <head>, load full CSS async -->
<style>
  /* Critical above-the-fold styles */
  header, nav, .hero { ... }
</style>
<link rel="preload" href="/styles/full.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="/styles/full.css"></noscript>
```

## Rendering Patterns

| Pattern | When to Use | Trade-off |
|---------|-------------|-----------|
| SSR | SEO-critical, dynamic content | Server cost, TTFB |
| SSG | Content-heavy, static pages | Build time, stale content |
| ISR | Semi-dynamic, needs freshness | Complexity |
| CSR | Authenticated, app-like pages | SEO, LCP |
| Streaming | Large page with slow data | Complexity |
