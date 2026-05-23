---
name: frontend-rendering-strategies
description: >
  Use this skill when the user says 'rendering strategy', 'CSR', 'SSR', 'SSG', 'ISR', 'RSC', 'React Server Components', 'server-side rendering', 'static site generation', 'incremental static regeneration', 'hydration', 'client-side rendering', 'partial hydration', 'progressive hydration', 'streaming SSR', 'edge rendering', 'SSR vs SSG vs ISR', 'rendering decision'. This skill helps choose the right rendering strategy per route/page based on data freshness, SEO, user interactivity, and performance requirements. Works with Next.js, Astro, Nuxt, Remix, Gatsby, and similar frameworks. Do NOT use for: backend rendering patterns, CDN caching, or build tool configuration.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, rendering, ssr, ssg, isr, rsc, universal]
---

# Frontend Rendering Strategies

## Purpose
Select and implement the correct rendering strategy for each route: CSR for highly interactive dashboards, SSR for personalized content, SSG for marketing pages, ISR for content that changes on a schedule, and RSC for React apps needing zero-bundle data fetching.

## Agent Protocol

### Trigger
Exact phrases: "rendering strategy", "CSR", "SSR", "SSG", "ISR", "RSC", "React Server Components", "server-side rendering", "static site generation", "incremental static regeneration", "hydration", "progressive hydration", "streaming SSR", "edge rendering".

### Input Context
- Framework (Next.js, Astro, Nuxt, Remix, Gatsby, SvelteKit, vanilla)
- Per-route requirements: data freshness, SEO significance, interactivity level
- Authentication requirements (SSR for personalized, SSG for public pages)
- Hosting/deployment platform capabilities (serverless, edge, static)
- Team familiarity with server components

### Output Artifact
Rendering strategy map per route: which strategy, why, and implementation details.

### Response Format
```
## Strategy Map
<route> → <strategy> — <rationale>

## Implementation
<per-strategy code examples>

## Trade-offs
<seo | speed | interactivity | cost>

—
Compression footer: frontend-rendering/v1 | routes: <count> | strategies: <CSR|SSR|SSG|ISR|RSC>
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Each route assigned a strategy with justification
- [ ] Hydration approach matches interactivity needs
- [ ] Data fetching method aligns with rendering strategy
- [ ] SEO-critical routes are pre-rendered (SSG or SSR)
- [ ] User-specific routes use SSR or CSR with loading state
- [ ] Content routes with periodic updates use ISR with revalidation
- [ ] Streaming configured for SSR routes with slow data dependencies

### Max Response Length
4096 tokens

## Workflow

### 1. Rendering Decision Framework
```
For each route:
├── SEO critical? + Public content? → SSG or ISR
├── SEO critical? + User-specific? → SSR (streamed)
├── Not SEO critical? + Highly interactive? → CSR
├── Content changes predictably? → ISR with revalidate
└── React app? → RSC for data-fetching, client components for interactivity
```

### 2. Strategy Comparison

| Aspect | CSR | SSR | SSG | ISR | RSC |
|--------|-----|-----|-----|-----|-----|
| SEO | Poor (requires crawler JS) | Excellent | Excellent | Excellent | Excellent |
| TTFB | Fast | Slower (server render) | Fastest | Fast (cached) | Fast (streaming) |
| FCP | Slow (JS needed) | Fast | Fastest | Fast | Fast (streaming) |
| TTI | Waits for hydration | Waits for hydration | Waits for hydration | Waits for hydration | No hydration needed |
| Data freshness | Latest (on mount) | Latest (per request) | Build-time | Revalidate interval | Per request |
| Cost | Cheap (static CDN) | Expensive (server CPU) | Cheapest | Moderate | Moderate |
| Interactivity | High (SPA) | High (hydrates) | Medium (hydrates) | Medium (hydrates) | High (islands) |

### 3. Next.js Strategy by Route
```typescript
// SSG (marketing, blog)
export const dynamic = 'force-static'
export const revalidate = false

// ISR (content pages)
export const revalidate = 3600 // revalidate every hour

// SSR (dashboard)
export const dynamic = 'force-dynamic'
export async function getServerSideProps(context) { ... }

// RSC (React Server Component — default in App Router)
// This component runs on the server, sends only HTML
async function ProductList() {
  const products = await db.products.findMany() // direct DB access
  return <ul>{products.map(p => <li key={p.id}>{p.name}</li>)}</ul>
}
```

### 4. Astro Islands Architecture
```astro
---
// Static by default — zero JS
const posts = await fetchPosts()
---

<!-- Static content — no JS sent -->
<article>
  <h1>{post.title}</h1>
  <div>{post.content}</div>
</article>

<!-- Interactive island — only this component sends JS -->
<LikeButton client:load /> <!-- loads JS immediately -->
<CommentForm client:idle /> <!-- loads JS when browser idle -->
<ShareWidget client:visible /> <!-- loads JS when visible -->
```

### 5. Nuxt Universal Rendering
```typescript
// Per-route strategy (Nuxt 3)
export default defineNuxtConfig({
  routeRules: {
    '/': { prerender: true },             // SSG
    '/blog/**': { swr: 3600 },            // ISR
    '/dashboard/**': { ssr: true },       // SSR
    '/admin/**': { ssr: false },          // CSR (SPA)
  },
})
```

### 6. Hydration Strategies
```typescript
// Full hydration (default) — entire page becomes interactive
// Pro: simple, everything works. Con: expensive for content-heavy pages.

// Progressive hydration — hydrate visible content first, defer below-fold
// Pro: faster TTI. Con: complex coordination.

// Partial hydration / islands (Astro, Qwik, Marko) — hydrate individual components
// Pro: minimal JS. Con: component boundary restrictions.

// Selective hydration (React 18) — hydrate based on user interaction priority
// Pro: automatic priority. Con: requires concurrent features.

// No hydration — static HTML only
// Pro: zero JS. Con: no interactivity.
```

### 7. Streaming SSR
```typescript
// Next.js App Router — streaming by default
async function ProductPage({ params }: { params: { id: string } }) {
  // Slow data starts streaming immediately
  const product = await getProduct(params.id)
  const relatedPromise = getRelatedProducts(params.id)

  return (
    <div>
      <h1>{product.name}</h1> {/* streams immediately */}
      <Suspense fallback={<Skeleton />}> {/* streams when ready */}
        <RelatedItems promise={relatedPromise} />
      </Suspense>
    </div>
  )
}
```

## Rules
1. SSG is the default strategy for all public, static content — optimize for cache hit ratio.
2. CSR is only appropriate when SEO is irrelevant and the page is behind auth.
3. ISR revalidation intervals match the content update frequency, not the developer's preference.
4. Server Components (RSC) never use hooks or browser APIs — only Client Components with `"use client"`.
5. Hydration never blocks the main thread — defer non-critical interactivity.
6. Streaming SSR starts sending HTML as soon as the shell is ready — never block on slow data.
7. Each route has exactly one primary strategy — hybrid strategies (e.g., SSG + client fetch for comments) are per-component decisions.
8. Authentication-driven personalization requires SSR or CSR — never SSG.

## References
- `references/rendering-comparison.md` — CSR vs SSR vs SSG vs ISR vs RSC detailed comparison, decision trees, metrics
- `references/hydration-strategies.md` — Full, progressive, partial, selective hydration, islands, hydration pitfalls

## Handoff
No artifact produced unless requested.
Next skill: `frontend-performance` — measure rendering strategy impact via Core Web Vitals.
Carry forward: per-route strategy map, hydration approach, streaming config, revalidation intervals.
