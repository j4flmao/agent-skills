# Hydration Strategies

## Full Hydration (Default)

The server sends fully rendered HTML. The browser renders it immediately, then downloads and executes the JS bundle. React/Vue/etc. takes over the DOM — attaches event listeners, initializes state, and makes the page interactive.

### Pros
- Simple — framework default
- Everything client-side works (hooks, state, effects)
- Interactivity is unbounded after hydration

### Cons
- Expensive — entire component tree must hydrate
- Blocking — main thread busy during hydration
- Bad for content-heavy pages with minimal interactivity
- Hydration mismatch bugs (server HTML ≠ client first render)

```typescript
// Next.js Pages Router — full hydration per page
export default function Page({ data }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return <ExpensiveApp data={data} /> // hydrates fully
}
```

## Progressive Hydration

Hydrate components in priority order: above-the-fold first, then below-the-fold as the browser becomes idle. Use `requestIdleCallback` to schedule lower-priority hydration.

### Pros
- Faster TTI for visible content
- Main thread is free sooner
- Better Lighthouse scores

### Cons
- Complex coordination
- Risk of layout shift if not careful
- Framework-specific (React 18 concurrent features help)

```typescript
// Conceptual progressive hydration
function Page() {
  return (
    <div>
      <ImmediateHydration> {/* hydrates right away */}
        <Header />
      </ImmediateHydration>
      <IdleHydration> {/* hydrates during browser idle time */}
        <Sidebar />
      </IdleHydration>
      <VisibleHydration> {/* hydrates when scrolled into view */}
        <Footer />
      </VisibleHydration>
    </div>
  )
}
```

## Partial Hydration / Islands (Astro, Marko)

Most of the page is static HTML — zero JS. Individual interactive components ("islands") hydrate independently. Each island is self-contained and can hydrate at different times (load, idle, visible, media query).

### Pros
- Minimal JS — only interactive components ship code
- Fast TTI — small bundles hydrate quickly
- Main thread is mostly free
- Good for content-heavy pages with sparse interactivity

### Cons
- Islands can't share state directly (use custom events or props)
- Component boundary restrictions
- Third-party components may not support island pattern
- Framework-specific implementation

```astro
---
// Astro — static by default
import Header from '../components/Header.astro'
import LikeButton from '../components/LikeButton.jsx'
import CommentForm from '../components/CommentForm.svelte'
---

<Header /> <!-- static — zero JS -->

<LikeButton client:load /> <!-- hydrates on page load -->
<CommentForm client:idle /> <!-- hydrates when browser idle -->

<div class="gallery">
  {
    images.map(img => (
      <ImageCard image={img} client:visible /> <!-- hydrates when visible -->
    ))
  }
</div>
```

## Selective Hydration (React 18)

React 18's concurrent features allow selective hydration — hydrate high-priority parts first. When the user interacts with a component, React prioritizes its hydration. Supports streaming HTML and progressive hydration based on user interaction.

### Pros
- Automatic — React handles priority
- User interactions drive hydration order
- Streaming SSR sends HTML in chunks
- Transitions prevent blocking the UI

### Cons
- Requires React 18+ and concurrent features
- Server Components / streaming infrastructure needed
- Not available in all frameworks

```typescript
// React 18 selective hydration via Suspense
import { Suspense, lazy } from 'react'

function ProductPage() {
  return (
    <div>
      <ProductInfo /> {/* hydrates first — high priority */}
      <Suspense fallback={<Loading />}>
        <Reviews /> {/* hydrates after — low priority */}
      </Suspense>
    </div>
  )
}
```

## No Hydration

Pure static HTML. Zero client-side JavaScript. Used in Astro for `.astro` components that have no interactive elements, or in frameworks like Eleventy.

### Pros
- Fastest possible page load
- Zero JS cost
- Perfect Lighthouse scores
- Cheapest hosting (static files)

### Cons
- No interactivity at all
- Need separate interactive pages for dynamic features
- Limited to content-only pages

## Hydration Decision Tree

```
Does this component need interactivity?
├── No → Static HTML (SSG/SSR, no hydration)
├── Yes — on load → Hydrate immediately (client:load)
├── Yes — when visible → Hydrate on scroll (client:visible)
├── Yes — when idle → Hydrate during idle (client:idle)
└── Yes — on interaction → Hydrate on click/focus (client:event)

Is the page content-heavy (blog, docs)?
├── Yes → Partial hydration (islands)
└── No → Full hydration or selective hydration

Is data-fetching involved?
├── React 18+ → RSC for data, client components for interactivity
├── Astro → Static + fetch in island components
└── Other → SSR data + full/progressive hydration
```

## Common Hydration Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Hydration mismatch | Server HTML ≠ client render | Use `suppressHydrationWarning` or ensure deterministic output |
| Hydration timeout | Too many components hydrate at once | Progressive or partial hydration |
| Flash of unstyled content | CSS loads after HTML | Inline critical CSS, preload stylesheets |
| JS bundle too large | All code bundled together | Code-split by route, lazy-load below-fold components |
| Slow TTI | Full hydration blocks main thread | Break hydration into chunks, use islands |

## Hydration Performance Budget

| Metric | Target |
|--------|--------|
| JS bundle (initial) | < 100 KB (gzipped) |
| Hydration time | < 300ms |
| Time to Interactive | < 2.5s |
| Total blocking time (TBT) | < 200ms |
