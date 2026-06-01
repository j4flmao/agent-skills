---
name: frontend-astro-architecture
description: >
  Use this skill when the user says 'Astro', 'Astro architecture', 'Astro islands', 'Astro component', 'Astro page', 'Astro content collection', 'Astro SSG', 'Astro SSR', '.astro file'. This skill enforces: zero-JS-by-default component model, island architecture with client:* directives, file-based routing, type-safe content collections with Zod schemas, and per-deployment adapter configuration. Requires Astro project (package.json with astro). Do NOT use for: Next.js, SPA-only frameworks, or projects needing full client-side hydration.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, astro, phase-7]
---

# Astro Architecture

## Purpose
Build content-focused websites with Astro's zero-JS-by-default approach. Use islands for interactive parts, content collections for type-safe markdown, and adapters for deployment flexibility.

## Agent Protocol

### Trigger
Exact user phrases: "Astro", "Astro architecture", "Astro islands", "Astro component", "Astro page", "Astro content collection", "Astro SSG", "Astro SSR", ".astro file".

### Input Context
Before activating, verify:
- package.json has astro dependency.
- Whether the project uses SSG, SSR, or hybrid mode.
- Which framework integrations (React, Vue, Svelte, Solid) are configured.
- Content collection structure in src/content/.

### Output Artifact
No file output. Produces component patterns, island strategies, content collection schemas, and deployment config as text.

### Response Format
Component code: .astro file template. Island patterns: client directive usage. Content: Zod schema + query.

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Pages are .astro files with frontmatter separated by ---.
- [ ] Interactive components use client:* directives (load, idle, visible, media, only).
- [ ] Content collections have Zod schemas in src/content/config.ts.
- [ ] Images optimized via astro:assets Image/Picture components.
- [ ] Adapter configured for target deployment (node/deno/cloudflare/netlify).
- [ ] Zero JS by default — only hydrated islands ship framework JS.

### Max Response Length
Component code: 20 lines. Island examples: 10 lines each.

## Component Architecture / Decision Trees

### Architecture Options

| Approach | Trade-off | When to Use |
|----------|-----------|-------------|
| Pure .astro components | Zero JS, fully static | Content pages, headers, layout shells |
| Framework islands via client:* | JS for interactivity | Widgets, forms, interactive UI |
| MDX components | Markdown + component interop | Blogs with embedded interactive content |
| Server endpoints (.ts) | JSON API, no HTML rendering | API routes, form handlers |
| Middleware | Per-request processing | Auth, redirects, logging |

### Decision Tree: Rendering Mode

```
Is the site mostly static content (blog, docs, marketing)?
  ├── Yes -> output: 'static' (SSG)
  └── No -> Are some routes dynamic?
       ├── Yes -> output: 'hybrid' (SSG + SSR per route)
       └── No -> output: 'server' (full SSR)
```

### Decision Tree: Component Framework

```
Does the component need client-side interactivity?
  ├── No -> .astro component (zero JS)
  └── Yes -> Which framework?
       ├── Already in project -> Use it
       ├── Need smallest runtime -> Preact or SolidJS
       ├── Need rich ecosystem -> React
       └── Need template syntax -> Vue or Svelte
```

### Decision Tree: Hydration Timing

```
When does the user need this component?
  ├── Immediately visible and interactive -> client:load
  ├── Visible but not urgent -> client:idle
  ├── Below the fold -> client:visible
  ├── Only on certain screen sizes -> client:media
  └── Browser-only, no SSR needed -> client:only
```

### Decision Tree: Content Source

```
Where does content live?
  ├── Local markdown/MDX files -> Content Collections
  ├── Headless CMS (Sanity, Contentful) -> CMS SDK in frontmatter
  ├── Database (SQLite, PostgreSQL) -> Server endpoint + fetch
  └── Git-based (MDX in repo) -> Content Collections + MDX integration
```

### Decision Tree: Data Fetching Strategy

```
Is data needed at build time or request time?
  ├── Build time (static) -> fetch in frontmatter, getStaticPaths
  ├── Request time (SSR) -> fetch in frontmatter, no getStaticPaths
  └── Client-side (after hydration) -> fetch in framework component useEffect/onMount
```

### Decision Tree: Asset Handling

```
What type of asset?
  ├── Images -> astro:assets Image/Picture
  ├── Fonts -> @fontsource or local font files in public/
  ├── Third-party scripts -> Partytown or data-astro-script
  └── Styles -> <style> tag (scoped) or <style is:global> or CSS imports
```

## Component Design Patterns

### Layout Component

```astro
---
import Header from '../components/Header.astro'
import Footer from '../components/Footer.astro'
const { title } = Astro.props
---
<!doctype html>
<html lang="en">
<head><title>{title}</title></head>
<body>
  <Header />
  <slot />
  <Footer />
</body>
</html>
```

### Data-Fetching Page Component

```astro
---
import Layout from '../layouts/BlogLayout.astro'
import BlogCard from '../components/BlogCard.astro'

const response = await fetch('https://api.example.com/posts')
const posts = await response.json()
---
<Layout title="Blog">
  <h1>Blog</h1>
  <ul>
    {posts.map(post => (
      <BlogCard title={post.title} slug={post.slug} date={post.date} />
    ))}
  </ul>
</Layout>
```

### Dynamic Route with getStaticPaths

```astro
---
export async function getStaticPaths() {
  const posts = await fetch('https://api.example.com/posts').then(r => r.json())
  return posts.map(post => ({
    params: { slug: post.slug },
    props: { post },
  }))
}
const { post } = Astro.props
---
<h1>{post.title}</h1>
<article>{post.content}</article>
```

### Hybrid Route (SSR per-route)

```astro
---
// This page is server-rendered even with output: 'hybrid'
export const prerender = false

const session = Astro.locals.session
if (!session) return Astro.redirect('/login')
---
<h1>Dashboard</h1>
```

### Framework Island Component

```astro
---
import InteractiveMap from '../components/InteractiveMap.tsx'
---
<!-- Hydrates when page is idle -->
<InteractiveMap client:idle latitude={51.5} longitude={-0.12} />
```

### Server Endpoint

```ts
// src/pages/api/posts.ts
export async function GET({ params, request }) {
  const posts = await db.query('SELECT * FROM posts')
  return new Response(JSON.stringify(posts), {
    headers: { 'Content-Type': 'application/json' },
  })
}
```

### Middleware Pattern

```ts
// src/middleware.ts
import { defineMiddleware } from 'astro/middleware'

export const onRequest = defineMiddleware(async (context, next) => {
  const start = Date.now()
  const response = await next()
  const elapsed = Date.now() - start
  response.headers.set('X-Render-Time', String(elapsed))
  return response
})
```

### Content Collection Query Pattern

```astro
---
import { getCollection } from 'astro:content'

const posts = await getCollection('blog', ({ data }) => !data.draft)
const sorted = posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
const featured = sorted.slice(0, 3)
---
{featured.map(post => <a href={`/blog/${post.slug}`}>{post.data.title}</a>)}
```

## State Management Patterns

Astro pages are rendered on the server (SSG or SSR) and ship zero JS by default. State management only applies to framework islands, which are isolated from each other.

### Props-Only State (Recommended)

Pass initial data from Astro frontmatter to framework islands as props. Islands manage their own internal state:

```astro
---
import TodoWidget from '../components/TodoWidget.tsx'
const initialTodos = await getCollection('todos')
---
<TodoWidget client:load initialTodos={initialTodos.map(t => ({ id: t.id, text: t.data.text }))} />
```

```tsx
// TodoWidget.tsx
import { useState } from 'react'
export default function TodoWidget({ initialTodos }) {
  const [todos, setTodos] = useState(initialTodos)
  return <ul>{todos.map(t => <li key={t.id}>{t.text}</li>)}</ul>
}
```

### Cross-Island Communication via DOM Events

```astro
---
import Sender from '../components/Sender.svelte'
import Receiver from '../components/Receiver.svelte'
---
<Sender client:load />
<Receiver client:load />
```

```svelte
<!-- Sender.svelte -->
<script>
  function send() {
    window.dispatchEvent(new CustomEvent('app:message', { detail: 'hello' }))
  }
</script>
<button on:click={send}>Send</button>
```

```svelte
<!-- Receiver.svelte -->
<script>
  let message = ''
  function handleEvent(e) { message = e.detail }
</script>
<svelte:window on:app:message={handleEvent} />
<p>{message}</p>
```

### Global Store per Framework

Use your framework's state management within individual islands. React islands can use Zustand or Jotai. Vue islands can use Pinia. Islands of different frameworks cannot share the same store instance.

### URL-Driven State

For page-level state that should survive navigation, use URL search params:

```astro
---
const search = Astro.url.searchParams.get('q') || ''
const results = await searchPosts(search)
---
<SearchResults query={search} results={results} client:load />
```

## Performance Optimization

### Zero-JS Baseline
Content-only pages with no framework islands ship zero JavaScript. Astro strips all JS from .astro components at build time, leaving only HTML and CSS. This gives perfect Lighthouse scores by default.

### Island Hydration Cost
Each island type (React, Vue, etc.) loads its own framework runtime on first hydration. The runtime is cached and reused for subsequent islands of the same type. A page with 5 React islands pays the React runtime cost once (~45KB gzipped).

### Streaming SSR
In SSR mode, Astro streams HTML to the browser. Framework islands are rendered as streams are flushed. Use `Astro.slots.render()` for streaming slot content.

### Image Pipeline
`astro:assets` provides:
- Automatic format conversion (WebP, AVIF)
- Responsive srcset generation
- Lazy loading via native `loading="lazy"`
- Width/height enforcement to prevent CLS

### Memory in SSG Builds
Building thousands of pages in SSG mode uses significant memory. Each page renders in isolation. For sites with 100K+ pages, use `output: 'hybrid'` with on-demand rendering for less-visited routes.

### CSS Optimization
- Scoped `<style>` tags generate unique class names per component, preventing style leaks
- `<style is:global>` applies globally without scoping
- Use `@astrojs/tailwind` for utility-first CSS with automatic purging
- CSS is inlined by default for fast first paint; configure external extraction in production

### Script Loading Strategies
- Inline `<script>` tags in .astro files are bundled and optimized
- Use `data-astro-script` for fine-grained script loading control
- Use `@astrojs/partytown` for third-party scripts (analytics, tracking) — moves them to a web worker
- Framework island scripts load lazily via the chosen client directive

### Build Output Analysis
- `astro build` generates static HTML in `dist/` for SSG mode
- In SSR mode, output depends on adapter (e.g., Node.js server, Cloudflare Worker, Deno)
- Use `astro build --analyze` or `rollup-plugin-visualizer` to inspect bundle sizes
- Enable `compressHTML: true` in astro.config.mjs to minify HTML output
- Enable `scopedStyleStrategy: 'class'` to reduce CSS output size

## Build & Bundle Considerations

### Build Configuration

```js
// astro.config.mjs
import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'

export default defineConfig({
  site: 'https://example.com',
  output: 'hybrid',
  integrations: [react(), sitemap()],
  build: {
    format: 'file',      // 'file' for /about.html, 'directory' for /about/index.html
    assets: '_assets',   // Custom asset prefix
    inlineStylesheets: 'auto', // 'always' | 'auto' | 'never'
  },
  compressHTML: true,
  scopedStyleStrategy: 'class',  // 'class' | 'attribute'
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
          },
        },
      },
    },
  },
})
```

### Code Splitting
- Each page builds independently in SSG mode
- Framework runtimes are shared across islands of the same type on a page
- Use Vite's `manualChunks` to split vendor code in SSR mode
- Dynamic imports in framework islands are code-split automatically

### Asset Fingerprinting
Astro automatically adds content hashes to asset filenames for cache busting. Configure via `vite.build.assetsInlineLimit` to control inlining threshold for small assets.

### Public Directory
Files in `public/` are copied to the build output as-is, with no processing. Use for:
- `robots.txt`
- `favicon.ico`
- `CNAME` for custom domains
- Files that must be available at specific URLs

### Environment Variables
```astro
---
// Accessible in frontmatter
const apiKey = import.meta.env.API_KEY
const mode = import.meta.env.MODE  // 'development' | 'production'
const isDev = import.meta.env.DEV
const isProd = import.meta.env.PROD
---
```
Prefix public env vars with `PUBLIC_` (e.g., `PUBLIC_API_URL`). Private env vars are only available in server-side code (frontmatter, endpoints, middleware).

## Testing Strategies

### Unit Testing .astro Components
Astro components render to HTML strings. Use `astro/virtual-modules/astro-server` for testing:

```ts
// components/__tests__/Header.test.ts
import { expect, test } from 'vitest'
import { render } from 'astro/test-utils'

test('Header renders title', async () => {
  const html = await render('./src/components/Header.astro', { props: { title: 'Hello' } })
  expect(html).toContain('Hello')
})
```

### Testing Content Collections
```ts
// src/content/__tests__/schemas.test.ts
import { expect, test } from 'vitest'
import { z } from 'astro:content'

const PostSchema = z.object({
  title: z.string().min(1),
  pubDate: z.coerce.date(),
  tags: z.array(z.string()).default([]),
})

test('validates post frontmatter', () => {
  const valid = PostSchema.parse({ title: 'Test', pubDate: '2024-01-01' })
  expect(valid.title).toBe('Test')
  expect(() => PostSchema.parse({ pubDate: '2024-01-01' })).toThrow()
})
```

### Testing Framework Islands
Test framework components (React, Vue, Svelte) using their respective testing libraries (React Testing Library, Vue Test Utils, etc.). Islands are standard framework components — no special Astro testing needed.

### E2E Testing with Playwright
```ts
// e2e/home.spec.ts
import { test, expect } from '@playwright/test'

test('homepage is static with zero JS', async ({ page }) => {
  await page.goto('/')
  const jsSize = await page.evaluate(() =>
    document.querySelectorAll('script').length
  )
  expect(jsSize).toBe(0) // No islands on this page
})

test('island hydrates on scroll', async ({ page }) => {
  await page.goto('/blog')
  const widget = page.locator('[data-island="chart"]')
  await expect(widget).toBeVisible()
  // Verify no JS loaded yet (below fold)
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await expect(widget).toBeHydrated() // Custom matcher
})
```

### Testing SSR Routes
```ts
// e2e/api.spec.ts
import { test, expect } from '@playwright/test'

test('API endpoint returns JSON', async ({ request }) => {
  const response = await request.get('/api/posts')
  expect(response.ok()).toBeTruthy()
  expect(await response.json()).toBeInstanceOf(Array)
})
```

### Visual Regression Testing
Use `@playwright/test` with `expect(page).toHaveScreenshot()` for visual comparison. Astro's deterministic SSG output makes it ideal for visual regression testing.

## Migration Patterns

### Migrating from Next.js to Astro

**Page conversion:**
```
Next.js: pages/[slug].tsx with getStaticProps
Astro: src/pages/[slug].astro with frontmatter fetch
```

```tsx
// Next.js pattern
export async function getStaticProps({ params }) {
  const post = await getPost(params.slug)
  return { props: { post } }
}
```

```astro
---
// Astro equivalent
export async function getStaticPaths() {
  const posts = await getPosts()
  return posts.map(p => ({ params: { slug: p.slug }, props: { post: p } }))
}
const { post } = Astro.props
---
```

**Layout conversion:**
```
Next.js: layouts/PostLayout.tsx with {children}
Astro: layouts/PostLayout.astro with <slot />
```

**Image conversion:**
```
next/image -> astro:assets Image
getServerSideProps -> frontmatter fetch or client:only island
API routes -> src/pages/api/*.ts endpoints
Middleware -> src/middleware.ts
```

### Migrating from Gatsby to Astro

Gatsby projects map well to Astro since both are SSG-first:

```
gatsby-plugin-image -> astro:assets Image
gatsby-source-filesystem -> Content Collections
gatsby-node.js createPages -> getStaticPaths
GraphQL queries -> frontmatter fetch or Content Collection queries
Gatsby Link -> standard <a> tags or <ClientRouter>
```

### Migrating from SPA (React/Vue/Svelte) to Astro

**Strategy 1: Incremental adoption via subdomain**
Migrate content pages first (blog, docs, marketing) while keeping the SPA for the app shell:
```
app.example.com -> SPA (unchanged)
www.example.com -> Astro (new)
```

**Strategy 2: Full migration with island preservation**
Wrap existing SPA components as Astro islands:
```astro
---
import OldReactComponent from '../components/OldReactComponent.tsx'
---
<OldReactComponent client:load />
```

**Strategy 3: Hybrid with iframe**
Embed the legacy SPA in an iframe for transitional periods, replacing sections incrementally.

### Content Migration
```
WordPress/WP REST API -> fetch in frontmatter, generate static pages
MDX in Next.js -> Content Collections with MDX integration
Notion/Google Docs -> Export to markdown, import to src/content/
Sanity/Contentful -> CMS SDK calls in frontmatter
```

## Anti-Patterns

### Over-Hydration
Using `client:load` on every island when `client:visible` or `client:idle` would suffice. Every hydrated island downloads its framework runtime eagerly. Audit hydration directives regularly.

### Global State Across Islands
Attempting to share a React context or Vue provide/inject across different islands. Islands are independent React/Vue/Svelte roots — they cannot share reactive state directly. Use DOM events, URL state, or localStorage instead.

### Data Fetching in Component Frontmatter
```astro
---
// Anti-pattern: component fetching its own data
const item = await fetch(`https://api.example.com/items/${Astro.props.id}`).then(r => r.json())
---
```
Fetch data in page frontmatter and pass as props. Component frontmatter re-runs in every context, making it harder to cache and control.

### Missing getStaticPaths for Dynamic SSG Routes
In SSG mode, dynamic routes like `[slug].astro` require `getStaticPaths` to define all possible paths at build time. Without it, the build will fail for dynamic segments.

### Multiple Framework Runtimes on One Page
Using React, Vue, and Svelte islands on the same page downloads three separate framework runtimes (~63KB combined). Stick to one framework for all islands when possible.

### Server-Only Routes Without Adapter
Setting `output: 'server'` or `output: 'hybrid'` without configuring an adapter causes build errors. SSR/hybrid modes require `@astrojs/node`, `@astrojs/vercel`, or similar.

### Mixing client:only with SSR-Dependent Features
`client:only` skips SSR entirely. If the component relies on initial HTML from the server (SEO-critical content, meta tags), use `client:load` instead.

### Large Islands
Putting an entire page inside a framework island defeats Astro's purpose. Only island the interactive parts — keep the static shell as `.astro` components.

### Imperative DOM in .astro Frontmatter
```astro
---
// Anti-pattern: frontmatter runs on server, no DOM access
document.title = 'My Page' // Will crash in SSG/SSR
---
```

### Forgetting Layout Shift Prevention
Hydrating an island after paint can cause layout shift if no explicit dimensions are set on the container:
```astro
<!-- Anti-pattern -->
<Chart client:visible />

<!-- Correct -->
<Chart client:visible style="width: 100%; height: 400px;" />
```

## Common Pitfalls

### Pitfall 1: Adding JS to Everything
Astro's power is zero-JS output. If a component doesn't need interactivity (click handlers, state, effects), keep it as a pure `.astro` component. Don't add a framework just for convenience.

### Pitfall 2: Incorrect Adapter Configuration
```js
// Wrong — missing adapter for SSR
export default defineConfig({ output: 'server' })

// Correct
import node from '@astrojs/node'
export default defineConfig({ output: 'server', adapter: node() })
```
SSR and hybrid modes require an adapter. SSG mode does not.

### Pitfall 3: Data Fetching in Component Templates
```astro
---
// Wrong — fetching in component, not page
---
```
Fetch data in page components and pass down via props. Component frontmatter runs on every render — keep it pure.

### Pitfall 4: Forgetting getStaticPaths for Dynamic SSG Routes
Without `getStaticPaths`, dynamic routes like `[slug].astro` cannot be pre-rendered in SSG mode. Always export it for dynamic SSG routes, or set `prerender = false` for SSR.

### Pitfall 5: Mixing Client Directives Incorrectly
`client:only` skips SSR entirely. If the component relies on initial HTML from the server (SEO-critical content), use `client:load` instead. Use `client:only` only for components that need browser APIs at mount.

## Compared With

### Astro vs Next.js
| Aspect | Astro | Next.js |
|--------|-------|---------|
| Default output | Zero JS | JS by default |
| Hydration model | Island architecture | Server Components + Client Components |
| Content collections | Built-in with Zod | MDX, external CMS |
| Image optimization | Built-in (astro:assets) | Built-in (next/image) |
| Data fetching | In frontmatter (SSR/SSG) | Server Components, getServerSideProps |
| Bundle size | Proportional to islands | Proportional to page |
| Best for | Content sites, marketing | Full-stack apps, e-commerce |

### Astro vs Hugo/11ty
Traditional SSGs lack Astro's island architecture and multi-framework support. Astro adds interactive widgets without sacrificing static performance.

### Astro vs Qwik
Both minimize JS, but differently: Astro ships zero JS by default and hydrates entire framework islands on interaction. Qwik ships zero JS by default and lazy-loads individual event handlers. Astro is simpler for content sites; Qwik is more granular for complex interactivity.

## Ecosystem & Tooling

### Core Packages
| Package | Purpose |
|---------|---------|
| astro | Core framework |
| @astrojs/mdx | MDX support for content |
| @astrojs/tailwind | Tailwind integration |
| @astrojs/sitemap | Automatic sitemap generation |
| @astrojs/partytown | Third-party script optimization |
| @astrojs/markdoc | Markdoc support |

### Framework Integrations
| Package | Framework |
|---------|-----------|
| @astrojs/react | React 18+ |
| @astrojs/vue | Vue 3 |
| @astrojs/svelte | Svelte 4/5 |
| @astrojs/solid-js | SolidJS |
| @astrojs/preact | Preact |
| @astrojs/lit | Lit |
| @astrojs/alpinejs | Alpine.js |

### Tools
- **Astro VS Code Extension** — Autocomplete for `.astro` files, content collection schema validation, IntelliSense.
- **astro check** — CLI type checking.
- **astro add** — Quick integration setup (`npx astro add react`).
- **Astro Studio** — Managed Astro DB and content platform.

### Community
- Docs: docs.astro.build
- GitHub: github.com/withastro/astro
- Discord: astro.build/chat
- Themes: astro.build/themes

## Workflow

### Step 1: Component Model (.astro)
```astro
---
const { title, children } = Astro.props
const items = await fetch('https://api.example.com/items').then(r => r.json())
---
<h1>{title}</h1>
<ul>
  {items.map(item => <li>{item.name}</li>)}
</ul>
{children}
<style is:global>h1 { color: slate; }</style>
```

### Step 2: Island Architecture
```astro
---
import ReactCounter from '../components/ReactCounter.tsx'
import VueSlider from '../components/VueSlider.vue'
---
<ReactCounter client:load />
<VueSlider client:idle />
<ReactModal client:visible />
<Chart client:media="(min-width: 768px)" />
<Dashboard client:only="react" />
```

### Step 3: Routing
```
src/pages/
  index.astro             ->  /
  about.astro             ->  /about
  blog/
    index.astro           ->  /blog
    [slug].astro          ->  /blog/:slug
    tags/[tag].astro      ->  /blog/tags/:tag
```
Dynamic routes: `export async function getStaticPaths()` for SSG. Redirects in `astro.config.mjs`. Middleware in `src/middleware.ts` for SSR.

### Step 4: Content Collections
```ts
// src/content/config.ts
import { z, defineCollection } from 'astro:content'
const blog = defineCollection({
  type: 'content',
  schema: z.object({ title: z.string(), pubDate: z.coerce.date(), tags: z.array(z.string()).default([]) }),
})
export const collections = { blog }
```
```astro
---
const posts = await getCollection('blog', ({ data }) => !data.draft)
const { Content } = await render(posts[0])
---
<Content />
```

### Step 5: Image Optimization
```astro
---
import { Image, Picture } from 'astro:assets'
import hero from '../assets/hero.png'
---
<Image src={hero} alt="Hero" width={1200} height={600} format="webp" />
<Picture src={hero} formats={['avif', 'webp']} widths={[400, 800, 1200]} alt="Responsive" />
```

### Step 6: Deployment
```js
// astro.config.mjs
import { defineConfig } from 'astro/config'
import node from '@astrojs/node'
export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
})
```
Use `@astrojs/netlify`, `@astrojs/vercel`, `@astrojs/cloudflare` adapters. For SSG, output goes to `dist/`.

## Rules
- Zero JS by default — only hydrate what needs interactivity.
- Content collections are type-safe — always define Zod schemas.
- Islands are scoped — no global JS state between islands.
- One adapter per deployment target configured in astro.config.mjs.
- Use `Image` / `Picture` from astro:assets for optimized images.
- Frontmatter runs on server/build — keep data fetching there.
- SSG mode needs getStaticPaths for dynamic routes.
- SSR/hybrid modes require an adapter.
- Never import client-side code in .astro frontmatter.
- Use Astro.props for passing data to child components.

## References
- references/astro-collections.md — Astro Collections & Content Management
- references/astro-content.md — Astro Content — Collections, Schemas, Rendering, Images
- references/astro-data-loading.md — Astro Data Loading
- references/astro-integrations.md — Astro Integrations
- references/astro-islands.md — Astro Islands — Client Directives, Hydration Strategies, Framework Components
- references/astro-project-architecture.md — Astro Architecture
- references/astro-islands-architecture.md — Astro Islands Architecture Deep Dive
- references/astro-data-fetching.md — Astro Data Fetching Strategies

## Handoff
No artifact produced.
Next skill: frontend-universal-seo for meta, sitemap, structured data. Or frontend-universal-pwa for service worker.
Carry forward: island strategy, content collection schema, adapter config.
