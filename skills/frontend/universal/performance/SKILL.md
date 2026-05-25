---
name: frontend-performance
description: >
  Use this skill when the user says 'performance', 'slow page', 'bundle size', 'lazy loading', 'code splitting', 'LCP', 'CLS', 'INP', 'web vitals', 'image optimization', 'caching strategy', or when optimizing frontend performance. This skill enforces: measure-first optimization, Core Web Vitals targets (LCP <2.5s, CLS <0.1, INP <200ms), code splitting by route, image optimization (WebP/AVIF, srcset, dimensions), and caching with stale-while-revalidate. Works with any frontend framework. Do NOT use for: backend performance, database optimization, or infrastructure tuning.
version: "1.0.0"
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

## Rules
- Measure before and after every optimization. One change at a time.
- Core Web Vitals are field metrics. Lab tests (Lighthouse) are proxies, not truth.
- Preload only the LCP candidate resource. Preloading everything negates the benefit.
- Route-level code splitting is mandatory. Component-level is optional.
- Set a performance budget before starting. Enforce it in CI.
- Images are the #1 cause of poor LCP. Optimize them first.

## References
- `references/web-vitals.md` — Core Web Vitals targets (LCP, INP, CLS) and optimization
- `references/perf-bundling.md` — bundle analysis, code splitting, Vite/Webpack config, budgets, compression
- `references/perf-monitoring.md` — RUM, Core Web Vitals, Lighthouse CI, long tasks, budget enforcement
- `references/perf-patterns.md` — image optimization, lazy loading, virtual scroll, debounce, fonts, critical CSS

## Handoff
No artifact produced.
Next skill: frontend-accessibility — ensure optimizations do not break accessibility.
Carry forward: performance baseline, identified bottlenecks, performance budget.
