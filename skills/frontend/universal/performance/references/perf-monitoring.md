# Performance Monitoring

## Real User Monitoring (RUM)

### Web Vitals Library

```typescript
import { onLCP, onCLS, onINP, onFCP, onTTFB } from 'web-vitals'

function sendToAnalytics(metric: any) {
  const body = {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
  }
  navigator.sendBeacon('/api/vitals', JSON.stringify(body))
}

onLCP(sendToAnalytics)
onCLS(sendToAnalytics)
onINP(sendToAnalytics)
onFCP(sendToAnalytics)
onTTFB(sendToAnalytics)
```

## Core Web Vitals Targets

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| LCP | ≤2.5s | 2.5s–4.0s | >4.0s |
| INP | ≤200ms | 200ms–500ms | >500ms |
| CLS | ≤0.1 | 0.1–0.25 | >0.25 |
| FCP | ≤1.8s | 1.8s–3.0s | >3.0s |
| TTFB | ≤800ms | 800ms–1.8s | >1.8s |

## Performance Monitoring Tools

| Tool | Type | Best For |
|------|------|----------|
| Web Vitals library | Library | RUM collection |
| Lighthouse CI | CI | Lab testing |
| Sentry Performance | APM | Error + performance |
| Datadog RUM | APM | Full observability |
| New Relic Browser | APM | Full observability |
| SpeedCurve | RUM + Lab | Trend analysis |
| Calibre | RUM + Lab | Budget enforcement |

## Lighthouse CI

```yaml
# .github/workflows/lighthouse.yml
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build
      - uses: treosh/lighthouse-ci-action@v10
        with:
          urls: |
            https://staging.example.com/
            https://staging.example.com/products
          budgetPath: ./lighthouse-budget.json
          uploadArtifacts: true
```

```json
{
  "performance": 90,
  "accessibility": 90,
  "best-practices": 90,
  "seo": 90,
  "pwa": 50
}
```

## Custom Performance Marks

```typescript
// Measure specific operations
performance.mark('fetch-start')
await fetch('/api/data')
performance.mark('fetch-end')
performance.measure('data-fetch', 'fetch-start', 'fetch-end')

const entries = performance.getEntriesByType('measure')
entries.forEach(entry => {
  console.log(`${entry.name}: ${entry.duration}ms`)
})
```

## Long Task Monitoring

```typescript
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.duration > 50) {
      console.warn(`Long task: ${entry.duration}ms`, entry.attribution)
    }
  }
})
observer.observe({ type: 'longtask', buffered: true })
```

## Performance Budget Enforcement

```json
// budgets.json
{
  "resourceSizes": [
    { "resourceType": "script", "budget": 200 },
    { "resourceType": "stylesheet", "budget": 50 },
    { "resourceType": "image", "budget": 100 }
  ],
  "timings": [
    { "metric": "interactive", "budget": 5000 },
    { "metric": "first-meaningful-paint", "budget": 2000 }
  ]
}
```
