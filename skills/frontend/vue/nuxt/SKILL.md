---
name: vue-nuxt
description: >
  Use this skill when the user says 'Nuxt', 'Nuxt 3', 'Nuxt structure', 'Nuxt composables', 'Nuxt server routes', 'useFetch', 'useAsyncData', 'Nuxt layers', 'Nuxt architecture', or when building a Nuxt 3 application. This skill enforces: directory-based routing in pages/, useFetch for data fetching (preferred over useAsyncData), server routes in server/api/, auto-import from components/ and composables/, layouts with definePageMeta, and Nuxt layers for shared code across projects. Requires Nuxt 3 (nuxt.config.ts). Do NOT use for: plain Vue 3, Vite-only Vue, or React/Next.js.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, vue, nuxt, phase-3]
---

# Nuxt

## Purpose
Build Nuxt 3 applications with directory-based routing, server-side data fetching, and auto-imported components and composables. UseFetch for data, server/api/ for backend endpoints.

## Agent Protocol

### Trigger
Exact user phrases: "Nuxt", "Nuxt 3", "Nuxt structure", "Nuxt composables", "Nuxt server routes", "useFetch", "useAsyncData", "Nuxt layers", "Nuxt architecture".

### Input Context
Before activating, verify:
- nuxt.config.ts exists (Nuxt 3).
- The feature or page being created is known.

### Output Artifact
No file output. Produces directory structure and page/component code as text.

### Response Format
Directory structure:
```
app/
  pages/
  components/
  composables/
  server/api/
```

Code: SFC with script setup. No import statements.

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Pages use file-based routing in pages/ directory.
- [ ] Data fetching uses useFetch by default (useAsyncData when the data source is not an API).
- [ ] Server routes in server/api/ for backend logic.
- [ ] Components in components/ are auto-imported (globally available).
- [ ] Composables in composables/ are auto-imported.
- [ ] Layouts use definePageMeta for opt-in.
- [ ] Nuxt layers configured for shared code across projects (if multi-project).

### Max Response Length
2560 tokens.

## Component Architecture / Decision Trees

### Architecture Options

| Approach | Trade-off | When to Use |
|----------|-----------|-------------|
| useFetch | SSR-hydrated, caching, dedup | API data on page load |
| useAsyncData | SSR-hydrated, no automatic fetch | Custom async logic |
| $fetch | No SSR hydration, direct call | Mutations, client-only data |
| server/api/ | Backend endpoints | All server-side logic |
| server/routes/ | Non-API server routes | Webhooks, middleware |
| Pinia stores | Client state | Auth, cart, UI state |

### Decision Tree: Data Fetching

```
Is the data loaded on page render?
  ├── Yes -> Can it be fetched from an API URL?
  │    ├── Yes -> useFetch
  │    └── No (needs processing) -> useAsyncData + $fetch
  └── No (user action, mutation) -> $fetch
```

### Decision Tree: SSR vs Static vs SPA

```
Is SEO important?
  ├── Yes -> SSR (default) or prerender
  │    └── Static content that rarely changes -> prerender: true
  ├── Partially -> Hybrid SSR + prerender
  └── No (dashboard, admin) -> ssr: false in nuxt.config
```

### Decision Tree: State Location

```
Where is this state needed?
├── Single page -> ref/computed locally
├── Page + children -> useState or provide/inject
├── Multiple pages across routes -> Pinia store
└── Server-side state (DB, cache) -> useFetch / server route
```

## Component Design Patterns

### Page with useFetch

```vue
<script setup lang="ts">
definePageMeta({ layout: 'default', title: 'Products' })
const page = ref(1)
const { data, pending, error } = await useFetch('/api/products', {
  query: { page, limit: 20 },
  watch: [page],
  default: () => ({ products: [], total: 0 }),
})
</script>

<template>
  <div v-if="pending">Loading...</div>
  <div v-else-if="error">Error: {{ error.message }}</div>
  <div v-else>
    <ProductCard v-for="p in data.products" :key="p.id" :product="p" />
    <button @click="page++" :disabled="data.products.length >= data.total">Load More</button>
  </div>
</template>
```

### useAsyncData for Processed Data

```vue
<script setup lang="ts">
const { data: stats } = await useAsyncData('dashboard-stats', async () => {
  const [users, orders, revenue] = await Promise.all([
    $fetch('/api/stats/users'),
    $fetch('/api/stats/orders'),
    $fetch('/api/stats/revenue'),
  ])
  return { totalUsers: users.count, totalOrders: orders.count, revenue: revenue.amount }
})
</script>
```

### Server Route with Validation

```typescript
// server/api/products/[id].delete.ts
import { z } from 'zod'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const schema = z.object({ reason: z.string().min(1).optional() })
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Invalid body' })
  await db.product.delete({ where: { id } })
  return { success: true }
})
```

### Auth Middleware

```typescript
// middleware/auth.global.ts
export default defineNuxtRouteMiddleware(async (to, from) => {
  if (process.server) return // skip on first render
  const token = useCookie('token')
  if (!token.value && to.path !== '/login') return navigateTo('/login')
})
```

### Layout with definePageMeta

```vue
<!-- layouts/admin.vue -->
<script setup lang="ts">
const route = useRoute()
</script>

<template>
  <div class="admin-layout">
    <aside><slot name="sidebar" /></aside>
    <main><slot /></main>
  </div>
</template>
```

```vue
<!-- pages/admin/dashboard.vue -->
<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['auth'] })
</script>
```

## State Management Patterns

### useState for Shared Reactive State

```typescript
// composables/useCounter.ts
export function useCounter() {
  return useState('counter', () => 0)
}

// In any page/component:
const counter = useCounter()
counter.value++
```

### Pinia Store

```typescript
// stores/auth.store.ts
import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const isAuthenticated = computed(() => !!user.value)

  async function fetchUser() {
    user.value = await $fetch('/api/auth/me')
  }

  return { user, isAuthenticated, fetchUser }
})
```

### Cookie State

```typescript
const token = useCookie('token', { maxAge: 60 * 60 * 24 * 7, sameSite: 'lax', secure: true })
const preferences = useCookie('preferences', { default: () => ({ theme: 'light' }) })
```

useCookie is reactive — changing value updates the cookie and triggers re-render.

## Performance Optimization

### SSR-specific Optimizations
- useFetch/promise automatically deduplicates across components
- useAsyncData key ensures single fetch per unique key
- Preload critical data in server middleware
- Batch multiple $fetch calls with Promise.all in useAsyncData

### Client-side
- Dynamic imports with defineLazyEventHandler for server routes
- Prefetch page data with `<NuxtLink prefetch>`
- Lazy load components with `defineLazyComponent`
- Tree-shake server utilities from client bundles

### Caching
```typescript
// Nuxt 3 hybrid rendering per route
export default defineNuxtConfig({
  routeRules: {
    '/': { prerender: true },
    '/products': { swr: true },
    '/admin/**': { ssr: false },
    '/api/**': { cors: true },
  },
})
```

## Build & Bundle Considerations

### Nuxt Config

```typescript
export default defineNuxtConfig({
  modules: ['@pinia/nuxt', '@nuxtjs/tailwindcss', '@vueuse/nuxt'],
  css: ['~/assets/css/main.css'],
  nitro: {
    preset: 'vercel', // or 'node-server', 'cloudflare-pages', 'netlify'
    storage: {
      redis: { driver: 'redis', host: process.env.REDIS_HOST },
    },
  },
  app: {
    pageTransition: { name: 'fade', mode: 'out-in' },
  },
  build: {
    transpile: ['some-library'],
  },
})
```

### Environment Variables

```typescript
// Public (available in client + server): NUXT_PUBLIC_API_URL
// Private (server-only): DATABASE_URL, SECRET_KEY
// Usage: useRuntimeConfig().public.apiUrl
```

### Deployment

```bash
npm run build   # outputs .output/
npm run preview # preview production
```

## Testing Strategies

### Unit Test with Vitest

```typescript
import { describe, it, expect } from 'vitest'

describe('auth middleware', () => {
  it('redirects without token', async () => {
    const result = await defineNuxtRouteMiddleware((to) => {
      const token = useCookie('token')
      if (!token.value && to.path !== '/login') return navigateTo('/login')
    })
    // Test with mocked navigateTo
  })
})
```

### Component Test

```typescript
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, it, expect } from 'vitest'
import ProductCard from '~/components/ProductCard.vue'

describe('ProductCard', () => {
  it('renders product info', async () => {
    const wrapper = await mountSuspended(ProductCard, {
      props: { product: { id: '1', name: 'Widget', price: 10 } },
    })
    expect(wrapper.text()).toContain('Widget')
    expect(wrapper.text()).toContain('$10')
  })
})
```

### E2E Test

```typescript
import { test, expect } from '@playwright/test'

test('login flow', async ({ page }) => {
  await page.goto('/login')
  await page.fill('[name="email"]', 'test@test.com')
  await page.fill('[name="password"]', 'password')
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL('/dashboard')
})
```

## Migration Patterns

### Nuxt 2 to Nuxt 3

| Nuxt 2 | Nuxt 3 |
|--------|--------|
| pages/ with asyncData | pages/ + useFetch |
| static/ | public/ |
| store/ (Vuex) | stores/ (Pinia) |
| plugins/ inject | composables/ auto-import |
| @nuxt/content v1 | @nuxt/content v2 |
| nuxt.config.js | nuxt.config.ts (defineNuxtConfig) |

### Options API to Composition API

```vue
<!-- Nuxt 2 -->
<script>
export default { async asyncData() { return { posts: await fetch('/api/posts').then(r => r.json()) } } }
</script>

<!-- Nuxt 3 -->
<script setup lang="ts">
const { data: posts } = await useFetch('/api/posts')
</script>
```

## Anti-Patterns

### mixins in Nuxt 3

```typescript
// Anti-pattern: mixing logic across concerns
// Instead: use composables
export function useAuth() {
  const user = ref<User | null>(null)
  return { user }
}
```

### Fetching on Client

```vue
// Anti-pattern
<script setup>
onMounted(async () => {
  data.value = await $fetch('/api/users')
})
</script>

// Correct
const { data } = await useFetch('/api/users')
```

### Over-fetching in Layout

Use minimal data in layout load. Prefer per-page useFetch calls.

### Directly Accessing $fetch in Template

```vue
<!-- Anti-pattern: use in script setup -->
<button @click="$fetch('/api/logout')">Logout</button>

<!-- Correct -->
<script setup>
async function logout() { await $fetch('/api/logout') }
</script>
```

## Common Pitfalls

1. **useFetch outside async setup**: useFetch requires `await` in `<script setup>`.
2. **Missing error handling**: Always handle `error` from useFetch/useAsyncData.
3. **Overusing ssr:false**: Only disable SSR for truly client-only routes.
4. **Direct DOM access in SSR**: Use `onMounted` for browser-only code (ref access).
5. **Forgetting process.client check**: Wrap `window`-dependent code in `if (process.client)`.

## Compared With

| Aspect | Nuxt 3 | Next.js App | SvelteKit |
|--------|--------|-------------|-----------|
| Data fetching | useFetch | fetch in RSC | load() |
| Server routes | server/api/ | route.ts | +server.ts |
| Auto-import | Yes | No | No |
| State mgmt | useState / Pinia | Context / Zustand | Stores / runes |
| Bundle | ~35KB runtime | ~70KB | ~5KB |
| Rendering | SSR/SSG/SPA hybrid | SSR/SSG/ISR | SSR/SSG/SPA |

## Ecosystem & Tooling

| Package | Purpose |
|---------|---------|
| @pinia/nuxt | Pinia integration |
| @nuxtjs/tailwindcss | Tailwind CSS |
| @vueuse/nuxt | VueUse composables |
| @nuxt/content | Content management |
| @nuxt/image | Image optimization |
| @nuxtjs/i18n | Internationalization |
| nuxt-icon | Icon components |

## Workflow

### Step 1: Directory Conventions
```
app/
  app.vue                   -- Root component
  pages/index.vue           -- /
  pages/users/[id].vue      -- /users/:id
  components/AppHeader.vue  -- Auto-imported
  composables/useAuth.ts    -- Auto-imported
  layouts/default.vue       -- Default layout
  middleware/auth.ts        -- Route guard
  server/api/users.get.ts   -- GET /api/users
  stores/auth.store.ts      -- Pinia (import manually)
```

### Step 2: Data Fetching
```vue
<script setup>
const { data: users, refresh } = await useFetch('/api/users', { query: { role: 'admin' } })
</script>
```

### Step 3: Server Route
```typescript
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const user = await db.user.create({ data: body })
  return user
})
```

### Step 4: Auto-Import Rules
| Directory | Auto-Import | Reference |
|-----------|-------------|-----------|
| components/ | Yes | `<UiButton />` |
| composables/ | Yes | `useAuth()` |
| app/utils/ | Yes | `formatDate()` |
| server/utils/ | Yes (server) | `useDb()` |
| stores/ | No | import { useAuthStore } |

### Step 5: Middleware + Layouts
```typescript
defineNuxtRouteMiddleware((to) => { if (!user.value) return navigateTo('/login') })
definePageMeta({ layout: 'admin', middleware: ['auth'] })
```

### Step 6: Nuxt Layers
```typescript
export default defineNuxtConfig({
  extends: ['@my-org/ui-layer'],
})
```

## Rules
- Prefer useFetch over useAsyncData for external API calls.
- Server routes in server/api/. No external Express/Fastify servers.
- Components in components/ auto-imported globally.
- Layouts opt-in via definePageMeta.
- Pages/ directory auto-generates routes — do not manually configure router.
- Use $fetch for client-to-server calls, useFetch for SSR data loading.

## References
  - references/composables-autoimport.md
  - references/nuxt-auth.md
  - references/nuxt-conventions.md
  - references/nuxt-deployment.md
  - references/nuxt-modules.md
  - references/nuxt-performance.md
  - references/nuxt-testing.md
  - references/server-routes.md

## Handoff
No artifact produced.
Next skill: frontend-testing.
Carry forward: directory structure conventions, server route setup, data fetching approach.
