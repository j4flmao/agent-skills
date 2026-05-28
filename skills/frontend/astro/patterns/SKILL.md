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

## Performance Considerations

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
