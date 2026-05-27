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

# Vue Nuxt

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
Directory structure: unlimited. Code: 15 lines per example.

## Workflow

### Step 1: Directory Conventions
```
app/
  app.vue                             -- Root component
  pages/                              -- File-based routing
    index.vue                         -- /
    login.vue                         -- /login
    users/
      index.vue                       -- /users
      [id].vue                        -- /users/:id
      [id]/settings.vue               -- /users/:id/settings
    error.vue                         -- Error page (replaces app error handling)
  components/                         -- Auto-imported globally
    AppHeader.vue
    ui/
      UiButton.vue
      UiModal.vue
  composables/                        -- Auto-imported globally
    useAuth.ts
    usePagination.ts
  layouts/                            -- Layouts (opt-in per page)
    default.vue
    auth.vue
  middleware/                         -- Route middleware
    auth.ts
  server/                             -- Nitro server
    api/
      users.get.ts                    -- GET /api/users
      users/[id].get.ts               -- GET /api/users/:id
    middleware/
    utils/
  stores/                             -- Pinia stores (NOT auto-imported)
    user.store.ts
  plugins/                            -- Vue plugins
    toast.ts
```

### Step 2: Data Fetching
```vue
<script setup lang="ts">
// useFetch — preferred for API calls (SSR-compatible, caches, deduplicates)
const { data: users, pending, error, refresh } = await useFetch('/api/users', {
  query: { page: 1 },
  key: 'users-list',
})

// useAsyncData — for non-API async logic (computed from raw data)
const { data: processed } = await useAsyncData('stats', async () => {
  const raw = await $fetch('/api/raw-data')
  return computeStats(raw)
})
</script>
```

| Feature | useFetch | useAsyncData |
|---------|----------|--------------|
| Auto-deduplication | Yes | Yes |
| SSR hydration | Yes | Yes |
| Auto-refresh on param change | Yes | Manual |
| Best for | API calls | Custom async operations |

### Step 3: Server Routes (Nitro)
```typescript
// server/api/users.get.ts
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const users = await db.user.findMany({
    take: query.limit || 20,
    skip: ((query.page || 1) - 1) * (query.limit || 20),
  })
  return { data: users, meta: { total: await db.user.count() } }
})

// server/api/users/[id].get.ts
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const user = await db.user.findUnique({ where: { id } })
  if (!user) throw createError({ statusCode: 404, message: 'User not found' })
  return user
})
```

### Step 4: Auto-Import Rules
| Directory | Auto-Import | How to Reference |
|-----------|-------------|------------------|
| components/ | Yes | <UiButton /> (PascalCase) |
| composables/ | Yes | useAuth() |
| utils/ (app) | Yes | formatDate() |
| server/utils/ | Yes (server only) | useDb() |
| stores/ | No | Must import from pinia |

### Step 5: Middleware and Layouts
```typescript
// middleware/auth.ts
export default defineNuxtRouteMiddleware((to, from) => {
  const { user } = useAuthStore()
  if (!user && to.path !== '/login') {
    return navigateTo('/login')
  }
})
```

```vue
<!-- pages/users.vue -->
<script setup lang="ts">
definePageMeta({
  layout: 'users',           // uses layouts/users.vue
  middleware: ['auth'],
  title: 'User Management',
})
</script>
```

### Step 6: Nuxt Layers
```typescript
// nuxt.config.ts — consume a shared layer
export default defineNuxtConfig({
  extends: [
    '@my-org/shared-layer',  // Shared components, composables, styles
  ],
})
```

Use layers for: shared UI library across Nuxt apps, white-label apps, base configuration shared across projects.

## Rules
- Prefer useFetch over useAsyncData for external API calls. useAsyncData is for custom async logic that is not a direct API call.
- Server routes live in server/api/. Do not create external Express/Fastify servers alongside Nuxt.
- Components in components/ are auto-imported globally. Use explicit imports for clarity in large projects.
- Layouts are opt-in via definePageMeta.
- Pages/ directory auto-generates routes. Do not manually configure the router.
- Use $fetch for client-to-server API calls. Use useFetch for SSR-compatible data loading.

## References
  - references/composables-autoimport.md — Nuxt Composables and Auto-imports
  - references/nuxt-auth.md — Nuxt Auth
  - references/nuxt-conventions.md — Nuxt Conventions
  - references/nuxt-deployment.md — Nuxt Deployment
  - references/nuxt-modules.md — Nuxt Modules
  - references/nuxt-performance.md — Nuxt Performance Patterns
  - references/nuxt-testing.md — Nuxt Testing
  - references/server-routes.md — Nuxt Server Routes and API Endpoints
## Handoff
No artifact produced.
Next skill: frontend-testing — test Nuxt pages.
Carry forward: directory structure conventions, server route setup, data fetching approach.
