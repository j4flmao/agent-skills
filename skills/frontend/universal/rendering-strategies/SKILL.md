---
name: frontend-rendering-strategies
description: >
  Use this skill when the user says 'rendering strategy', 'CSR', 'SSR', 'SSG', 'ISR', 'RSC', 'React Server Components', 'server-side rendering', 'static site generation', 'incremental static regeneration', 'hydration', 'client-side rendering', 'partial hydration', 'progressive hydration', 'streaming SSR', 'edge rendering', 'SSR vs SSG vs ISR', 'rendering decision'. This skill helps choose the right rendering strategy per route/page based on data freshness, SEO, user interactivity, and performance requirements. Works with Next.js, Astro, Nuxt, Remix, Gatsby, and similar frameworks. Do NOT use for: backend rendering patterns, CDN caching, or build tool configuration.
version: "2.0.0"
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

## Rendering Strategy Architecture / Decision Trees

### Per-Route Strategy Decision Tree
```
For each route:
  |-- SEO critical? -->
  |     |-- YES -->
  |     |     |-- Public content (same for all users)? -->
  |     |     |     |-- YES --> SSG or ISR
  |     |     |     |-- NO (user-specific) --> SSR (streamed)
  |     |
  |     |-- NO -->
  |           |-- Highly interactive? -->
  |                 |-- YES --> CSR (SPA with loading state)
  |                 |-- NO --> SSR or RSC
  |
  |-- Content changes predictably? -->
  |     |-- YES (e.g., blog posts updated hourly) --> ISR with revalidate
  |     |-- NO (e.g., real-time dashboard) --> SSR or CSR
  |
  |-- React app? -->
        |-- RSC for data-fetching, client components for interactivity
        |-- Default: Server Components, opt-in to Client Components with "use client"
```

### Hydration Strategy Decision Tree
```
How much interactivity does the page need?
  |-- None (static content, docs, blog) -->
  |     No hydration needed. Zero JS sent.
  |     Framework: Astro (default), or SSG without JS
  |
  |-- Some interactive islands (like buttons, forms) -->
  |     Partial hydration / islands architecture
  |     Framework: Astro (client:* directives), Qwik (resumable)
  |
  |-- Fully interactive (dashboard, admin) -->
  |     |-- Content-heavy with slow data? -->
  |     |     Progressive hydration: hydrate above-fold first
  |     |     Streaming SSR: shell renders fast, data streams in
  |     |
  |     |-- App-like (SPA) -->
  |           Full hydration: CSR with route-level code splitting
  |
  |-- React app with mixed concerns -->
        Selective hydration (React 18+): prioritize by user interaction
```

### Data Fetching Decision Tree
```
Where does data come from?
  |-- Database / ORM -->
  |     |-- SSG/ISR: fetch at build time or revalidate interval
  |     |-- SSR/RSC: fetch per request (may cache at CDN level)
  |
  |-- External API -->
  |     |-- SSG: fetch at build time, cache result
  |     |-- ISR: fetch at build time + revalidate
  |     |-- SSR: fetch per request (add CDN caching if public)
  |     |-- CSR: fetch on client (show loading state)
  |
  |-- User-specific (auth required) -->
        SSR or CSR. Never SSG or ISR (cached response would leak data).
```

---

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

### 8. Deployment Platform Considerations
| Strategy | Vercel | Netlify | AWS (Lambda) | Static Hosting (S3) |
|----------|--------|---------|-------------|-------------------|
| SSG | ✓ | ✓ | ✓ | ✓ Best |
| ISR | ✓ (built-in) | Partial | Manual Lambda | ✗ |
| SSR | ✓ (serverless) | ✓ (serverless) | ✓ (Lambda) | ✗ |
| CSR | ✓ | ✓ | ✓ | ✓ |

## Common Pitfalls

### 1. SSG for Authenticated Content
Static pages are cached and shared. Never use SSG for user-specific pages — cached HTML would leak data between users.

### 2. SSR Without Streaming
SSR blocks the response until all data is fetched. Use streaming to send the shell immediately and stream data as it resolves.

### 3. Over-Engineering Rendering
Not every route needs a custom strategy. Default: SSG for content, CSR for admin, SSR for dynamic. Only use ISR when SSG + client fetch isn't sufficient.

### 4. Wrong Hydration Strategy
Fully hydrating a mostly-static blog page wastes bandwidth and CPU. Use islands (Astro) or progressive hydration for content-heavy pages.

## Performance Considerations

### Cost-Benefit by Strategy
| Strategy | Server Cost | Client CPU | Time to Interactive | Cache Hit Ratio |
|----------|------------|------------|-------------------|----------------|
| SSG | 0 (build only) | Low | Fastest | 100% (CDN) |
| ISR | Low | Low | Fast | ~99% (CDN) |
| SSR | High | Medium | Depends on server | 0% (dynamic) |
| CSR | 0 (static hosting) | High | Depends on JS size | 100% (CDN) |
| RSC | Medium | Low | Fast (streaming) | Varies |

### HTML Size Comparison
| Strategy | HTML Size (example page) |
|----------|------------------------|
| CSR (empty shell) | ~1KB |
| SSR (full HTML) | ~20KB |
| SSG (full HTML) | ~20KB |
| RSC (streamed) | ~5KB initial, streams rest |
| Astro (islands) | ~15KB HTML + ~5KB JS per island |

## Accessibility Considerations

- SSR/SSG pages with full HTML are inherently more accessible (content available before JS loads)
- CSR pages must manage focus during loading, error, and content transitions
- Streaming SSR: use aria-busy on regions while content streams in
- ISR: cached pages may show stale content — add a "Last updated" timestamp for context

## Security Considerations

- SSG: static pages are safe (no server-side processing per request)
- SSR: validate all inputs, implement rate limiting, avoid heavy computation per request
- ISR: revalidation API routes must be authenticated to prevent DoS
- RSC: server components never expose server secrets to the client
- Never embed secrets in SSR/RSC responses sent to the client

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
  - references/edge-rendering.md — Edge Rendering
  - references/hydration-strategies.md — Hydration Strategies
  - references/isomorphic-rendering.md — Isomorphic Rendering
  - references/rendering-comparison.md — Rendering Strategy Comparison
  - references/ssr-csr.md — SSR vs CSR
  - references/streaming-ssr.md — Streaming SSR
## Handoff
No artifact produced unless requested.
Next skill: `frontend-performance` — measure rendering strategy impact via Core Web Vitals.
Carry forward: per-route strategy map, hydration approach, streaming config, revalidation intervals.
