---
name: frontend-performance
description: >
  Use this skill when the user says 'performance', 'slow page', 'bundle size', 'lazy loading', 'code splitting', 'LCP', 'CLS', 'INP', 'web vitals', 'image optimization', 'caching strategy', or when optimizing frontend performance. This skill enforces: measure-first optimization, Core Web Vitals targets (LCP <2.5s, CLS <0.1, INP <200ms), code splitting by route, image optimization (WebP/AVIF, srcset, dimensions), and caching with stale-while-revalidate. Works with any frontend framework. Do NOT use for: backend performance, database optimization, or infrastructure tuning.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, performance, phase-3, universal]
---

# Frontend Performance

## Purpose
Optimize Core Web Vitals (LCP, CLS, INP) and bundle size. Measure before and after every optimization. Never optimize without data.

## Agent Protocol

### Trigger
Exact user phrases: "performance", "slow page", "bundle size", "lazy loading", "code splitting", "LCP", "CLS", "INP", "web vitals", "image optimization", "caching", "page speed", "load time".

### Input Context
Before activating, verify:
- The performance issue is identified (slow page load, janky interaction, large bundle) or ask.
- The framework is known (React, Vue, Angular, Next.js, Nuxt).
- Whether the target is lab metrics (Lighthouse) or field metrics (RUM data).

### Output Artifact
No file output. Produces optimization recommendations as text.

### Response Format
```
Metric: {LCP/CLS/INP/bundle}
Current: {measured value}
Target: {target value}
Root cause: {specific cause}
Fix: {specific change with code}
Expected improvement: {estimated factor}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Metric measured before optimization (Lighthouse, Web Vitals, or bundle analysis).
- [ ] Root cause identified from the measurement data.
- [ ] Specific fix provided with code example.
- [ ] Performance budget defined.
- [ ] One optimization at a time with before/after measurement.

### Max Response Length
Per optimization: 10 lines. Code example: 8 lines.

## Performance Architecture / Decision Trees

### Optimization Priority Decision Tree
```
Measure Core Web Vitals first.
  |-- LCP > 2.5s? -->
  |     Priority 1: Optimize LCP
  |     |-- Preload hero image <link rel="preload">
  |     |-- Optimize images: AVIF/WebP, resize, compress
  |     |-- SSR/SSG critical content
  |     |-- Remove render-blocking resources
  |     |-- Improve TTFB (CDN, server optimization)
  |
  |-- CLS > 0.1? -->
  |     Priority 2: Optimize CLS
  |     |-- Set width/height on all images and embeds
  |     |-- Use aspect-ratio CSS
  |     |-- Reserve space for dynamic content (ads, embeds)
  |     |-- Use font-display: optional
  |
  |-- INP > 200ms? -->
  |     Priority 3: Optimize INP
  |     |-- Break long tasks (<50ms chunks)
  |     |-- Debounce/throttle input handlers
  |     |-- Web Workers for heavy computation
  |     |-- Virtual scrolling for long lists
  |
  |-- Bundle size > 200KB JS (compressed)? -->
        Priority 4: Bundle optimization
        |-- Route-level code splitting
        |-- Dynamic imports for heavy libs
        |-- Remove dead code (tree shaking)
```

### Image vs JS vs Font Decision Tree
```
What is the heaviest page resource?
  |-- Images (typical: 60-80% of page weight) -->
  |     Quick wins: AVIF/WebP, resize to display size, lazy load below-fold
  |     Tools: sharp, squoosh, image CDN
  |
  |-- JavaScript (typical: 15-25% of page weight) -->
  |     Quick wins: code splitting, tree shaking, dynamic imports
  |     Tools: webpack-bundle-analyzer, source-map-explorer
  |
  |-- Fonts (typical: 5-10% of page weight) -->
  |     Quick wins: subset fonts, self-host, font-display: optional
  |     Tools: glyphhanger, fonttools
  |
  |-- Third-party scripts (typical: 5-15% load time) -->
        Quick wins: defer, async, lazy-load after interaction
        Tools: Request Map, webpagetest
```

---

## Workflow

### Step 1: Measure
| Tool | What It Measures |
|------|-----------------|
| Lighthouse | Lab: LCP, CLS, INP, TBT, SI |
| Web Vitals library | Field: real user metrics |
| Chrome DevTools Performance | JS profiling, long tasks, layout thrashing |
| source-map-explorer / bundle-analyzer | Bundle composition |
| WebPageTest | Multi-location waterfall |

Never optimize without measurement. Intuition about what is slow is wrong more than 50% of the time.

### Step 2: Optimize LCP
Target: <2.5s

| Technique | How |
|-----------|-----|
| Preload hero/LCP image | `<link rel="preload" href="hero.webp" as="image" fetchpriority="high">` |
| Optimize images | WebP/AVIF format, responsive srcset, compress to <100KB |
| SSR/SSG critical content | First paint includes meaningful content |
| Remove render-blocking resources | Inline critical CSS, defer non-critical JS |
| Good TTFB | CDN, server-side optimization, early hints |

### Step 3: Optimize CLS
Target: <0.1

| Technique | How |
|-----------|-----|
| Set media dimensions | Always include width and height attributes |
| Reserve layout space | min-height for dynamic content containers |
| aspect-ratio CSS | Prevent layout shift from images/videos |
| font-display: optional | Prevent invisible text flash and layout shift |
| Stable placeholders | Ads, embeds, and late-injected content get reserved space |

### Step 4: Optimize INP
Target: <200ms

| Technique | How |
|-----------|-----|
| Break long tasks | Split work into chunks under 50ms |
| requestIdleCallback | Defer analytics, logging, non-critical work |
| Web Workers | Heavy computation (parsing, formatting) off main thread |
| Debounce/throttle | Rate-limit scroll, resize, input handlers |
| Virtual scrolling | Render only visible rows in long lists |

### Step 5: Bundle Optimization
```javascript
// Route-level code splitting
const UserDashboard = lazy(() => import('./pages/UserDashboard'))
const AdminPanel = lazy(() => import('./pages/AdminPanel'))

// Interaction-triggered dynamic import
async function handleExport() {
  const { generatePDF } = await import('./utils/pdf-generator')
  generatePDF(data)
}
```

Bundle budget:
- Initial JS: <200KB (compressed)
- Initial CSS: <50KB (compressed)
- Largest image: <100KB
- Total page weight: <1MB

### Step 6: Long Task Profiling
```typescript
// Measure long tasks in the field
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    // Report any task > 50ms
    if (entry.duration > 50) {
      reportLongTask({
        duration: entry.duration,
        startTime: entry.startTime,
        attribution: entry.attribution,
      })
    }
  }
})

observer.observe({ type: 'longtask', buffered: true })
```

### Step 7: Rendering Performance
```typescript
// Avoid layout thrashing -- batch reads and writes
// BAD -- interleaved reads/writes
element.style.width = `${container.clientWidth}px`   // write
const height = element.clientHeight                  // write -> read forces layout
element.style.height = `${height * 2}px`             // read -> write forces layout

// GOOD -- batch reads first, then writes
const width = container.clientWidth                  // read
const height = element.clientHeight                  // read
element.style.width = `${width}px`                    // write
element.style.height = `${height * 2}px`              // write
```

### Step 8: Resource Hints
```html
<!-- Preload critical resources -->
<link rel="preload" href="/fonts/inter.woff2" as="font" crossorigin />
<link rel="preload" href="/hero.avif" as="image" fetchpriority="high" />

<!-- Preconnect to critical origins -->
<link rel="preconnect" href="https://api.example.com" />
<link rel="preconnect" href="https://images.example.com" />

<!-- Prefetch predicted next page -->
<link rel="prefetch" href="/checkout" as="document" />

<!-- Prerender predicted navigation (Next.js, heavy) -->
<link rel="prerender" href="/product/123" />
```

## Common Pitfalls

### 1. Optimizing Without Measurement
```typescript
// BAD -- guessing at performance issues
"I think the bundle is slow because of lodash"

// GOOD -- verify with data
const bundleAnalysis = await analyzeBundle()
// → lodash is 5KB, but moment.js is 200KB
```

### 2. Preloading Everything
Preloading too many resources negates the benefit. Preload only the LCP candidate. Everything else should use normal discovery or prefetch.

### 3. Lazy Loading the LCP Component
```typescript
// BAD -- LCP image is lazy-loaded (delays LCP by 1-3s)
const Hero = lazy(() => import('./Hero'))

// GOOD -- LCP content is eagerly loaded
import { Hero } from './Hero'
```

### 4. Ignoring Third-Party Script Impact
A single third-party tag can add 1-3s to load time. Audit every third-party script. Defer non-critical ones. Load analytics after user interaction.

### 5. Not Setting Performance Budgets
Without a budget, performance regressions sneak in. Enforce budgets in CI with tools like Lighthouse CI or bundlesize.

## Compared With

| Rendering Strategy | LCP | CLS | Bundle Size | Use Case |
|---|---|---|---|---|
| Static (SSG) | Excellent | Excellent | Small | Content sites, docs |
| Server-side (SSR) | Good | Good | Moderate | SEO-critical, dynamic |
| Client-side (CSR) | Poor (empty shell) | Good | Large | Dashboard, admin |
| Incremental (ISR) | Excellent | Excellent | Moderate | E-commerce, blog |
| Streaming SSR | Excellent | Good | Moderate | Real-time content |

## Performance Considerations

### Resource Priority
| Resource | Priority | Hint |
|----------|----------|------|
| LCP image | Highest | `<link rel="preload">` + `fetchpriority="high"` |
| Above-fold CSS | Highest | Inline critical CSS |
| Hero fonts | High | `<link rel="preload">` with `crossorigin` |
| Above-fold JS | Medium | `<script defer>` or module |
| Below-fold images | Low | `loading="lazy"` |
| Analytics | Lowest | Load after onload or after user interaction |
| Chat widgets | Lowest | Load after user interaction |

### Performance Budget Enforcement
```json
{
  "performance-budget": {
    "initial-js": 200000,      // 200KB compressed
    "initial-css": 50000,      // 50KB compressed
    "largest-image": 100000,   // 100KB
    "total-page-weight": 1000000, // 1MB
    "lcp": 2500,               // 2.5s
    "cls": 0.1,
    "inp": 200                 // 200ms
  }
}
```

## Image Optimization Deep Dive

```typescript
// Next.js Image component — automatic optimization
import Image from 'next/image';

<Image
  src="/hero.webp"
  alt="Hero"
  width={1200}
  height={630}
  priority // preload LCP image
  sizes="(max-width: 768px) 100vw, 1200px"
  quality={85}
  placeholder="blur" // blur-up placeholder from base64
  blurDataURL="data:image/webp;base64,..."
/>

// Manual responsive images with srcset
<img
  src="hero-1200.webp"
  srcSet="hero-400.webp 400w, hero-800.webp 800w, hero-1200.webp 1200w"
  sizes="(max-width: 768px) 100vw, 1200px"
  loading="lazy"
  decoding="async"
  alt="Hero image"
/>

// Image CDN integration (Imgix, Cloudinary, ImageKit)
// URL-based transformations:
// https://your-company.imgix.net/hero.jpg?w=800&h=400&fit=crop&auto=format,compress
// Benefits: automatic format negotiation (WebP/AVIF), resizing, compression
// No build-time processing needed — transformation happens at request time
```

## Bundle Analysis and Optimization

```bash
# Analyze bundle composition
npx source-map-explorer dist/assets/*.js
npx webpack-bundle-analyzer dist/stats.json
npx vite-bundle-visualizer

# Common bundle bloat culprits:
# - moment.js (250KB) → date-fns (15KB) or Temporal API
# - lodash (75KB) → lodash-es for tree-shaking or native methods
# - Three.js (500KB) → only if actually using 3D
# - Chart.js (100KB) → lightweight alternatives: uPlot (30KB), Chart.js with tree-shaking
# - Axios (12KB) → native fetch (0KB) for simple cases
```

## Core Web Vitals Field Monitoring

```typescript
// Real User Monitoring (RUM) with Web Vitals library
import { onCLS, onFCP, onLCP, onINP, onTTFB } from 'web-vitals';

function sendToAnalytics(metric: any) {
  // Send to your analytics provider
  navigator.sendBeacon('/api/vitals', JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating, // 'good' | 'needs-improvement' | 'poor'
    delta: metric.delta,
    id: metric.id, // unique ID for deduplication
    navigationType: metric.navigationType, // 'navigate' | 'reload' | 'back-forward' | 'prerender'
  }));
}

// Measure each vital
onLCP(sendToAnalytics);
onCLS(sendToAnalytics);
onINP(sendToAnalytics);
onFCP(sendToAnalytics);
onTTFB(sendToAnalytics);

// Dashboard queries:
// - % of pages with LCP < 2.5s (by device, country, route)
// - P95 of CLS across all pages
// - Regression detection: compare last 7 days vs previous 7 days
```

## Long Task Detection and Optimization

```typescript
// Detect long tasks in production
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    // Tasks > 50ms block user interactions
    if (entry.duration > 50) {
      console.warn('Long task detected:', {
        duration: entry.duration,
        startTime: entry.startTime,
        attribution: entry.attribution?.map(a => ({
          name: a.name,
          containerType: a.containerType,
          containerName: a.containerName,
        })),
      });
    }
  }
});
observer.observe({ type: 'longtask', buffered: true });

// Fix: yield to main thread periodically
async function processItems<T>(items: T[], processor: (item: T) => void) {
  let i = 0;

  function processBatch() {
    const start = performance.now();
    while (i < items.length && performance.now() - start < 10) {
      processor(items[i]);
      i++;
    }
    if (i < items.length) {
      // Yield to browser to handle interactions, paint, etc.
      requestAnimationFrame(processBatch);
    }
  }

  processBatch();
}
```

## Performance CI/CD Integration

```yaml
# .github/workflows/performance.yml
name: Performance Budget
on: [pull_request]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci && npm run build
      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v10
        with:
          urls: |
            https://staging.example.com/
            https://staging.example.com/product/123
          uploadArtifacts: true
          temporaryPublicStorage: true
          configPath: './lighthouserc.json'
      - name: Assert budgets
        run: npx lhci assert

# lighthouserc.json
{
  "ci": {
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "interaction-to-next-paint": ["error", { "maxNumericValue": 200 }],
        "total-blocking-time": ["warn", { "maxNumericValue": 300 }],
        "unused-javascript": ["warn", { "maxNumericValue": 0 }]
      }
    }
  }
}
```

## Accessibility Considerations

- `prefers-reduced-motion`: Disable animations, transitions, and parallax for users who request reduced motion
- Loading spinners must have `aria-label` or `role="status"`
- Content hidden during lazy loading must be announced when revealed
- Font optimization (`font-display: optional`) should not hide content from screen readers
- Fast LCP benefits screen reader users (content available sooner)
- Low CLS prevents screen reader focus from jumping unexpectedly
- Fast INP means interactive elements respond immediately to keyboard/switch input

## Security Considerations

- Preload/prefetch can leak information about upcoming navigation (use only for public resources)
- Third-party scripts loaded for performance (CDN) are also a security vector — use SRI
- Resource hints can cause double-fetching if not properly implemented
- Performance measurement APIs (PerformanceObserver) have cross-origin restrictions — use the `Timing-Allow-Origin` header
- Web Vitals data sent to analytics must not contain PII

## Rules
- Measure before and after every optimization. One change at a time.
- Core Web Vitals are field metrics. Lab tests (Lighthouse) are proxies, not truth.
- Preload only the LCP candidate resource. Preloading everything negates the benefit.
- Route-level code splitting is mandatory. Component-level is optional.
- Set a performance budget before starting. Enforce it in CI.
- Images are the #1 cause of poor LCP. Optimize them first.
- Lazy load below-the-fold images, but NEVER lazy load the LCP element.
- Monitor CWV in production via RUM — Lighthouse alone is insufficient for real-world performance.
- Third-party scripts are the #1 cause of poor INP — audit, defer, or remove them.
- Bundle budgets are enforced in CI — PRs that exceed budgets must optimize or get approval.

## References
  - references/bundle-optimization.md — Bundle Optimization
  - references/perf-bundling.md — Performance Bundling & Build Optimization
  - references/perf-monitoring.md — Performance Monitoring
  - references/perf-patterns.md — Performance Patterns
  - references/rendering-performance.md — Rendering Performance
  - references/web-vitals.md — Core Web Vitals
## Handoff
No artifact produced.
Next skill: frontend-accessibility — ensure optimizations do not break accessibility.
Carry forward: performance baseline, identified bottlenecks, performance budget.
