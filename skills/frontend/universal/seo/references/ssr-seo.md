# SSR/SSG SEO Reference

## Why SSR/SSG Matters

Crawlers (Googlebot) execute JavaScript but have a limited budget:
- Googlebot queues pages for rendering — slow JS = partial indexing
- SSR delivers fully rendered HTML on first byte response
- SSG pre-builds HTML at build time — fastest possible delivery

| Approach | Render Time | SEO | Best For |
|----------|------------|-----|----------|
| SSR | Request-time | Excellent | Dynamic content, auth-required pages |
| SSG | Build-time | Excellent | Static content, blog, marketing |
| ISR | Build-time + revalidate | Excellent | Content that changes periodically |
| CSR (with JS) | Client-time | Poor with no fallback | Apps behind auth wall |
| CSR (with prerender) | Prerendered at build | Good | Hybrid approaches |

## Framework-Specific Meta API

### Next.js App Router
```tsx
// app/layout.tsx — root layout (inherited by all pages)
export const metadata: Metadata = {
  title: { template: '%s | AcmeApp', default: 'AcmeApp' },
  description: 'Real-time order tracking platform.',
  openGraph: { images: [{ url: '/og.png', width: 1200, height: 630 }] },
};

// app/orders/page.tsx — page-specific override
export const metadata: Metadata = {
  title: 'Orders',
  description: 'View and manage all orders on AcmeApp.',
  alternates: { canonical: 'https://example.com/orders' },
};
```

### Nuxt 3
```ts
// pages/orders/index.vue
<script setup lang="ts">
useHead({
  title: 'Orders',
  meta: [
    { name: 'description', content: 'View and manage all orders.' },
    { property: 'og:title', content: 'Orders | AcmeApp' },
    { property: 'og:description', content: 'View and manage all orders.' },
  ],
  link: [{ rel: 'canonical', href: 'https://example.com/orders' }],
});
</script>
```

### SvelteKit
```ts
// src/routes/orders/+page.ts
export const load = ({ url }) => ({
  meta: {
    title: 'Orders | AcmeApp',
    description: 'View and manage all orders.',
    canonical: url.href,
  },
});
```

```svelte
<!-- src/routes/orders/+page.svelte -->
<svelte:head>
  <title>Orders | AcmeApp</title>
  <meta name="description" content="View all orders." />
  <link rel="canonical" href="{$page.url.href}" />
</svelte:head>
```

### Astro
```astro
---
const canonical = Astro.url;
---
<head>
  <title>Orders | AcmeApp</title>
  <meta name="description" content="View and manage all orders." />
  <link rel="canonical" href={canonical} />
  <meta property="og:url" content={canonical} />
</head>
```

## Rendering Performance Targets

| Metric | Target |
|--------|--------|
| SSR Time | < 500ms |
| TTFB | < 800ms |
| FCP | < 1.5s |
| LCP | < 2.5s |
| TBT | < 200ms |
| JS Bundle (critical) | < 200 KB gzipped |

## Core Web Vitals for SEO

| Metric | Good | Needs Work | Poor |
|--------|------|------------|------|
| LCP | ≤ 2.5s | ≤ 4.0s | > 4.0s |
| FID / INP | ≤ 100ms / ≤ 200ms | ≤ 300ms / ≤ 500ms | > 300ms / > 500ms |
| CLS | ≤ 0.1 | ≤ 0.25 | > 0.25 |
| TTFB | ≤ 800ms | ≤ 1800ms | > 1800ms |

## Preload Critical Assets

```html
<!-- Above-fold LCP candidate -->
<link rel="preload" href="/images/hero.webp" as="image" fetchpriority="high" />
<!-- Critical font -->
<link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin />
<!-- Preconnect to origins -->
<link rel="preconnect" href="https://fonts.googleapis.com" crossorigin />
```

## Common SSR SEO Issues

| Issue | Symptom | Fix |
|-------|---------|-----|
| Client-only rendering | Blank HTML, JS-dependent index | Move data fetch to server |
| Missing meta tags on SSR | OG previews not rendering | Use framework head management |
| Large CSS blocking render | Slow LCP | Inline critical CSS, defer rest |
| Unoptimized images | Large LCP, high CLS | WebP/AVIF, set width/height |
| No lazy loading | Slow initial paint | `loading="lazy"` below fold |
| Heavy third-party scripts | High TBT, slow INP | Defer, async, or remove |
| No cache headers on SSR | High TTFB | CDN cache, SWR stale-while-revalidate |

## Image Optimization

```html
<!-- Above fold: eager loading, fetchpriority high -->
<img src="/hero.webp" alt="Hero" width="1200" height="630" fetchpriority="high" loading="eager" />

<!-- Below fold: lazy loading, explicit dimensions -->
<img src="/image.webp" alt="Content" width="800" height="600" loading="lazy" />
```

Always set explicit `width` and `height` attributes to prevent CLS (Cumulative Layout Shift).

## SEO Performance Audit Tools

```bash
# Lighthouse CI
npx lhci collect --url=https://example.com --numberOfRuns=3
npx lhci assert --preset=lighthouse:recommended
npx lhci upload --target=temporary-public-storage

# CrUX API (real-user Core Web Vitals)
curl "https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=$API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"origin": "https://example.com"}'

# Google Search Console API
# Check indexing coverage, sitemap status, Core Web Vitals report
```
