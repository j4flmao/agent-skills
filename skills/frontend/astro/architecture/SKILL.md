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

## Performance Considerations

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
