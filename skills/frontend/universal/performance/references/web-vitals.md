# Core Web Vitals

## Targets

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| LCP | < 2.5s | 2.5s - 4.0s | > 4.0s |
| INP | < 200ms | 200ms - 500ms | > 500ms |
| CLS | < 0.1 | 0.1 - 0.25 | > 0.25 |

## LCP (Largest Contentful Paint)
- Largest visible element (image, text block, video)
- **Optimize**: preload hero images, optimize images, minimize render-blocking resources

```html
<link rel="preload" as="image" href="/hero.webp">
```

## INP (Interaction to Next Paint)
- Response time of all user interactions (click, tap, keypress)
- **Optimize**: debounce handlers, avoid long tasks, use `requestAnimationFrame`

```typescript
// Avoid long tasks — break up work
function processItems(items: Item[]) {
  let i = 0
  function chunk() {
    while (i < items.length && performance.now() % 50 < 45) {
      processItem(items[i])
      i++
    }
    if (i < items.length) requestAnimationFrame(chunk)
  }
  requestAnimationFrame(chunk)
}
```

## CLS (Cumulative Layout Shift)
- Unexpected layout shifts during page load
- **Optimize**: set width/height on images, avoid injecting content above existing content

```typescript
// Always set dimensions
<img src="/hero.webp" width="1200" height="600" alt="" />

// Reserve space for dynamic content
<div style={{ minHeight: 200 }}>
  {content && <ExpensiveComponent />}
</div>
```

## Monitoring
```typescript
import { onLCP, onINP, onCLS } from 'web-vitals'

onLCP((metric) => console.log('LCP:', metric.value))
onINP((metric) => console.log('INP:', metric.value))
onCLS((metric) => console.log('CLS:', metric.value))
```
