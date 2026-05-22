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
- [ ] Island hydration chosen from most to least aggressive: load → idle → visible → media → only.
- [ ] Content collections have Zod schemas with validation.
- [ ] View transitions use <ViewTransition /> and transition:name directives.
- [ ] Hybrid rendering: static for content, server for dynamic routes.
- [ ] Nested islands pass data via props, not shared JS state.
- [ ] Image optimization via astro:assets Image/Picture.

### Max Response Length
2560 tokens.

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
---
import HeavyChart from '../components/HeavyChart.tsx'
import ShareButton from '../components/ShareButton.tsx'
---
<!-- Passive hydration first -->
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
<!-- Props serialized to HTML, island picks them up -->
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

```astro
---
const posts = await getCollection('blog', ({ data }) => !data.draft)
const sorted = posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
---
{posts.map(post => <ArticleCard post={post} />)}
```

### Step 4: View Transitions
```astro
---
// src/layouts/BaseLayout.astro
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
<!-- Astro-native image optimization -->
<Image src={myImage} alt="Hero" width={1200} height={600} format="webp" />

<!-- Framework island with passive hydration -->
<ReactWidget client:idle widgetId="123" />
```

## Rules
- Prefer the least aggressive hydration directive that satisfies the interaction requirement.
- Islands are isolated: pass props for initial state, use events for cross-island communication.
- All content collections must have Zod schemas — never use stringly-typed frontmatter.
- Use ViewTransitions for SPA-like navigation; add transition:name for shared elements.
- Hybrid rendering: static for content-heavy routes, server for authenticated/dynamic routes.
- Use Image/Picture from astro:assets for optimized images — never bare <img> tags.
- Framework islands are scoped — no global store shared across different framework islands.

## References
- `references/island-patterns.md` — client directives, island composition, lazy loading, framework islands
- `references/content-patterns.md` — content collections, schemas, markdown/MDX, SSR/SSG hybrid

## Handoff
No artifact produced.
Next skill: frontend-universal-seo for meta, sitemap, structured data. Or frontend-universal-performance for Core Web Vitals.
Carry forward: island hydration strategy, content collection schemas, hybrid rendering config.
