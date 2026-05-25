# Nuxt Performance Patterns

## Data Fetching Optimization

```vue
<script setup lang="ts">
// ✅ useFetch — deduplicates, caches, SSR-compatible
const { data, pending, error } = await useFetch('/api/products', {
  query: { page: computed(() => page.value) },
  key: 'products-list',
  transform: (data) => data.products,
})

// ✅ With cache control
const { data } = await useFetch('/api/static-data', {
  headers: { 'Cache-Control': 'public, max-age=3600' },
})

// ❌ Wrong: Multiple overlapping calls
await useFetch('/api/products')
await useFetch('/api/products')  // Deduplication handles this, but still wasteful
</script>
```

## Image Optimization

```vue
<template>
  <NuxtImg
    src="/hero.jpg"
    width="1200"
    height="600"
    format="webp"
    loading="lazy"
    densities="x1 x2"
  />
  <NuxtPicture
    src="/banner.jpg"
    :img-attrs="{ alt: 'Banner' }"
    sizes="sm:100vw md:50vw lg:400px"
  />
</template>
```

## Bundle Optimization

```ts
export default defineNuxtConfig({
  nitro: {
    minify: true,
    compressPublicAssets: true,
  },
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['vue', 'vue-router'],
            ui: ['@nuxt/ui'],
          },
        },
      },
    },
  },
  build: {
    analyze: true,  // Bundle analyzer
  },
})
```

## Lazy Hydration

```vue
<template>
  <LazyHeavyComponent />
</template>

<script setup lang="ts">
// Components prefixed with Lazy are code-split
const { data } = await useFetch('/api/data')
</script>
```

## Hybrid Rendering

```ts
export default defineNuxtConfig({
  routeRules: {
    '/': { prerender: true },
    '/blog/**': { prerender: true },
    '/dashboard/**': { ssr: true },
    '/admin/**': { ssr: false },
    '/api/**': { cors: true },
  },
})
```

## Performance Budget

| Metric | Target |
|--------|--------|
| Initial JS | <100kB |
| SSR response | <200ms |
| LCP | <2.5s |
| CLS | <0.1 |
| Build time (100 pages) | <30s |
