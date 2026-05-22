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

## Workflow

### Step 1: Component Model (.astro)
```astro
---
// This code runs at build time (SSG) or on each request (SSR)
const { title, children } = Astro.props
const items = await fetch('https://api.example.com/items').then(r => r.json())
---
<!-- HTML template — zero JS in output -->
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

<!-- Hydrates immediately -->
<ReactCounter client:load />

<!-- Hydrates when browser is idle -->
<VueSlider client:idle />

<!-- Hydrates when scrolled into view -->
<ReactModal client:visible />

<!-- Desktop only -->
<Chart client:media="(min-width: 768px)" />

<!-- Client-only (no SSR) -->
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

### Step 5: Deployment
```js
// astro.config.mjs
import { defineConfig } from 'astro/config'
import node from '@astrojs/node'
export default defineConfig({
  output: 'server', // 'static' for SSG, 'hybrid' for per-route
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

## References
- `references/astro-islands.md` — client directives, hydration strategies, framework components
- `references/astro-content.md` — collections, schemas, rendering, images

## Handoff
No artifact produced.
Next skill: frontend-universal-seo for meta, sitemap, structured data. Or frontend-universal-pwa for service worker.
Carry forward: island strategy, content collection schema, adapter config.
