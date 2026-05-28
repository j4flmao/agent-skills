# Astro Integration Patterns

## Introduction

Astro's integration system allows extending the framework with custom behavior. Integrations can add features, modify the build process, inject code, and configure the dev server. Astro's official integrations cover frameworks (React, Vue, Svelte, SolidJS), tools (Tailwind, MDX, Partytown), and deployment targets (Vercel, Netlify, Cloudflare).

This guide covers integration patterns from consumption through creation, including multi-framework setups, deployment configuration, and custom integration development.

## Official Integrations Overview

### Framework Integrations

Each framework integration adds:
- Vite plugin for framework compilation
- Client directive support (client:load, client:idle, client:visible, etc.)
- SSR rendering for the framework
- Component type recognition (.tsx, .vue, .svelte files)

```js
// astro.config.mjs
import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import vue from '@astrojs/vue'
import svelte from '@astrojs/svelte'
import solid from '@astrojs/solid-js'
import preact from '@astrojs/preact'
import lit from '@astrojs/lit'

export default defineConfig({
  integrations: [
    react({ include: ['**/react/*'] }),
    vue({ include: ['**/vue/*'] }),
    svelte({ include: ['**/svelte/*'] }),
    solid({ include: ['**/solid/*'] }),
  ],
})
```

### Tool Integrations

```js
import { defineConfig } from 'astro/config'
import tailwind from '@astrojs/tailwind'
import mdx from '@astrojs/mdx'
import partytown from '@astrojs/partytown'
import sitemap from '@astrojs/sitemap'
import compress from '@playform/compress'

export default defineConfig({
  site: 'https://example.com',
  integrations: [
    tailwind({
      configFile: './tailwind.config.cjs',
      applyBaseStyles: true,
    }),
    mdx(),
    partytown({ config: { forward: ['dataLayer.push'] } }),
    sitemap({
      filter: (page) => !page.includes('/admin/'),
      customPages: ['https://example.com/custom-page'],
    }),
    compress({
      HTML: true,
      CSS: true,
      JS: true,
      Image: false,
    }),
  ],
})
```

### Deployment Adapters

```js
import { defineConfig } from 'astro/config'
import vercel from '@astrojs/vercel/serverless'
import netlify from '@astrojs/netlify'
import cloudflare from '@astrojs/cloudflare'
import node from '@astrojs/node'

export default defineConfig({
  output: 'server',
  adapter: vercel({
    webAnalytics: { enabled: true },
    imageService: true,
    functionPerRoute: false,
  }),
})
```

## Multi-Framework Strategy

### When to Use Multiple Frameworks

| Scenario | Framework Combination |
|----------|----------------------|
| Marketing site with interactive charts | Astro + React (chart library) |
| Blog with Vue-like templates | Astro + Vue |
| High-performance dashboard | Astro + SolidJS |
| Existing component library | Astro + existing framework |
| Migration path | Astro + old framework + new framework |

### Performance Impact of Multiple Frameworks

```astro
---
import ReactWidget from '../components/react/Widget.tsx'
import VueCounter from '../components/vue/Counter.vue'
import SvelteSlider from '../components/svelte/Slider.svelte'
---

<ReactWidget client:load />     <!-- Loads React runtime: ~45KB -->
<VueCounter client:idle />       <!-- Loads Vue runtime: ~16KB -->
<SvelteSlider client:visible />  <!-- Loads Svelte runtime: ~2KB -->
```

Each framework ships its own runtime. The total JS downloaded is the sum of all framework runtimes used on the page. For performance-critical pages, stick to one framework.

### Framework-Specific Directories

Use the `include` option to organize components by framework:

```js
import react from '@astrojs/react'
import vue from '@astrojs/vue'

export default defineConfig({
  integrations: [
    react({ include: ['**/react/**/*.{tsx,jsx}'] }),
    vue({ include: ['**/vue/**/*.vue'] }),
  ],
})
```

```
src/
  components/
    react/
      Widget.tsx
      Chart.tsx
    vue/
      Counter.vue
      Modal.vue
    shared/
      Layout.astro
```

## Integration Configuration Deep Dive

### Framework Integration Options

```js
react({
  include: ['**/react/*'],       // Glob pattern for component files
  exclude: [],                   // Exclude patterns
  experimentalReactChildren: false, // Support React Children in Astro
})

vue({
  include: ['**/vue/*'],
  jsx: true,                     // Enable JSX in .vue files
  appEntrypoint: '/src/vue-app.ts', // Custom Vue app setup
})

svelte({
  include: ['**/svelte/*'],
  compilerOptions: {              // Svelte compiler options
    runes: true,                  // Svelte 5 runes
  },
})

solid({
  include: ['**/solid/*'],
  devtools: true,                // Enable Solid Devtools
})
```

### Sitemap Integration Options

```js
sitemap({
  filter: (page) => !page.includes('/draft/'),
  customPages: [
    'https://example.com/external-page',
  ],
  entryLimit: 10000,
  changefreq: 'weekly',
  priority: 0.8,
  lastmod: new Date(),
  serialize: (item) => {
    if (item.url.includes('/blog/')) {
      item.changefreq = 'daily'
      item.priority = 0.9
    }
    return item
  },
})
```

### Tailwind Integration Options

```js
tailwind({
  configFile: './tailwind.config.cjs',
  applyBaseStyles: true,         // Apply @tailwind base/components/utilities
  nesting: true,                 // Enable CSS nesting (like postcss-nesting)
})
```

### Partytown Integration

Partytown moves third-party scripts (analytics, ads, tracking) off the main thread:

```js
import partytown from '@astrojs/partytown'

export default defineConfig({
  integrations: [
    partytown({
      config: {
        forward: ['dataLayer.push'],
        debug: false,
        resolveUrl: (url) => {
          // Modify URLs for proxying
          return url
        },
      },
    }),
  ],
})
```

```astro
<!-- Forward analytics to Partytown web worker -->
<script type="text/partytown">
  window.dataLayer = window.dataLayer || []
  function gtag() { dataLayer.push(arguments) }
  gtag('js', new Date())
  gtag('config', 'GA_MEASUREMENT_ID')
</script>
```

## Creating Custom Integrations

### Integration Structure

```js
// my-integration/index.js
export default function createMyIntegration(options) {
  return {
    name: 'my-integration',
    hooks: {
      'astro:config:setup': ({ config, updateConfig, injectScript, addRenderer }) => {
        // Modify Astro config
      },
      'astro:config:done': ({ config }) => {
        // Access final config
      },
      'astro:server:setup': ({ server }) => {
        // Modify dev server
      },
      'astro:server:start': ({ address }) => {
        // Server started
      },
      'astro:build:start': () => {
        // Build starting
      },
      'astro:build:setup': ({ viteConfig, pages }) => {
        // Configure Vite for build
      },
      'astro:build:generated': ({ dir }) => {
        // Static files generated
      },
      'astro:build:ssr': ({ dir }) => {
        // SSR build
      },
      'astro:build:done': ({ dir, pages, routes }) => {
        // Build complete
      },
    },
  }
}
```

### Example: Custom Logger Integration

```js
// astro-logger/index.js
export default function createLogger(options = {}) {
  const { prefix = '[Astro]', level = 'info' } = options

  return {
    name: 'astro-logger',
    hooks: {
      'astro:config:setup': () => {
        console.log(`${prefix} Config setup`)
      },
      'astro:server:start': ({ address }) => {
        console.log(`${prefix} Server running at ${address}`)
      },
      'astro:build:done': ({ dir }) => {
        console.log(`${prefix} Build output in ${dir}`)
      },
    },
  }
}
```

### Example: Custom Framework Integration

```js
// astro-my-framework/index.js
export default function createMyFrameworkIntegration() {
  return {
    name: 'astro-my-framework',
    hooks: {
      'astro:config:setup': ({ addRenderer, updateConfig }) => {
        // Add a renderer for the framework
        addRenderer({
          name: 'my-framework',
          clientEntrypoint: '@astrojs/my-framework/client.js',
          serverEntrypoint: '@astrojs/my-framework/server.js',
          jsxImportSource: 'my-framework',
          jsxTransformOptions: async () => ({
            plugins: [],
          }),
        })

        // Configure Vite
        updateConfig({
          vite: {
            plugins: [myFrameworkVitePlugin()],
          },
        })
      },
    },
  }
}
```

### Example: Injecting Scripts

```js
// astro-inject-analytics/index.js
export default function createAnalytics(options) {
  const { id } = options

  return {
    name: 'astro-analytics',
    hooks: {
      'astro:config:setup': ({ injectScript }) => {
        // Inject into the page <head>
        injectScript('head-inline', `
          window.ANALYTICS_ID = '${id}';
          console.log('Analytics initialized');
        `)

        // Inject external script
        injectScript('head', 'https://cdn.analytics.com/script.js')
      },
    },
  }
}
```

### Example: Custom Vite Configuration

```js
// astro-svg-loader/index.js
import { svgLoader } from 'vite-svg-loader'

export default function createSvgLoader() {
  return {
    name: 'astro-svg-loader',
    hooks: {
      'astro:config:setup': ({ updateConfig }) => {
        updateConfig({
          vite: {
            plugins: [svgLoader()],
          },
        })
      },
    },
  }
}
```

## Integration Development Best Practices

### Testing Integrations

```js
import { expect, test } from 'vitest'
import { testIntegration } from 'astro/test-utils'

test('my integration modifies config', async () => {
  const result = await testIntegration({
    integrations: [myIntegration({ option: 'value' })],
    root: './fixtures/test-project',
  })

  expect(result.config.markdown.shikiTheme).toBe('dracula')
})
```

### Integration Composition

```js
// Combine multiple sub-integrations
export default function createSuite() {
  return [
    createLogger(),
    createAnalytics({ id: 'UA-XXXXX' }),
    createSvgLoader(),
  ]
}
```

### Options Validation

```js
import { z } from 'zod'

const optionsSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  endpoint: z.string().url().default('https://api.example.com'),
  debug: z.boolean().default(false),
})

export default function createIntegration(userOptions) {
  const options = optionsSchema.parse(userOptions)

  return {
    name: 'validated-integration',
    hooks: {
      'astro:config:setup': () => {
        console.log(`Using endpoint: ${options.endpoint}`)
      },
    },
  }
}
```

## Integration Ordering

Integration order matters. They run in the order specified in the `integrations` array:

```js
// Plugins that modify config run first
// Plugins that add renderers run next
// Plugins that deploy run last (adapters)

export default defineConfig({
  integrations: [
    react(),     // 1. Add React rendering
    tailwind(),  // 2. Configure Tailwind
    sitemap(),   // 3. Add sitemap generation
    vercel(),    // 4. Configure Vercel deployment adapter
  ],
})
```

Adapters (deployment integrations) should always be last in the array because they consume the final build output.

## Integration Ecosystem

### Official Integrations

| Integration | Category | Purpose |
|-------------|----------|---------|
| @astrojs/react | Framework | React 18+ support |
| @astrojs/vue | Framework | Vue 3 support |
| @astrojs/svelte | Framework | Svelte 4/5 support |
| @astrojs/solid-js | Framework | SolidJS support |
| @astrojs/preact | Framework | Preact support |
| @astrojs/lit | Framework | Lit support |
| @astrojs/alpinejs | Framework | Alpine.js support |
| @astrojs/mdx | Content | MDX support |
| @astrojs/tailwind | CSS | Tailwind CSS |
| @astrojs/sitemap | SEO | Sitemap generation |
| @astrojs/partytown | Performance | Third-party script optimization |
| @astrojs/compress | Performance | Asset compression |
| @astrojs/node | Deployment | Node.js adapter |
| @astrojs/vercel | Deployment | Vercel adapter |
| @astrojs/netlify | Deployment | Netlify adapter |
| @astrojs/cloudflare | Deployment | Cloudflare adapter |
| @astrojs/deno | Deployment | Deno adapter |

### Community Integrations

| Integration | Purpose |
|-------------|---------|
| @astrojs/db | Database and content management |
| astro-icon | SVG icon system |
| astro-seo | SEO metadata helper |
| astro-robots-txt | Robots.txt generation |
| astro-pwa | PWA support |
| astro-analytics | Analytics injection |
| astro-form | Form handling |
| astro-embed | Embed support (YouTube, Twitter) |

## Troubleshooting

### Common Integration Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Component not found | Integration not installed | Run `npx astro add <integration>` |
| Framework runtime not loading | Wrong include/exclude patterns | Check `include` glob in config |
| SSR rendering fails | Missing SSR adapter | Add adapter for deployment target |
| Vite plugin conflicts | Plugin ordering | Reorder integrations or resolve via `vite.plugins` |
| Build too slow | Too many integrations | Remove unused integrations |
| HMR not working | Framework integration conflict | Check framework version compatibility |

### Debugging Integrations

```bash
# Verbose logging
astro build --verbose

# Check which integrations are loaded
astro check
```

## Summary

| Pattern | Best For |
|---------|----------|
| Single framework | New projects, performance |
| Multi-framework | Migration, using specific libraries |
| Custom integration | Reusable configuration, automation |
| Deployment adapter | Platform-specific features |
| Partytown | Third-party script optimization |
| Custom Vite plugins | Advanced build customization |
