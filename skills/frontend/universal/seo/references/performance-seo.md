# Performance SEO Reference

## Core Web Vitals for SEO

| Metric              | Good      | Needs Work | Poor       |
|---------------------|-----------|------------|------------|
| LCP (Largest Contentful Paint) | ≤ 2.5s    | ≤ 4.0s     | > 4.0s     |
| FID (First Input Delay)        | ≤ 100ms   | ≤ 300ms    | > 300ms    |
| CLS (Cumulative Layout Shift)  | ≤ 0.1     | ≤ 0.25     | > 0.25     |
| INP (Interaction to Next Paint)| ≤ 200ms   | ≤ 500ms    | > 500ms    |
| TTFB (Time to First Byte)      | ≤ 800ms   | ≤ 1800ms   | > 1800ms   |

## SSR for SEO

### Why SSR Matters for SEO

- Crawlers (Googlebot) execute JS but have a budget — slow JS execution means partial indexing
- SSR delivers fully rendered HTML on first response
- No flash of empty state, no loading spinners for crawlers

### Framework SSR Patterns

```tsx
// Next.js App Router — server components render HTML by default
// app/orders/page.tsx
export default async function OrdersPage() {
  const orders = await fetchOrders(); // fetched on server
  return <OrderList orders={orders} />;
}
```

```ts
// Nuxt 3 — universal rendering by default
// pages/orders/index.vue
<script setup lang="ts">
const { data: orders } = await useFetch('/api/orders');
</script>
```

```ts
// SvelteKit — SSR by default
// src/routes/orders/+page.ts
export async function load({ fetch }) {
  const response = await fetch('/api/orders');
  return { orders: await response.json() };
}
```

### Critical Rendering Path

```html
<!-- Inline critical CSS, defer non-critical -->
<style>
  /* Above-the-fold styles only — ~14 KB gzipped max */
  header, nav, .hero { /* layout styles */ }
</style>
<link rel="preload" href="/styles/main.css" as="style" onload="this.onload=null;this.rel='stylesheet'" />
<noscript><link rel="stylesheet" href="/styles/main.css" /></noscript>

<!-- Defer JavaScript -->
<script src="/scripts/app.js" defer></script>
```

## Preload Critical Assets

```html
<!-- Preload hero image (above-the-fold LCP candidate) -->
<link rel="preload" href="/images/hero.webp" as="image" fetchpriority="high" />

<!-- Preload fonts -->
<link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin />

<!-- Preconnect to origins -->
<link rel="preconnect" href="https://fonts.googleapis.com" crossorigin />
<link rel="dns-prefetch" href="https://api.example.com" />
```

## Structured Data Impact

- JSON-LD in `<head>` or end of `<body>` does NOT block rendering
- Google parses JSON-LD asynchronously — no performance concern
- Maximum JSON-LD block size: ~100 KB (keep under 20 KB per page)
- Lazy-load JSON-LD for non-critical types (FAQ below fold is fine)

## Mobile-First Indexing

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

- Google uses mobile content for ranking
- Mobile and desktop must have equivalent content and structured data
- Lazy loading: use `loading="lazy"` for below-fold images, `loading="eager"` for above-fold

```html
<!-- Above fold: eager -->
<img src="/hero.webp" alt="Hero" fetchpriority="high" loading="eager" />

<!-- Below fold: lazy -->
<img src="/image.webp" alt="Content" loading="lazy" />
```

## Rendering Budget

```
SSR Time:            < 500ms (server render)
Time to First Byte:  < 800ms
First Contentful Paint: < 1.5s
Largest Contentful Paint: < 2.5s
Total Blocking Time: < 200ms
JavaScript Bundle:   < 200 KB (gzipped) for critical pages
```

## SEO Performance Audit

```bash
# Lighthouse CI
npx lhci collect --url=https://example.com --numberOfRuns=3
npx lhci assert --preset=lighthouse:recommended
npx lhci upload --target=temporary-public-storage

# Core Web Vitals via CrUX API
curl "https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=$API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"origin": "https://example.com", "formFactor": "PHONE"}'
```

## Common SSR SEO Issues

| Issue                        | Symptom                        | Fix                              |
|------------------------------|--------------------------------|----------------------------------|
| Client-only rendering        | Blank HTML, JS-dependent index | Move data fetch to server        |
| Missing meta tags on SSR     | OG previews not rendering      | Use framework head management    |
| Large CSS blocking render    | Slow LCP                       | Inline critical CSS, defer rest  |
| Unoptimized images           | Large LCP, high CLS            | WebP/AVIF, set width/height      |
| No lazy loading              | Slow initial paint             | `loading="lazy"` below fold      |
| Heavy third-party scripts    | High TBT, slow FID             | Defer, async, or remove          |
| No cache headers on SSR      | High TTFB                      | CDN cache, SWR stale-while-revalidate |
