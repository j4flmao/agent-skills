# Astro Integrations

## Framework Integrations

```js
// astro.config.mjs
import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import vue from '@astrojs/vue'
import svelte from '@sveltejs/vite-plugin-svelte'
import solid from '@astrojs/solid-js'

export default defineConfig({
  integrations: [
    react({ include: ['**/react/*'] }),
    vue({ include: ['**/vue/*'] }),
    svelte(),
    solid(),
  ],
})
```

### Integration Patterns

| Integration | Install | Use Case |
|-------------|---------|----------|
| `@astrojs/react` | `npx astro add react` | Interactive components, existing React code |
| `@astrojs/vue` | `npx astro add vue` | Vue components as islands |
| `@astrojs/svelte` | `npx astro add svelte` | Lightweight interactive islands |
| `@astrojs/solid-js` | `npx astro add solid` | Signal-based islands, minimal JS |
| `@astrojs/preact` | `npx astro add preact` | Ultra-light interactive components |
| `@astrojs/lit` | `npx astro add lit` | Web components via Lit |

## Official Integrations

```js
import { defineConfig } from 'astro/config'
import tailwind from '@astrojs/tailwind'
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import partytown from '@astrojs/partytown'
import compressor from 'astro-compressor'

export default defineConfig({
  integrations: [
    tailwind({ applyBaseStyles: false }),
    mdx(),
    sitemap({ changefreq: 'weekly', priority: 0.7 }),
    partytown({ config: { forward: ['dataLayer.push'] } }),
    compressor(),
  ],
})
```

| Integration | Purpose |
|-------------|---------|
| `@astrojs/tailwind` | Tailwind CSS utility classes |
| `@astrojs/mdx` | MDX component support in content |
| `@astrojs/sitemap` | Automatic sitemap.xml generation |
| `@astrojs/partytown` | Third-party scripts in web workers |
| `@astrojs/alpinejs` | Alpine.js for simple interactivity |
| `astro-compressor` | Gzip/Brotli compression |

## Community Integrations

```js
import robotsTxt from 'astro-robots-txt'
import astroMetaTags from 'astro-seo'
import astroPurgeCss from 'astro-purgecss'

export default defineConfig({
  integrations: [
    robotsTxt({ sitemap: true }),
    astroMetaTags(),
    astroPurgeCss(),
  ],
})
```

## Custom Integration

```js
// integrations/my-analytics.js
export default function myAnalytics() {
  return {
    name: 'my-analytics',
    hooks: {
      'astro:config:setup': ({ injectScript }) => {
        injectScript('page', `
          window.addEventListener('load', () => {
            fetch('/api/analytics', { method: 'POST', body: JSON.stringify({ url: location.pathname }) })
          })
        `)
      },
      'astro:build:done': ({ pages }) => {
        console.log(`Built ${pages.length} pages`)
      },
    },
  }
}
```

## Adapter Integrations

```js
import netlify from '@astrojs/netlify'
import vercel from '@astrojs/vercel/serverless'
import cloudflare from '@astrojs/cloudflare'
import node from '@astrojs/node'

export default defineConfig({
  output: 'server',
  adapter: netlify(),
  // adapter: vercel(),
  // adapter: cloudflare(),
  // adapter: node({ mode: 'standalone' }),
})
```
