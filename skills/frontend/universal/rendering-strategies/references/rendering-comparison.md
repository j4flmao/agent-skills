# Rendering Strategy Comparison

## Decision Tree

```
Is the page public or behind auth?
├── Behind auth → CSR or SSR
│   ├── Highly interactive dashboard → CSR
│   └── SEO not needed, but fast first paint needed → SSR
└── Public → SSG, ISR, SSR
    ├── Content never changes → SSG
    ├── Content changes periodically → ISR (revalidate = update interval)
    └── Content changes per request (user-time, inventory) → SSR

Is SEO important?
├── Yes → SSG, ISR, SSR (never CSR)
└── No → CSR (cheapest, most interactive)

What's the interactivity level?
├── Minimal (blog, docs) → SSG + progressive enhancement
├── Moderate (e-commerce, listings) → ISR + client islands
└── High (dashboard, editor) → CSR or SSR + full hydration
```

## Metrics Impact

| Metric | CSR | SSR | SSG | ISR | RSC |
|--------|-----|-----|-----|-----|-----|
| TTFB | ⚡ ~100ms | 🐢 ~500ms | ⚡ ~50ms | ⚡ ~50ms | 🟡 ~200ms |
| FCP | 🐢 2-5s | 🟡 1-2s | ⚡ <1s | ⚡ <1s | ⚡ <1s |
| LCP | 🐢 Depends on JS | 🟡 1-3s | ⚡ <1.5s | ⚡ <1.5s | ⚡ <1.5s |
| TTI | 🐢 After JS | 🐢 After JS | 🟡 After JS | 🟡 After JS | ⚡ Minimal JS |
| CLS | 🟡 Variable | 🟡 Variable | ⚡ Stable | ⚡ Stable | ⚡ Stable |
| JS bundle | 🔴 Large | 🟡 Medium | 🟡 Medium | 🟡 Medium | 🟢 Small |

## Framework Support Matrix

| Strategy | Next.js | Nuxt | Astro | SvelteKit | Remix | Gatsby |
|----------|---------|------|-------|-----------|-------|--------|
| CSR | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| SSR | ✅ App Router | ✅ | ✅ | ✅ | ✅ | ❌ |
| SSG | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| ISR | ✅ | SWR | ❌ | ✅ | ❌ | ❌ |
| RSC | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Streaming | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Islands | Partial | ❌ | ✅ | ❌ | ❌ | ❌ |

## When to Use Each Strategy

### CSR — Client-Side Rendering
- Admin dashboards, analytics tools, internal apps
- Apps behind authentication where SEO doesn't matter
- Highly interactive tools (design editors, spreadsheets)
- Any page where initial load speed matters less than interactivity

### SSR — Server-Side Rendering
- E-commerce product pages (SEO + personalized pricing/inventory)
- Social media feeds (personalized + SEO)
- Any page that needs SEO but has user-specific content
- Pages where TTFB is less critical than FCP

### SSG — Static Site Generation
- Marketing pages, landing pages, documentation
- Blog posts, knowledge bases, public content
- Company websites, portfolio sites
- Any page where content is the same for all users and doesn't change often

### ISR — Incremental Static Regeneration
- News sites, blog with periodic updates
- E-commerce catalog with frequent price changes
- Documentation that updates on a schedule
- Any SSG page that needs occasional updates without full rebuild

### RSC — React Server Components
- React apps (Next.js App Router)
- Data-heavy pages where you want zero client JS for data fetching
- Pages mixing static content with interactive widgets
- Apps where bundle size is a concern

## Data Fetching

| Strategy | Data Source | Re-fetch | Client Cache |
|----------|-------------|----------|--------------|
| CSR | API call (client) | On mount / manual | SWR, TanStack Query |
| SSR | Server (getServerSideProps) | Per request | Optional |
| SSG | Build-time | On rebuild | None |
| ISR | Build-time + revalidation | On revalidation | Stale-while-revalidate |
| RSC | Server (direct DB/API) | Per request (streamed) | None needed |

## Cost Comparison

| Strategy | Hosting | CPU Cost | Bandwidth | Scaling |
|----------|---------|----------|-----------|---------|
| CSR | Static CDN (S3, Vercel) | $0 | Low | Trivial |
| SSR | Serverless (Vercel, Lambda) | $ per request | High | Good |
| SSG | Static CDN | $0 | Low | Trivial |
| ISR | Serverless + CDN | Low (revalidation only) | Low | Trivial |
| RSC | Serverless (Vercel) | $ per request | Low (streamed) | Good |

## Migration Path

```
SSG → ISR: Add revalidate interval to static pages
CSR → SSR: Move data fetching to server, hydrate on client
SSR → RSC: Convert data-fetching components to Server Components
SSG + CSR hybrid → RSC + client islands: Replace CSR data fetches with RSC, keep interactive islands
```
