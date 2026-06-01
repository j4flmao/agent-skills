---
name: frontend-astro-patterns
description: >
  Use this skill when the user says 'Astro pattern', 'Astro island', 'Astro component pattern', 'Astro integration', 'Astro content collection', 'Astro view transition', 'Astro hybrid SSR/SSG', 'client:load', 'client:visible'. This skill enforces: island architecture with appropriate client:* directives, type-safe content collections with Zod schemas, view transitions for page-to-page navigation, passive hydration strategy (visible > idle > load), and static/server/hybrid rendering per route. Requires Astro project (package.json with astro). Do NOT use for: general Astro project setup, deployment configuration, or non-Astro meta-framework patterns.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, astro, patterns, phase-10]
---

# Astro Patterns

## Purpose
Apply production patterns to Astro projects: island architecture with optimal hydration, type-safe content collections, view transitions, and static/dynamic hybrid rendering strategies.

## Agent Protocol

### Trigger
Exact user phrases: "Astro pattern", "Astro island", "Astro component pattern", "Astro integration", "Astro content collection", "Astro view transition", "Astro hybrid SSR/SSG", "client:load", "client:visible".

### Input Context
Before activating, verify:
- package.json has astro dependency.
- Which integration(s) are configured (React, Vue, Svelte, Solid).
- Whether the project uses SSG, SSR, or hybrid mode (output config).
- Content collection structure in src/content/.

### Output Artifact
No file output. Produces island strategy, content model, rendering approach as text.

### Response Format
```
Island Strategy: {directive} — {rationale}
Content Model: {collection/type} — {schema summary}
Rendering: {static/server/hybrid} — {per-route rationale}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Island hydration chosen from most to least aggressive: load -> idle -> visible -> media -> only.
- [ ] Content collections have Zod schemas with validation.
- [ ] View transitions use <ViewTransition /> and transition:name directives.
- [ ] Hybrid rendering: static for content, server for dynamic routes.
- [ ] Nested islands pass data via props, not shared JS state.
- [ ] Image optimization via astro:assets Image/Picture.

### Max Response Length
2560 tokens.

## Component Architecture / Decision Trees

### Architecture Options

| Approach | Trade-off | When to Use |
|----------|-----------|-------------|
| Pure .astro components | Zero JS output, fully static | Content display, headers, footers |
| Framework islands (React, Vue, Svelte) | JS bundle per island type | Interactive widgets, forms |
| client:load | Immediate hydration, eager | Hero search, auth buttons |
| client:visible | Delayed until viewport | Analytics widgets, below-fold chat |
| client:media | Responsive hydration | Desktop-only sidebars, mobile nav |
| client:only | No SSR, client-render only | Browser-API-dependent charts |

### Decision Tree: Hydration Strategy

```
Is the component visible on load?
  ├── Yes and critical interactive (search, auth) -> client:load
  ├── Yes but not urgent -> client:idle
  └── No (below fold) -> client:visible
```

```
Is interactivity needed only on certain screen sizes?
  ├── Yes -> client:media with appropriate media query
  └── No -> use the least aggressive directive from above
```

### Decision Tree: Multi-Framework Selection

```
Do you already have a framework in the project?
  ├── Yes -> use that framework for all islands
  └── No -> Choose:
       ├── SSR performance critical -> SolidJS or Preact (smaller runtime)
       ├── Team familiarity -> React (larger ecosystem)
       └── Design-heavy -> Vue or Svelte (template-based)
```

### Decision Tree: Content Type Selection

```
What kind of content are you managing?
  ├── Markdown/MDX blog posts -> content collection with type: 'content'
  ├── Structured data (authors, products) -> data collection with type: 'data'
  ├── Remote CMS (Sanity, Contentful) -> fetch in page frontmatter
  └── Database-backed -> endpoint + client:load island, or SSR fetch
```

### Decision Tree: Rendering Per Route

```
Does this route need real-time data or auth?
  ├── Yes -> export const prerender = false (server-rendered)
  └── No -> Does it have dynamic params?
       ├── Yes -> getStaticPaths (pre-rendered at build)
       └── No -> static .astro page (pre-rendered)
```

### Decision Tree: Cross-Island Communication

```
Do two islands need to share state?
  ├── Only initial data -> pass as props from page frontmatter
  ├── Need to sync after mount -> CustomEvent on window
  ├── Persistent across navigation -> localStorage + storage event
  └── Complex real-time sync -> WebSocket in a single island that manages all state
```

## Component Design Patterns

### Slot-Based Layout with Named Slots

```astro
---
interface Props {
  title: string
  description?: string
}
const { title, description } = Astro.props
---
<div class="layout">
  <header>
    <h1>{title}</h1>
    {description && <p>{description}</p>}
  </header>
  <aside>
    <slot name="sidebar" />
  </aside>
  <main>
    <slot />
  </main>
  <footer>
    <slot name="footer" />
  </footer>
</div>
```

### Conditional Island Rendering

```astro
---
import HeavyChart from '../components/HeavyChart.tsx'
const showChart = Astro.props.showChart
---
{showChart && <HeavyChart client:visible />}
```

### Island with Skeleton Fallback

```astro
---
import Comments from '../components/Comments.tsx'
---
<div class="comments-section" style="min-height: 200px">
  <Comments client:idle />
</div>
<style>
  .comments-section {
    background: linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }
</style>
```

### Client:Only with Loading State

```astro
---
import ClientOnlyMap from '../components/ClientOnlyMap.tsx'
---
<ClientOnlyMap client:only="react" />
```
```tsx
// ClientOnlyMap.tsx
export default function ClientOnlyMap() {
  return typeof window !== 'undefined'
    ? <LeafletMap />
    : <div style={{ height: 400, background: '#eee' }}>Loading map...</div>
}
```

### RSS Feed Pattern

```ts
// src/pages/rss.xml.ts
import rss from '@astrojs/rss'
import { getCollection } from 'astro:content'

export async function GET(context) {
  const posts = await getCollection('blog')
  return rss({
    title: 'My Blog',
    description: 'A blog about things',
    site: context.site,
    items: posts.map(post => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      link: `/blog/${post.slug}/`,
    })),
  })
}
```

### Pagination Pattern

```astro
---
export async function getStaticPaths({ paginate }) {
  const posts = await getCollection('blog')
  return paginate(posts, { pageSize: 10 })
}
const { page } = Astro.props
---
<h1>Blog — Page {page.current}</h1>
{page.data.map(post => <article><h2>{post.data.title}</h2></article>)}
{page.url.prev && <a href={page.url.prev}>Previous</a>}
{page.url.next && <a href={page.url.next}>Next</a>}
```

### Redirect Pattern

```astro
---
// src/pages/old-post.astro
return Astro.redirect('/blog/new-post', 301)
---
```

### Form Handling with Endpoint

```astro
---
// src/pages/contact.astro
---
<form method="POST" action="/api/contact">
  <input name="email" type="email" required />
  <button type="submit">Submit</button>
</form>
```

```ts
// src/pages/api/contact.ts
export async function POST({ request }) {
  const data = await request.formData()
  await sendEmail(data.get('email'))
  return new Response(null, { status: 302, headers: { Location: '/thanks' } })
}
```

## State Management Patterns

Astro pages are rendered server-side. Framework islands are independent roots — each island manages its own state.

### Isomorphic State (Data Passed to Islands)

The most common pattern: fetch data in frontmatter, pass as props to islands:

```astro
---
import ProductCard from '../components/ProductCard.tsx'
import WishlistButton from '../components/WishlistButton.tsx'

const products = await getCollection('products')
const wishlist = await getWishlist(Astro.cookies.get('session')?.value)
---
{products.map(p => (
  <ProductCard client:visible product={p} initialWishlisted={wishlist.includes(p.id)} />
))}
<WishlistButton client:load count={wishlist.length} />
```

### Cross-Island Communication with CustomEvent

```ts
// lib/events.ts
export function emit(event: string, detail: unknown) {
  window.dispatchEvent(new CustomEvent(event, { detail }))
}

export function listen(event: string, handler: (detail: unknown) => void) {
  const listener = (e: CustomEvent) => handler(e.detail)
  window.addEventListener(event, listener)
  return () => window.removeEventListener(event, listener)
}
```

### URL-Driven State

Use URL search params for page-level state that survives navigation:

```astro
---
const page = Number(Astro.url.searchParams.get('page')) || 1
const sort = Astro.url.searchParams.get('sort') || 'date'
const posts = await getCollection('blog', ...)
---
<SortControls client:load currentSort={sort} />
<Pagination client:load currentPage={page} totalPages={Math.ceil(posts.length / 10)} />
```

### Cookie-Based State

Use cookies for server-side state (auth, preferences) that islands can read:

```astro
---
const theme = Astro.cookies.get('theme')?.value ?? 'light'
---
<html data-theme={theme}>
```

### localStorage for Persistent Client State

```tsx
// hooks/useLocalStorage.ts
import { useState, useEffect } from 'react'

export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial)
  useEffect(() => {
    const stored = localStorage.getItem(key)
    if (stored) setValue(JSON.parse(stored))
  }, [])
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value))
  }, [value])
  return [value, setValue] as const
}
```

### Server-Side State via Endpoints

```ts
// src/pages/api/session.ts
export async function GET({ cookies }) {
  const session = await getSession(cookies.get('sid')?.value)
  return new Response(JSON.stringify(session), {
    headers: { 'Content-Type': 'application/json' },
  })
}
```

## Performance Optimization

### Island Cost
Each framework island carries a base runtime cost:
| Framework | Runtime (gzipped) |
|-----------|-------------------|
| Preact | ~4KB |
| SolidJS | ~8KB |
| Svelte | ~2KB |
| Vue | ~16KB |
| React | ~45KB |

For React-heavy pages, consider using Preact via `@astrojs/preact` to reduce overhead.

### Zero-JS Pages
Content-only pages that use no framework islands ship zero JavaScript. This makes Astro ideal for blogs, documentation, marketing sites, and e-commerce product pages.

### Bundle Splitting
Each island's framework runtime is loaded lazily on first island hydration. If the page has 5 React islands, React runtime loads once and is shared. Different frameworks (React + Vue) each load their own runtime.

### Image Optimization
`astro:assets` provides automatic WebP/AVIF conversion, responsive srcset, and lazy loading. Using `<Image />` instead of bare `<img>` reduces image payload by 40-60%.

### View Transition Performance
`<ViewTransitions />` enables client-side navigation without full page reload. Use `transition:persist` on persistent elements (audio players, nav) to avoid re-initialization.

### Script Loading
- Use `@astrojs/partytown` for analytics scripts (moves them to a Web Worker)
- Inline critical scripts with `<script>` tags in .astro files
- Defer non-critical scripts with `data-astro-script`

### CSS Delivery
- Scoped styles are inlined by default for fast first paint
- Use `<style is:global>` sparingly — prefer scoped or utility CSS
- Enable `inlineStylesheets: 'auto'` to inline small stylesheets and extract large ones

### Preload and Prefetch
```astro
---
// Prefetch all internal links on hover
---
<link rel="prefetch" href="/about" />
<link rel="preload" href="/fonts/inter.woff2" as="font" crossorigin />
```

## Build & Bundle Considerations

### Output Modes and Their Implications

| Mode | Build Output | Deployment | Use Case |
|------|-------------|------------|----------|
| `static` | HTML files in `dist/` | Any static host | Blog, docs, marketing |
| `server` | Server entry point | Node/Deno/Edge runtime | Dashboard, e-commerce |
| `hybrid` | Static HTML + server routes | Adapter-specific | Content + user areas |

### Bundle Analysis
Use `rollup-plugin-visualizer` to analyze JS bundle composition:
```js
// astro.config.mjs
import { visualizer } from 'rollup-plugin-visualizer'
export default defineConfig({
  vite: {
    plugins: [visualizer({ filename: 'dist/stats.html' })],
  },
})
```

### Vendor Chunking for SSR
```js
// astro.config.mjs
export default defineConfig({
  output: 'server',
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          },
        },
      },
    },
  },
})
```

### Environment-Specific Config
```js
// astro.config.mjs
export default defineConfig({
  site: process.env.SITE_URL || 'http://localhost:4321',
  base: process.env.BASE_PATH || '/',
  build: {
    assets: process.env.ASSETS_DIR || '_assets',
  },
})
```

### Public Asset Strategy
- Static assets in `public/` are copied as-is (no hash, no optimization)
- Imported assets in `src/` are optimized and content-hashed
- Use `public/` for `robots.txt`, `favicon.ico`, `CNAME`, `ads.txt`
- Use `src/` imports for images, fonts, and other optimized assets

## Testing Strategies

### Unit Testing Astro Components

```ts
// components/__tests__/Card.test.ts
import { describe, it, expect } from 'vitest'

async function renderComponent(componentPath: string, props = {}) {
  const { default: Component } = await import(componentPath)
  const html = await Component.render(props)
  return html.html
}

describe('Card component', () => {
  it('renders title and content', async () => {
    const html = await renderComponent('./src/components/Card.astro', {
      title: 'Hello',
    })
    expect(html).toContain('Hello')
  })

  it('renders children', async () => {
    const html = await renderComponent('./src/components/Card.astro', {
      children: '<p>child content</p>',
    })
    expect(html).toContain('child content')
  })
})
```

### Testing Content Collection Schemas

```ts
// src/content/__tests__/schemas.test.ts
import { describe, it, expect } from 'vitest'
import { z } from 'astro:content'

const PostSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  pubDate: z.coerce.date(),
  tags: z.array(z.string()).default([]),
  draft: z.boolean().default(false),
})

describe('Post schema', () => {
  it('accepts valid frontmatter', () => {
    const result = PostSchema.parse({
      title: 'My Post',
      pubDate: '2024-06-01',
    })
    expect(result.title).toBe('My Post')
    expect(result.tags).toEqual([])
  })

  it('rejects missing title', () => {
    expect(() => PostSchema.parse({ pubDate: '2024-06-01' })).toThrow('Title is required')
  })

  it('coerces date strings', () => {
    const result = PostSchema.parse({ title: 'Test', pubDate: '2024-06-01' })
    expect(result.pubDate).toBeInstanceOf(Date)
  })
})
```

### Testing Framework Islands

Framework islands are standard components — test them with their framework's testing tools:

```tsx
// components/__tests__/Counter.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Counter from '../Counter'

describe('Counter island', () => {
  it('renders initial count', () => {
    render(<Counter initialCount={5} />)
    expect(screen.getByText('5')).toBeDefined()
  })

  it('increments on click', () => {
    render(<Counter initialCount={0} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('1')).toBeDefined()
  })
})
```

### E2E Testing with Playwright

```ts
// e2e/islands.spec.ts
import { test, expect } from '@playwright/test'

test('island hydrates on scroll', async ({ page }) => {
  await page.goto('/blog')
  await page.locator('[data-island="comments"]').scrollIntoViewIfNeeded()
  await expect(page.locator('[data-island="comments"] button')).toBeVisible({ timeout: 5000 })
})

test('SSR page renders without JS', async ({ page }) => {
  await page.goto('/about')
  const html = await page.content()
  expect(html).toContain('<h1>About</h1>')
  const scripts = await page.locator('script').count()
  expect(scripts).toBe(0)
})

test('API endpoint returns data', async ({ request }) => {
  const response = await request.get('/api/posts')
  expect(response.ok()).toBeTruthy()
  const body = await response.json()
  expect(Array.isArray(body)).toBe(true)
})
```

### Visual Regression Testing

```ts
// e2e/visual.spec.ts
import { test, expect } from '@playwright/test'

test('homepage matches snapshot', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveScreenshot('homepage.png', {
    fullPage: true,
    maxDiffPixelRatio: 0.02,
  })
})
```

## Migration Patterns

### Next.js Pages to Astro Pages

**Static page with getStaticProps:**
```tsx
// Next.js
export async function getStaticProps() {
  const posts = await getPosts()
  return { props: { posts } }
}
```
```astro
---
// Astro
const posts = await getPosts()
---
{posts.map(p => <PostCard post={p} />)}
```

**Dynamic page with getStaticPaths:**
```tsx
// Next.js
export async function getStaticPaths() {
  const posts = await getPosts()
  return { paths: posts.map(p => ({ params: { slug: p.slug } })), fallback: false }
}
```
```astro
---
// Astro
export async function getStaticPaths() {
  const posts = await getPosts()
  return posts.map(p => ({ params: { slug: p.slug }, props: { post: p } }))
}
const { post } = Astro.props
---
```

### Gatsby to Astro

| Gatsby | Astro |
|--------|-------|
| gatsby-node.js createPages | getStaticPaths |
| Gatsby Image | astro:assets Image |
| gatsby-source-filesystem | Content Collections |
| GraphQL query | Direct fetch or getCollection() |
| Gatsby Link | <a> tags or view transitions |

### SPA to Astro

**Phase 1 — Route wrapping:**
Wrap existing SPA routes inside Astro layout:
```astro
---
import SPAApp from '../components/App.tsx'
---
<SPAApp client:only="react" />
```

**Phase 2 — Incremental island extraction:**
Move static sections to .astro components, keeping only interactive parts as islands.

**Phase 3 — Full migration:**
Content pages become pure .astro. Interactive features become targeted islands.

### Content Migration

```
WordPress -> WP REST API calls in frontmatter -> SSG pages
MDX in Next.js -> Move src/pages/**/*.mdx to src/content/**/*.mdx
Sanity -> @sanity/client calls in frontmatter
Strapi -> REST/GraphQL calls in frontmatter
Ghost -> Ghost Content API in frontmatter
Directus -> Directus SDK in frontmatter
```

## Anti-Patterns

### client:load for Everything
Using `client:load` unconditionally. Every eager island blocks the main thread during page load. Profile which islands genuinely need immediate interactivity.

### Client-Side Data Fetching When Server Can Do It

```tsx
// Anti-pattern: fetching in island useEffect
export default function Posts() {
  const [posts, setPosts] = useState([])
  useEffect(() => {
    fetch('/api/posts').then(r => r.json()).then(setPosts)
  }, [])
  return ...
}
```

```astro
---
// Correct: fetch in frontmatter
const posts = await getPosts()
---
<Posts initialPosts={posts} client:visible />
```

### Islands Inside Islands
Nesting framework islands of different types is not supported. A React island cannot contain a Vue island. Keep islands as leaf components.

### One Giant Island
```astro
---
// Anti-pattern: entire page as one island
---
<ClientOnlyApp client:load />
```
Instead, break into multiple smaller islands with appropriate directives.

### Mixing SSR and client:only
`client:only` skips SSR rendering. If the component renders different HTML on server vs client, use `client:load` and handle hydration mismatch gracefully.

### Forgetting Layout Shift on Hydration

```astro
<!-- Anti-pattern: no dimensions on island container -->
<Chart client:visible />

<!-- Correct -->
<Chart client:visible style="width: 100%; height: 400px;" />
```

### Using Framework Components for Static Content

```astro
---
// Anti-pattern: React component that has no interactivity
---
<StaticHeader client:load />
```

```astro
---
// Correct: pure .astro component
---
<StaticHeader />
```

### Global CSS in Framework Components
Importing CSS-in-JS or global CSS inside a framework island that duplicates styles already provided by the Astro layout. Keep styling in Astro's scoped `<style>` tags or global CSS imports.

### Overusing View Transitions
View transitions add client-side JS for navigation. For simple content sites, standard navigation is lighter. Use view transitions only when the UX benefit (shared element animations, persisted state) justifies the JS cost.

## Common Pitfalls

### Pitfall 1: Over-hydrating with client:load
Using `client:load` for every island defeats Astro's purpose. Each `client:load` island eagerly downloads its framework runtime and component code. Prefer `client:visible` or `client:idle` for non-critical elements.

### Pitfall 2: Shared State Across Islands
Astro islands are independent React/Vue/Svelte roots. They cannot share reactive state directly. Pass initial data as props; for cross-island communication, use DOM events or a shared data attribute.

### Pitfall 3: Missing Layout Shift Prevention
Hydrating an island after paint can cause layout shift. Always set explicit width/height on island containers:
```astro
<Chart client:visible style="width: 100%; height: 400px;" />
```

### Pitfall 4: Mixing Framework Runtimes
Each framework island (React, Vue, Svelte) ships its own runtime. Using three frameworks on one page triples the JS overhead. Stick to one framework for all islands when possible.

### Pitfall 5: Forgetting to Set output in config
Using `client:only` or SSR features without setting `output: 'hybrid'` or `output: 'server'` in `astro.config.mjs` causes build errors. SSG mode does not support server-only routes.

### Pitfall 6: Over-Nesting Islands
Placing islands inside other islands of the same framework works (React in React) but adds unnecessary complexity. Keep islands as leaf nodes in the .astro template.

## Compared With

### Astro Islands vs Qwik
| Aspect | Astro | Qwik |
|--------|-------|------|
| JS model | Zero JS, opt-in islands | Zero JS, lazy per event |
| Hydration | Per component (framework level) | Per event handler (fine-grained) |
| Multi-framework | Yes (React, Vue, Svelte, etc.) | Single framework |
| Content focus | Excellent (MDX, collections) | Good (SSR-focused) |
| Bundle size | Proportional to islands | Proportional to interactions |

### Astro vs Next.js
Astro excels at content sites with minimal JS. Next.js excels at highly interactive apps with server components. Astro's islands give finer control over hydration than Next.js's all-or-nothing client components, but Next.js has a richer ecosystem for data mutations.

### Astro vs Eleventy (11ty)
Both are content-focused static site generators. Astro adds island architecture and multi-framework support; 11ty is simpler with Nunjucks/Liquid templates. Astro suits projects needing occasional interactivity; 11ty suits purely static sites.

## Ecosystem & Tooling

### Core Packages
| Package | Purpose |
|---------|---------|
| astro | Core framework |
| @astrojs/react | React integration |
| @astrojs/vue | Vue integration |
| @astrojs/svelte | Svelte integration |
| @astrojs/solid-js | SolidJS integration |
| @astrojs/mdx | MDX support |
| @astrojs/tailwind | Tailwind CSS integration |
| @astrojs/sitemap | Sitemap generation |
| @astrojs/node | Node.js adapter |

### Tools
- **Astro VS Code Extension** — Syntax highlighting, IntelliSense for `.astro` files, content collection autocomplete.
- **astro check** — Type checking for `.astro` files.
- **astro add** — CLI for adding integrations (`npx astro add react`).
- **Astro Studio** — Managed content platform with Astro DB.

### Deployment Adapters
| Adapter | Platform |
|---------|----------|
| @astrojs/vercel | Vercel (SSR, Edge, ISR) |
| @astrojs/netlify | Netlify (SSR, Edge, On-demand builders) |
| @astrojs/cloudflare | Cloudflare Pages/Workers |
| @astrojs/deno | Deno Deploy |
| @astrojs/node | Self-hosted Node.js |

### Community
- Docs: docs.astro.build
- GitHub: github.com/withastro/astro
- Discord: astro.build/chat
- Themes: astro.build/themes

## Workflow

### Step 1: Island Hydration Strategy
Choose the least aggressive directive that meets the need:
| Directive | When | Example |
|-----------|------|---------|
| `client:load` | Immediately visible, must be interactive | Nav search, header auth |
| `client:idle` | Below-fold interactive | Comment forms, share buttons |
| `client:visible` | Below viewport, not urgent | Analytics widgets, chat |
| `client:media` | Responsive interactivity | Desktop-only sidebar |
| `client:only` | Client-only (no SSR render) | Browser-API-dependent charts |

```astro
<ShareButton client:visible />
<HeavyChart client:media="(min-width: 1024px)" />
```

### Step 2: Island Composition
Islands are isolated — no shared JS state across islands. Pass data as props:
```astro
---
import Counter from '../components/Counter.tsx'
const { count } = Astro.props
---
<Counter client:idle initialCount={count} />
```
For cross-island communication, use events or a shared data attribute on the parent.

### Step 3: Content Collections with Schemas
```ts
// src/content/config.ts
import { z, defineCollection, reference } from 'astro:content'

const authors = defineCollection({
  type: 'data',
  schema: z.object({ name: z.string(), avatar: z.string() }),
})

const blog = defineCollection({
  type: 'content',
  schema: ({ image }) => z.object({
    title: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.date().optional(),
    author: reference('authors'),
    cover: image(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
})

export const collections = { blog, authors }
```

### Step 4: View Transitions
```astro
---
import { ViewTransitions } from 'astro:transitions'
---
<!doctype html>
<html>
<head>
  <ViewTransitions />
</head>
<body>
  <nav>
    <a href="/" transition:name="home">Home</a>
    <a href="/blog" transition:name="blog">Blog</a>
  </nav>
  <main transition:persist>
    <slot />
  </main>
</body>
</html>
```
Use `transition:name` for cross-page element animation. Use `transition:persist` to keep elements alive across navigations (audio players, video).

### Step 5: Hybrid Rendering
```js
// astro.config.mjs
import { defineConfig } from 'astro/config'
export default defineConfig({
  output: 'hybrid',
})
```
```astro
---
// src/pages/blog/[slug].astro — static by default
export async function getStaticPaths() { /* ... */ }
---
```
```astro
---
// src/pages/dashboard/index.astro — server-rendered
export const prerender = false
---
```

### Step 6: Integration Patterns
```astro
---
import { Image } from 'astro:assets'
import myImage from '../assets/hero.png'
import ReactWidget from '../components/ReactWidget.tsx'
---
<Image src={myImage} alt="Hero" width={1200} height={600} format="webp" />
<ReactWidget client:idle widgetId="123" />
```

### Step 7: Middleware and Endpoints
```ts
// src/middleware.ts
import { defineMiddleware } from 'astro/middleware'
export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.user = await getUser(context.cookies)
  return next()
})
```
Use endpoints (`src/pages/api/*.ts`) for JSON APIs without HTML rendering.

## Rules
- Prefer the least aggressive hydration directive that satisfies the interaction requirement.
- Islands are isolated: pass props for initial state, use events for cross-island communication.
- All content collections must have Zod schemas — never use stringly-typed frontmatter.
- Use ViewTransitions for SPA-like navigation; add transition:name for shared elements.
- Hybrid rendering: static for content-heavy routes, server for authenticated/dynamic routes.
- Use Image/Picture from astro:assets for optimized images — never bare <img> tags.
- Framework islands are scoped — no global store shared across different framework islands.
- One framework per project when possible to minimize runtime overhead.
- Set explicit dimensions on island containers to prevent layout shift on hydration.
- Use output: 'hybrid' for mixed static + dynamic pages.

## References
- references/astro-component-strategies.md — Astro Component Strategies
- references/astro-performance.md — Astro Performance Reference
- references/astro-routing.md — Astro Routing Patterns
- references/astro-ssg.md — Astro SSG Patterns
- references/content-patterns.md — Astro Content Patterns
- references/island-patterns.md — Astro Island Patterns
- references/astro-content-collections.md — Astro Content Collections Deep Dive
- references/astro-integration-patterns.md — Astro Integration Patterns

## Handoff
No artifact produced.
Next skill: frontend-universal-seo for meta, sitemap, structured data. Or frontend-universal-performance for Core Web Vitals.
Carry forward: island hydration strategy, content collection schemas, hybrid rendering config.
