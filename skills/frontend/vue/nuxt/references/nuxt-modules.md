# Nuxt Modules

## Official Modules

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: [
    '@nuxt/ui',          // UI component library
    '@nuxt/image',       // Optimized images
    '@nuxt/content',     // File-based CMS
    '@nuxt/fonts',       // Font optimization
    '@nuxtjs/seo',       // Meta, sitemap, robots
    '@nuxtjs/i18n',      // Internationalization
    '@pinia/nuxt',       // State management
    '@vueuse/nuxt',      // Utility composables
    '@nuxt/scripts',     // Script management
    '@nuxt/test-utils',  // Testing utilities
  ],
})
```

## Module Configuration

```ts
// Image
export default defineNuxtConfig({
  image: {
    domains: ['images.example.com'],
    formats: ['webp', 'avif'],
    screens: { xs: 320, sm: 640, md: 768, lg: 1024, xl: 1280 },
  },
})

// i18n
export default defineNuxtConfig({
  i18n: {
    locales: [{ code: 'en', iso: 'en-US' }, { code: 'fr', iso: 'fr-FR' }],
    defaultLocale: 'en',
    strategy: 'prefix_except_default',
  },
})

// Content
export default defineNuxtConfig({
  content: {
    documentDriven: true,
    highlight: { theme: 'github-dark' },
  },
})
```

## Creating a Custom Module

```ts
// modules/my-module/index.ts
import { defineNuxtModule, addComponent, addImports, createResolver } from '@nuxt/kit'

export default defineNuxtModule({
  meta: { name: 'my-module', version: '1.0.0', configKey: 'myModule' },
  defaults: { apiKey: '', baseURL: '/api' },
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)

    // Add composable
    addImports({ name: 'useMyFeature', as: 'useMyFeature', from: resolver.resolve('./runtime/composables') })

    // Add component
    addComponent({ name: 'MyButton', filePath: resolver.resolve('./runtime/components/MyButton.vue') })
  },
})
```

## Module Best Practices

| Practice | Reason |
|----------|--------|
| Prefix modules `@nuxtjs/` or `nuxt-` | Convention |
| Use `@nuxt/kit` for module development | Official API |
| Provide defaults for all options | Easy setup |
| Export types for TypeScript | Type safety |
| Test with `@nuxt/test-utils` | Reliability |
| Document in module README | Usability |
