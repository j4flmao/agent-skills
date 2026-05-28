# Astro Islands Architecture

## Principles

Astro Islands (also called "islands architecture" or "partial hydration") is a web architecture pattern where the server renders static HTML for the entire page, and only interactive "islands" of client-side JavaScript are hydrated independently. The rest of the page remains static HTML and CSS with zero JavaScript.

### Core Concepts

1. **Zero JavaScript by default** — Every `.astro` component produces HTML and CSS only. No JavaScript is shipped unless explicitly added.
2. **Islands are independent** — Each island is a self-contained component with its own framework runtime. Islands do not share reactive state.
3. **Hydration is opt-in** — Developers explicitly choose when and how each island hydrates using `client:*` directives.
4. **Framework agnostic** — Islands can be built with React, Vue, Svelte, SolidJS, Preact, or Lit, all on the same page.

### Architecture Diagram

```
Server Rendered HTML (zero JS)
+-----------------------------------------------------------+
|  Static Header (.astro)                                    |
|  +------------------------------------------------------+ |
|  |  Static Hero (.astro)  |  Interactive Search (React)  | |
|  |                        |  client:load                 | |
|  +------------------------------------------------------+ |
|  +------------------------------------------------------+ |
|  |  Interactive Chart (Svelte) |  Static Content (.astro)| |
|  |  client:visible             |                         | |
|  +------------------------------------------------------+ |
|  |  Interactive Form (Vue)                                | |
|  |  client:idle                                           | |
|  +------------------------------------------------------+ |
|  Static Footer (.astro)                                    |
+-----------------------------------------------------------+
```

Each framework island loads its own JavaScript bundle only when its hydration condition is met. Non-interactive content never ships JS.

## Client Directives Reference

### Directive Hierarchy

```
client:load       (Most eager — hydrates immediately)
client:idle       (Hydrates when browser is idle)
client:visible    (Hydrates when in viewport)
client:media      (Hydrates when media query matches)
client:only       (Skips SSR, client-only)
                  (No directive — fully static, no hydration)
```

### client:load

Hydrates the component immediately when the page loads. Use sparingly for critical UI.

```astro
<HeaderSearch client:load />
<AuthButton client:load />
<MobileNav client:load />
```

Performance impact: The component's framework runtime and all its dependencies download on initial page load. Each `client:load` island adds to the critical path.

### client:idle

Hydrates when the browser is idle (uses `requestIdleCallback`). Good for below-fold components that don't need immediate interactivity.

```astro
<CommentForm client:idle />
<ShareButtons client:idle />
<NewsletterSignup client:idle />
```

The browser schedules hydration during idle periods, preventing interference with critical rendering and interaction.

### client:visible

Hydrates when the component's DOM element enters the viewport (uses `IntersectionObserver`). Best for components far below the fold.

```astro
<AnalyticsDashboard client:visible />
<RelatedPosts client:visible />
<ChatWidget client:visible />
```

The IntersectionObserver fires once, triggering hydration. After hydration, the observer disconnects.

### client:media

Hydrates only when a CSS media query matches. Useful for responsive components that are interactive only on certain screen sizes.

```astro
<DesktopSidebar client:media="(min-width: 1024px)" />
<MobileMenu client:media="(max-width: 767px)" />
<TouchCarousel client:media="(hover: none) and (pointer: coarse)" />
```

The component's SSR HTML is always rendered (hidden with CSS if needed). Hydration occurs when the media query first matches.

### client:only

Skips server-side rendering entirely. The component only renders in the browser. Use for components that depend on browser APIs or have no meaningful server-side output.

```astro
<WebGLScene client:only="react" />
<IndexedDBViewer client:only="svelte" />
<AudioVisualizer client:only="vue" />
```

Requires specifying the framework name. The component is not included in the initial HTML, which may cause layout shift.

## Hydration Lifecycle

### Step-by-Step Hydration

1. **Server Render**: Astro renders the page to HTML. For island components, Astro renders the framework component on the server (unless `client:only`) and produces HTML markup with `data-astro-*` attributes.

2. **HTML Delivery**: The browser receives complete HTML with all content visible. No JavaScript has executed yet.

3. **Framework Registration**: The island's framework runtime loads. For React, this includes `react` and `react-dom`. The runtime registers itself with Astro's hydration system.

4. **Condition Check**: Astro checks if the hydration condition is met (load immediate, idle callback, intersection observer, media query match).

5. **Component Hydration**: The framework hydrates the specific DOM element. Event listeners attach, reactive state initializes, and the component becomes interactive.

6. **Runtime Sharing**: If another island of the same framework exists on the page, the already-loaded runtime is reused. No duplicate framework download.

### Timing and Order

```
Page Load
  |
  |-- HTML Render (0ms, no JS)
  |-- client:load islands hydrate (0ms + JS download time)
  |-- client:idle islands hydrate (after requestIdleCallback, ~200-500ms)
  |-- client:visible islands hydrate (when scrolled into view)
  |-- client:media islands hydrate (when media query first matches)
```

### Framework Runtime Sharing

```astro
<!-- First React island loads React runtime -->
<ReactWidget client:load />

<!-- Second React island uses already-loaded runtime -->
<ReactCounter client:visible />  <!-- React not re-downloaded -->
```

Astro's island system ensures each framework runtime is loaded only once per page, regardless of how many islands use it.

## Island Communication

### Problem: Islands are Isolated

Astro islands cannot share reactive state directly. Each island is a separate framework root with its own scope.

### Solution 1: Props

Pass initial data from Astro to islands as props:

```astro
---
import ReactWidget from '../components/ReactWidget.tsx'
import VueChart from '../components/VueChart.vue'
import SvelteList from '../components/SvelteList.svelte'

const sharedData = await getSharedData()
---

<ReactWidget client:load data={sharedData} />
<VueChart client:idle metrics={sharedData.metrics} />
<SvelteList client:visible items={sharedData.items} />
```

Each island receives its own copy of the data as props. Data is serialized from Astro frontmatter to the island component.

### Solution 2: Custom Events

```astro
---
import ReactSidebar from '../components/ReactSidebar.tsx'
import VueMap from '../components/VueMap.vue'
---

<ReactSidebar client:load />
<VueMap client:visible />

<script>
  // Cross-island communication via DOM events
  document.addEventListener('itemSelected', (e) => {
    const event = new CustomEvent('mapFocus', { detail: e.detail })
    document.dispatchEvent(event)
  })
</script>
```

```tsx
// ReactSidebar.tsx
function ReactSidebar() {
  const handleSelect = (id: string) => {
    const event = new CustomEvent('itemSelected', { detail: { id } })
    document.dispatchEvent(event)
  }
  return <div>{/* ... */}</div>
}
```

```tsx
// VueMap.vue (conceptual)
// Listens for 'mapFocus' event
// document.addEventListener('mapFocus', handler)
```

### Solution 3: Shared Store (Same Framework Only)

```tsx
// store.ts — shared between islands of the same framework
import { create } from 'zustand'

export const useStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}))
```

```astro
---
import CounterDisplay from '../components/CounterDisplay.tsx'
import CounterButton from '../components/CounterButton.tsx'
---

<CounterDisplay client:load />
<CounterButton client:load />
```

Both React islands can share the same Zustand store because they share the same React runtime and module scope.

### Solution 4: URL-Based State

For cross-island state that should survive navigation, encode state in the URL:

```astro
---
const { search } = Astro.url
---
<SearchResults client:load query={search} />
<FilterPanel client:idle currentFilter={search} />
```

Islands read initial state from URL params and update the URL when state changes, which can be picked up by other islands on subsequent page loads.

## Preventing Layout Shift

### Set Explicit Dimensions

```astro
<HeavyChart
  client:visible
  style="width: 100%; height: 400px;"
  data={chartData}
/>

<AsyncWidget
  client:idle
  style="min-height: 200px;"
/>
```

Islands that hydrate later (client:visible, client:idle) can cause layout shift if they don't have explicit dimensions. Always set width/height on non-load islands.

### Placeholder Skeleton

```astro
---
import ProductGrid from '../components/ProductGrid.tsx'
---

<div style="min-height: 600px;">
  <ProductGrid client:visible />
</div>
```

### SSR Render for SEO

Islands with `client:load`, `client:idle`, `client:visible`, and `client:media` are SSR-rendered, so their HTML is included in the initial page load. Only `client:only` skips SSR, which can cause layout shift if no placeholder dimensions are set.

## Performance Analysis

### Calculating Island Cost

```astro
<!-- Page with multiple islands -->
<ReactHeader client:load />       <!-- React runtime: ~45KB -->
<ReactForm client:idle />         <!-- 0KB (runtime already loaded) -->
<ReactChart client:visible />     <!-- 0KB (runtime already loaded) -->
<SvelteSlider client:visible />   <!-- Svelte runtime: ~2KB -->
```

Total JS for this page: ~47KB (45KB React + 2KB Svelte)

### Optimization Checklist

- [ ] Only `client:load` for critical interactive elements
- [ ] Use `client:visible` for below-fold components
- [ ] Use `client:idle` for non-urgent interactivity
- [ ] Stick to one framework per page when possible
- [ ] Set explicit dimensions on all islands
- [ ] Avoid islands in repeated list items (use .astro instead)
- [ ] Lazy load heavy dependencies inside islands

### Measuring Island Performance

```astro
---
import { Image } from 'astro:assets'
---

<!-- Track hydration timing -->
<script>
  document.addEventListener('astro:hydrate', (e) => {
    console.log(`Hydrated: ${(e.target as HTMLElement).tagName}`)
  })
</script>
```

## Island Patterns Catalog

### Pattern 1: Search with Autocomplete

```astro
---
import SearchBox from '../components/SearchBox.tsx'
---

<SearchBox client:load />
```

### Pattern 2: Dashboard with Multiple Widgets

```astro
---
import MetricsGrid from '../components/MetricsGrid.tsx'
import ActivityFeed from '../components/ActivityFeed.tsx'
import ChartWidget from '../components/ChartWidget.tsx'
---

<MetricsGrid client:load />
<ActivityFeed client:visible />
<ChartWidget client:visible />
```

### Pattern 3: Content Page with Interactive Sidebar

```astro
---
import TableOfContents from '../components/TableOfContents.tsx'
import ShareButtons from '../components/ShareButtons.tsx'
import Comments from '../components/Comments.tsx'
---

<ShareButtons client:idle />
<TableOfContents client:visible />
<Comments client:visible />
```

### Pattern 4: E-commerce Product Page

```astro
---
import ProductGallery from '../components/ProductGallery.tsx'
import AddToCart from '../components/AddToCart.tsx'
import ReviewSection from '../components/ReviewSection.tsx'
import SizeGuide from '../components/SizeGuide.tsx'
---

<ProductGallery client:load />
<AddToCart client:load />
<ReviewSection client:visible />
<SizeGuide client:media="(max-width: 768px)" />
```

### Pattern 5: Blog with Social Features

```astro
---
import LikeButton from '../components/LikeButton.tsx'
import NewsletterForm from '../components/NewsletterForm.tsx'
import RelatedPosts from '../components/RelatedPosts.tsx'
---

<LikeButton client:visible />
<NewsletterForm client:idle />
<RelatedPosts />  <!-- No directive — pure static -->
```

## Troubleshooting

| Issue | Likely Cause | Solution |
|-------|-------------|----------|
| Island not hydrating | Wrong client directive | Check hydration condition |
| Layout shift on hydration | Missing dimensions | Set explicit width/height |
| Framework not loading | Missing integration | `npx astro add <framework>` |
| Multiple framework runtimes | Using different frameworks | Consolidate to one framework |
| SSR/CSR mismatch | Client-only code in SSR | Use client:only or check `typeof window` |
| Slow page load | Too many client:load islands | Convert to client:idle/client:visible |

## Summary

| Directive | Hydration Trigger | Use Case |
|-----------|-------------------|----------|
| (none) | Never | Static content, SEO |
| client:load | Page load | Header search, auth |
| client:idle | Browser idle | Comment forms, sharing |
| client:visible | Viewport entry | Analytics, charts, chat |
| client:media | Media query match | Responsive components |
| client:only | Page load (no SSR) | Browser-API components |
