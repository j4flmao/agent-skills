---
name: frontend-vue-patterns
description: >
  Use this skill when the user says 'Vue pattern', 'Composition API pattern', 'composable', 'provide/inject', 'Vue reactivity', 'Vue directive', 'Vue composable', 'Vue Router', 'Pinia pattern', 'renderless component', 'Vue slot pattern'. This skill enforces: composables for all reusable logic (useX naming), Pinia setup stores for global state, route lazy loading with navigation guards, renderless components with scoped slots, and custom directives for reusable DOM behavior. Requires Vue 3 (package.json with vue). Do NOT use for: Vue project structure/architecture, Nuxt-specific patterns, or non-Vue frameworks.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, vue, patterns, phase-10]
---

# Vue Patterns

## Purpose
Apply production patterns to Vue 3 applications: composable design, Pinia state management, router patterns, renderless components, and slot composition.

## Agent Protocol

### Trigger
Exact user phrases: "Vue pattern", "Composition API pattern", "composable", "provide/inject", "Vue reactivity", "Vue directive", "Vue composable", "Vue Router", "Pinia pattern", "renderless component", "Vue slot pattern".

### Input Context
Before activating, verify:
- package.json has vue (version 3).
- Whether the project uses Vue Router and/or Pinia.
- Whether the project uses Nuxt (nuxt.config present).

### Output Artifact
No file output. Produces composable design, state management, routing strategy as text.

### Response Format
```
Composable Design: {single-responsibility composable}
State Management: {Pinia setup store with actions}
Routing Strategy: {lazy routes + navigation guards}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Composables follow single-responsibility, useX naming, return reactive refs.
- [ ] provide/inject typed with InjectionKey for 3+ level prop drilling.
- [ ] Pinia stores use setup syntax (composition API style).
- [ ] Routes are lazy-loaded with dynamic imports.
- [ ] Navigation guards handle auth, roles, data prefetch.
- [ ] Renderless components separate logic from presentation.
- [ ] Named slots + scoped slots for flexible component composition.

### Max Response Length
2560 tokens.

## Workflow

### Step 1: Composable Design
```typescript
// composables/usePagination.ts
import { ref, computed } from 'vue'

export function usePagination<T>(items: Ref<T[]>, pageSize: number) {
  const currentPage = ref(1)
  const totalPages = computed(() => Math.ceil(items.value.length / pageSize))
  const pageItems = computed(() => {
    const start = (currentPage.value - 1) * pageSize
    return items.value.slice(start, start + pageSize)
  })

  function goToPage(page: number) {
    currentPage.value = Math.max(1, Math.min(page, totalPages.value))
  }

  return { currentPage, totalPages, pageItems, goToPage }
}
```
One composable per concern. Accept `Ref<T>` for reactive parameters. Return stable references.

### Step 2: provide/inject with Keys
```typescript
// types/injection-keys.ts
import type { InjectionKey, Ref } from 'vue'

export interface UserContext {
  user: Ref<User | null>
  permissions: Ref<string[]>
  hasPermission: (perm: string) => boolean
}

export const UserKey: InjectionKey<UserContext> = Symbol('UserKey')
```

```vue
<!-- provider component -->
<script setup lang="ts">
import { provide, ref } from 'vue'
import { UserKey, type UserContext } from '@/types/injection-keys'

const user = ref<User | null>(null)
const permissions = ref<string[]>([])

provide<UserContext>(UserKey, {
  user,
  permissions,
  hasPermission: (perm) => permissions.value.includes(perm),
})
</script>
```

```vue
<!-- consumer component -->
<script setup lang="ts">
import { inject } from 'vue'
import { UserKey } from '@/types/injection-keys'

const ctx = inject(UserKey)
if (!ctx) throw new Error('UserKey not provided')
</script>
```

### Step 3: Pinia Setup Store
```typescript
// stores/cart.store.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>([])
  const couponCode = ref<string | null>(null)

  const itemCount = computed(() => items.value.reduce((sum, i) => sum + i.quantity, 0))
  const subtotal = computed(() => items.value.reduce((sum, i) => sum + i.price * i.quantity, 0))
  const discount = computed(() => couponCode.value ? subtotal.value * 0.1 : 0)
  const total = computed(() => subtotal.value - discount.value)

  async function addItem(product: Product, quantity = 1) {
    const existing = items.value.find(i => i.id === product.id)
    if (existing) {
      existing.quantity += quantity
    } else {
      items.value.push({ ...product, quantity })
    }
  }

  function removeItem(productId: string) {
    items.value = items.value.filter(i => i.id !== productId)
  }

  function applyCoupon(code: string) {
    couponCode.value = code
  }

  async function checkout() {
    const res = await api.createOrder({ items: items.value, coupon: couponCode.value })
    if (res.ok) items.value = []
    return res
  }

  return { items, couponCode, itemCount, subtotal, discount, total, addItem, removeItem, applyCoupon, checkout }
})
```

### Step 4: Router Patterns
```typescript
// router/index.ts
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/features/home/HomePage.vue'),
    },
    {
      path: '/products',
      name: 'products',
      component: () => import('@/features/products/ProductListPage.vue'),
      children: [
        {
          path: ':id',
          name: 'product-detail',
          component: () => import('@/features/products/ProductDetailPage.vue'),
          props: true,
        },
      ],
    },
    {
      path: '/checkout',
      name: 'checkout',
      component: () => import('@/features/checkout/CheckoutPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('@/features/admin/AdminLayout.vue'),
      meta: { requiresAuth: true, requiresRole: 'admin' },
      children: [
        { path: '', redirect: { name: 'admin-dashboard' } },
        {
          path: 'dashboard',
          name: 'admin-dashboard',
          component: () => import('@/features/admin/DashboardPage.vue'),
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/features/errors/NotFoundPage.vue'),
    },
  ],
})
```

### Step 5: Navigation Guards
```typescript
import { useAuthStore } from '@/stores/auth.store'

router.beforeEach(async (to, from) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.requiresRole && !auth.hasRole(to.meta.requiresRole as string)) {
    return { name: 'forbidden' }
  }

  if (to.meta.requiresAuth && !auth.profileLoaded) {
    await auth.loadProfile()
  }
})
```

### Step 6: Renderless Component
```vue
<!-- components/RenderlessPagination.vue -->
<script setup lang="ts" generic="T">
import { usePagination } from '@/composables/usePagination'

const props = defineProps<{
  items: T[]
  pageSize?: number
}>()

const { currentPage, totalPages, pageItems, goToPage } = usePagination(
  toRef(props, 'items'),
  props.pageSize ?? 10,
)
</script>

<template>
  <slot v-bind="{ currentPage, totalPages, pageItems, goToPage }" />
</template>
```
Usage:
```vue
<RenderlessPagination :items="articles" :page-size="5" v-slot="{ pageItems, goToPage, currentPage }">
  <article v-for="item in pageItems" :key="item.id">
    <h3>{{ item.title }}</h3>
  </article>
  <button @click="goToPage(currentPage - 1)">Prev</button>
</RenderlessPagination>
```

### Step 7: Slot Patterns
```vue
<!-- components/Card.vue -->
<template>
  <div class="card">
    <header v-if="$slots.header">
      <slot name="header" />
    </header>
    <main>
      <slot />
    </main>
    <footer v-if="$slots.footer">
      <slot name="footer" />
    </footer>
  </div>
</template>
```
Use named slots for optional sections. Use scoped slots (`v-bind`) to expose component state. Use conditional rendering (`v-if="$slots.x"`) to avoid empty wrappers.

## Rules
- Composables are single-responsibility: one composable per feature concern, not per file.
- provide/inject typed with InjectionKey — never string keys.
- Pinia stores use setup store syntax (function form), not options API.
- All route components are lazy-loaded with dynamic `import()`.
- Navigation guards are thin — delegate auth and data logic to composables and stores.
- Renderless components expose state via scoped slots, never dictate markup.
- Named slots for structural sections, default slot for primary content.

## References
- `references/composition-patterns.md` — composables, provide/inject, renderless components, slots, directives
- `references/state-router-patterns.md` — Pinia stores, router guards, lazy routes, navigation guards

## Handoff
No artifact produced.
Next skill: vue-nuxt if using Nuxt. Or frontend-universal-testing for Vue component tests.
Carry forward: composable conventions, Pinia store structure, router guard patterns.
