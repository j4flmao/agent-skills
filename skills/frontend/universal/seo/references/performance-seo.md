# Performance and Rendering for SEO

How page performance and rendering strategy affect search visibility: Core Web Vitals as ranking signals, server rendering for crawlability, critical resource loading, and how to measure with field and lab data. Structured data is covered in `structured-data.md`; full audits in `seo-technical-audit.md`.

## Core Web Vitals

Google's page experience signals use field data (Chrome UX Report, 75th percentile of page loads, segmented by mobile and desktop).

| Metric | Measures | Good | Needs improvement | Poor |
|--------|----------|------|-------------------|------|
| LCP (Largest Contentful Paint) | Loading of main content | at most 2.5 s | at most 4.0 s | over 4.0 s |
| INP (Interaction to Next Paint) | Responsiveness across all interactions | at most 200 ms | at most 500 ms | over 500 ms |
| CLS (Cumulative Layout Shift) | Visual stability | at most 0.1 | at most 0.25 | over 0.25 |

INP replaced First Input Delay as a Core Web Vital in March 2024. TTFB (good at most 0.8 s) is a diagnostic metric, not a Core Web Vital, but slow TTFB delays LCP.

Relevance matters more than speed for ranking; Core Web Vitals act as one signal among many, most influential when competing pages are similar in relevance. Fast pages also improve crawl efficiency and conversions.

## Rendering Strategy and Crawlability

Googlebot renders JavaScript with an evergreen Chromium, but rendering can be deferred, and other crawlers (social previews, some search engines, AI crawlers) may not execute JavaScript at all.

| Strategy | SEO properties |
|----------|----------------|
| SSG (static generation) | Full HTML at request; fastest TTFB from CDN |
| SSR / streaming SSR | Full HTML per request; good for dynamic content |
| ISR / revalidation | Static performance with periodic freshness |
| CSR only | Content depends on JS execution; risk of empty or partial indexing, slower LCP |

Guidelines:
- Main content, title, meta description, canonical, and links must be present in the initial HTML.
- Use real `<a href>` links for navigation; crawlers do not click buttons or follow `onClick` routing.
- Do not rely on user interaction (scroll, click) to load indexable content.
- Return correct status codes from the server (404/410 for missing pages, 301 for moves); soft 404s (200 with "not found") waste crawl budget.

Framework examples:

```tsx
// Next.js App Router: server component fetches on the server
export const revalidate = 3600;   // ISR: regenerate at most hourly
export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();        // real 404 status
  return <ProductView product={product} />;
}
```

```vue
<!-- Nuxt: universal rendering by default -->
<script setup lang="ts">
const route = useRoute();
const { data: product } = await useFetch(`/api/products/${route.params.slug}`);
if (!product.value) throw createError({ statusCode: 404, statusMessage: 'Not found' });
useSeoMeta({ title: () => product.value?.name, description: () => product.value?.summary });
</script>
```

## Improving LCP

1. Identify the LCP element (usually hero image or headline) in Lighthouse or the Performance panel.
2. Reduce TTFB: CDN caching, edge rendering, efficient server data fetching.
3. Make the LCP resource discoverable in HTML and prioritized:

```html
<link rel="preload" as="image" href="/hero-1200.avif" imagesrcset="/hero-800.avif 800w, /hero-1200.avif 1200w" imagesizes="100vw">
<img src="/hero-1200.avif" srcset="/hero-800.avif 800w, /hero-1200.avif 1200w" sizes="100vw"
     width="1200" height="600" fetchpriority="high" alt="Product line overview">
```

4. Never lazy-load the LCP image (`loading="lazy"` delays it); lazy-load below-the-fold images only.
5. Inline critical CSS, defer the rest; avoid render-blocking scripts (`defer`/`async`/`type="module"`).
6. Use modern formats (AVIF/WebP) and correctly sized images.
7. Self-host fonts or preconnect to font origins; use `font-display: swap` or `optional`.

## Improving INP

- Break up long tasks (over 50 ms): yield to the main thread (`scheduler.yield()` where supported, or `setTimeout`), chunk work.
- Reduce JavaScript shipped: code-splitting, removing unused libraries, server components/islands.
- Avoid heavy work in input handlers; update UI first, then do expensive work.
- Minimize hydration cost (partial or progressive hydration, React Server Components, Astro islands).
- Watch third-party scripts (tag managers, chat widgets); load them after interaction or with `defer`.

## Improving CLS

- Always set `width`/`height` (or `aspect-ratio`) on images, videos, iframes and ad slots.
- Reserve space for banners and dynamic content; avoid inserting content above existing content.
- Use `transform` animations rather than layout-affecting properties.
- Match fallback font metrics (`size-adjust`, `ascent-override`) to reduce font-swap shifts.

## Mobile-First Indexing

Google indexes the mobile version of pages. Ensure the mobile rendering contains the same content, structured data, metadata and internal links as desktop, and that resources are not blocked by robots.txt.

## Measuring

| Source | Type | Use |
|--------|------|-----|
| Search Console Core Web Vitals report | Field (CrUX) | URL groups failing thresholds |
| PageSpeed Insights | Field + lab | Per-URL diagnosis |
| CrUX API / BigQuery dataset | Field | Trends, origin-level monitoring |
| `web-vitals` JS library | Real user monitoring | Your own percentile data with attribution |
| Lighthouse / Lighthouse CI | Lab | Regression gates in CI |

```typescript
import { onLCP, onINP, onCLS } from 'web-vitals/attribution';
const send = (m: { name: string; value: number; id: string }) =>
  navigator.sendBeacon('/rum', JSON.stringify(m));
onLCP(send); onINP(send); onCLS(send);
```

Lab scores and field data differ; prioritize field data for SEO decisions and use lab tools to debug.

## Checklist

- [ ] Indexable content, metadata and links in initial HTML
- [ ] Correct HTTP status codes for missing and moved pages
- [ ] LCP resource preloaded/high priority, never lazy-loaded
- [ ] Long tasks broken up; JavaScript and third parties trimmed for INP
- [ ] Dimensions reserved for media and dynamic content for CLS
- [ ] Mobile and desktop content parity
- [ ] RUM with `web-vitals`; Lighthouse CI budgets in CI
