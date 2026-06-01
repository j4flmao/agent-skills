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

## Component Architecture / Decision Trees

### Pattern Decision Tree

```
What pattern fits this problem?
├── Reusable logic (no UI) -> Composable (useX)
├── Shared state across features -> Pinia store
├── Shared behavior on DOM events -> Custom directive
├── 3+ levels of prop drilling -> provide/inject
├── Flexible layout structure -> Named slots (header, footer, default)
├── Logic-only component with customizable UI -> Renderless component + scoped slots
└── Async data on page load -> composable + onMounted or route guard
```

### Composable Decision Tree

```
Does the composable manage async state?
├── Yes -> Return { data, isLoading, error, refresh }
├── Does it manage pagination?
│    └── Yes -> Accept Ref<T[]>, return { currentPage, totalPages, pageItems, goToPage }
└── Does it wrap a browser API?
     └── Yes -> Accept options, provide start/stop/cleanup lifecycle
```

### State Management Decision Tree

```
Is the state used by:
├── One component -> ref()/reactive()
├── A component tree -> provide/inject
├── Multiple unrelated components -> Pinia store
└── Page route params -> useRoute + route query via router
```

## Component Design Patterns

### Composable for Async Data

```typescript
export function useAsync<T>(fetcher: () => Promise<T>) {
  const data = ref<T | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function execute() {
    isLoading.value = true
    error.value = null
    try {
      data.value = await fetcher()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
    } finally {
      isLoading.value = false
    }
  }

  return { data, isLoading, error, execute }
}
```

### Composable for Browser APIs

```typescript
export function useMediaQuery(query: string) {
  const matches = ref(false)

  let mql: MediaQueryList
  function onChange(e: MediaQueryListEvent) { matches.value = e.matches }

  onMounted(() => {
    mql = window.matchMedia(query)
    matches.value = mql.matches
    mql.addEventListener('change', onChange)
  })

  onUnmounted(() => mql?.removeEventListener('change', onChange))

  return { matches }
}
```

### Composable with Computed Dependencies

```typescript
export function useFilteredList<T>(items: Ref<T[]>, filterFn: () => (item: T) => boolean) {
  const filtered = computed(() => items.value.filter(filterFn()))
  return { filtered }
}
```

### Custom Directive

```typescript
// directives/clickOutside.ts
export const vClickOutside = {
  mounted(el: HTMLElement, binding: DirectiveBinding<() => void>) {
    el.__clickOutsideHandler = (e: MouseEvent) => {
      if (!el.contains(e.target as Node)) binding.value()
    }
    document.addEventListener('click', el.__clickOutsideHandler)
  },
  unmounted(el: HTMLElement) {
    document.removeEventListener('click', el.__clickOutsideHandler)
  },
}
```

### Renderless Component with Generic

```vue
<script setup lang="ts" generic="TItem extends { id: string | number }">
interface Props {
  items: TItem[]
  fetchMore: (offset: number) => Promise<TItem[]>
}

const props = defineProps<Props>()
const allItems = ref<TItem[]>([...props.items])
const isLoadingMore = ref(false)
const hasMore = ref(true)

async function loadMore() {
  if (isLoadingMore.value || !hasMore.value) return
  isLoadingMore.value = true
  const more = await props.fetchMore(allItems.value.length)
  if (more.length === 0) hasMore.value = false
  else allItems.value.push(...more)
  isLoadingMore.value = false
}
</script>

<template>
  <slot v-bind="{ items: allItems, loadMore, isLoadingMore, hasMore }" />
</template>
```

### Slot Composition Pattern

```vue
<!-- components/Panel.vue -->
<template>
  <section class="panel">
    <div v-if="$slots.toolbar" class="panel-toolbar">
      <slot name="toolbar" />
    </div>
    <div class="panel-body">
      <slot />
    </div>
    <div v-if="$slots.footer" class="panel-footer">
      <slot name="footer" />
    </div>
  </section>
</template>
```

## State Management Patterns

### Pinia Setup Store with Async Actions

```typescript
export const useOrderStore = defineStore('orders', () => {
  const orders = ref<Order[]>([])
  const activeOrder = ref<Order | null>(null)
  const isLoading = ref(false)

  const pendingOrders = computed(() => orders.value.filter(o => o.status === 'pending'))
  const completedOrders = computed(() => orders.value.filter(o => o.status === 'completed'))

  async function fetchOrders() {
    isLoading.value = true
    orders.value = await api.getOrders()
    isLoading.value = false
  }

  async function createOrder(data: CreateOrderInput) {
    const newOrder = await api.createOrder(data)
    orders.value.unshift(newOrder)
    return newOrder
  }

  async function updateStatus(id: string, status: OrderStatus) {
    await api.updateOrderStatus(id, status)
    const idx = orders.value.findIndex(o => o.id === id)
    if (idx !== -1) orders.value[idx].status = status
  }

  return { orders, activeOrder, isLoading, pendingOrders, completedOrders, fetchOrders, createOrder, updateStatus }
})
```

### Pinia Persist Pattern

```typescript
export const usePreferencesStore = defineStore('preferences', () => {
  const theme = ref<'light' | 'dark'>('light')
  const sidebarCollapsed = ref(false)

  function $reset() {
    theme.value = 'light'
    sidebarCollapsed.value = false
  }

  // Subscribe to persist on change
  watch([theme, sidebarCollapsed], ([t, s]) => {
    localStorage.setItem('preferences', JSON.stringify({ theme: t, sidebarCollapsed: s }))
  }, { immediate: true })

  // Hydrate from localStorage
  const saved = localStorage.getItem('preferences')
  if (saved) {
    const parsed = JSON.parse(saved)
    theme.value = parsed.theme ?? 'light'
    sidebarCollapsed.value = parsed.sidebarCollapsed ?? false
  }

  return { theme, sidebarCollapsed, $reset }
})
```

### provide/inject with Multiple Keys

```typescript
export const NotificationKey: InjectionKey<{
  notify: (msg: string, type: 'success' | 'error' | 'info') => void
}> = Symbol('NotificationKey')
```

## Performance Optimization

### Reactivity Tuning
- Use `shallowRef` for large data objects where only the reference changes
- Use `markRaw` for objects that should never become reactive (e.g., third-party instances)
- Avoid deeply nested reactive objects — flatten data with normalization
- Use `v-memo` on long lists with static items

### Render Optimization
- `v-once` for static content that never updates
- `v-memo` for lists where only few items change
- `shallowRef` for arrays that are replaced entirely
- Component-level `defineAsyncComponent` for heavy views
- Avoid expensive computed properties in templates — cache them

### Virtual Scrolling
Use `vue-virtual-scroller` or custom implementation for lists with 1000+ items.

## Build & Bundle Considerations

### Code Splitting

```typescript
const routes = [
  {
    path: '/heavy',
    component: () => import('@/features/heavy/HeavyPage.vue'),
  },
]
```

### Dynamic Import for Components

```vue
<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
const HeavyChart = defineAsyncComponent(() => import('@/components/HeavyChart.vue'))
</script>
```

### Vite Optimization

```ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router', 'pinia'],
          charts: ['chart.js', 'vue-chartjs'],
        },
      },
    },
  },
})
```

## Testing Strategies

### Composable Test

```typescript
import { describe, it, expect } from 'vitest'
import { usePagination } from './usePagination'

describe('usePagination', () => {
  const items = ref([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])

  it('chunks items by page size', () => {
    const { pageItems, currentPage } = usePagination(items, 3)
    expect(pageItems.value).toEqual([1, 2, 3])
    currentPage.value = 2
    expect(pageItems.value).toEqual([4, 5, 6])
  })

  it('clamps page within bounds', () => {
    const { goToPage, currentPage } = usePagination(items, 3)
    goToPage(100)
    expect(currentPage.value).toBe(4) // 10 items / 3 = 4 pages
    goToPage(-1)
    expect(currentPage.value).toBe(1)
  })
})
```

### Pinia Store Test

```typescript
import { setActivePinia, createPinia } from 'pinia'
import { useCartStore } from './cart.store'

beforeEach(() => {
  setActivePinia(createPinia())
})

it('adds item to cart', () => {
  const cart = useCartStore()
  cart.addItem({ id: '1', name: 'T-shirt', price: 20 }, 2)
  expect(cart.itemCount).toBe(2)
  expect(cart.subtotal).toBe(40)
})

it('applies discount code', () => {
  const cart = useCartStore()
  cart.addItem({ id: '1', name: 'T-shirt', price: 100 }, 1)
  cart.applyCoupon('SAVE10')
  expect(cart.discount).toBe(10)
  expect(cart.total).toBe(90)
})
```

### Navigation Guard Test

```typescript
it('redirects unauthenticated users', () => {
  router.push({ name: 'checkout' })
  expect(router.currentRoute.value.name).toBe('login')
})
```

## Migration Patterns

### Options API Mixin to Composable

```typescript
// Before: Mixin
const UserMixin = { data: () => ({ user: null }), methods: { async fetchUser(id) { this.user = await api.getUser(id) } } }

// After: Composable
export function useUser(id: Ref<string>) {
  const user = ref<User | null>(null)
  async function fetchUser() { user.value = await api.getUser(id.value) }
  return { user, fetchUser }
}
```

### Vuex Module to Pinia Setup Store

```typescript
// Before: Vuex
const store = new Vuex.Store({ state: { count: 0 }, mutations: { inc: s => s.count++ }, actions: { incAsync: ({ commit }) => setTimeout(() => commit('inc'), 1000) } })

// After: Pinia
export const useCounterStore = defineStore('counter', () => {
  const count = ref(0)
  function increment() { count.value++ }
  async function incrementAsync() { await delay(1000); count.value++ }
  return { count, increment, incrementAsync }
})
```

## Anti-Patterns

### String Injection Keys

```typescript
// Anti-pattern
provide('user', user)
const user = inject('user')

// Correct
export const UserKey: InjectionKey<User> = Symbol('UserKey')
provide(UserKey, user)
const ctx = inject(UserKey)
```

### Mutating Pinia State Outside Store

```typescript
// Anti-pattern
const store = useCartStore()
store.items.push(newItem) // no validation, no side effects

// Correct
store.addItem(newItem)
```

### Overusing provide/inject

provide/inject couples components implicitly. Prefer props + emits for 1-2 levels, provide/inject only for 3+ levels of nesting.

### Heavy Computed in Template

```vue
<!-- Anti-pattern -->
<template>
  <div>{{ items.filter(i => i.active).map(i => i.name).join(', ') }}</div>
</template>

<!-- Correct -->
<script setup>const activeNames = computed(() => items.value.filter(i => i.active).map(i => i.name).join(', '))</script>
<template><div>{{ activeNames }}</div></template>
```

## Common Pitfalls

1. **Missing .value in script**: `ref()` requires `.value` in `<script setup>`, never in `<template>`.
2. **Composables with side effects on import**: Composables should be called in setup(), not at module level.
3. **Unstable refs from composables**: Return the same ref instance (not new ref() each call).
4. **Missing error states in async composables**: Always return `error` ref.
5. **Over-nesting provide/inject**: Prefer props drilling for 1-2 levels.

## Compared With

| Pattern | Vue 3 | React |
|---------|-------|-------|
| Reusable logic | Composables (useX) | Hooks (useX) |
| Shared state | Pinia | Zustand, Jotai |
| Renderless | Scoped slots + generic | Render props |
| DOM behavior | Custom directives | useRef + useEffect |
| 3+ level drilling | provide/inject | Context |

## Ecosystem & Tooling

| Package | Purpose |
|---------|---------|
| pinia | State management |
| vue-router | Client routing |
| @vue/test-utils | Component testing |
| @vueuse/core | Collection of composables |
| vue-virtual-scroller | Virtual scrolling for large lists |

## Workflow

### Step 1: Composable Design
```typescript
export function useUsers() {
  const users = ref<User[]>([])
  const { isLoading, error, execute } = useAsync(() => api.getUsers())
  return { users, isLoading, error, refresh: execute }
}
```

### Step 2: Pinia Store
```typescript
export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  async function login(email: string, password: string) { user.value = await api.login(email, password) }
  function logout() { user.value = null }
  return { user, login, logout }
})
```

### Step 3: Router
```typescript
const routes = [{ path: '/dashboard', component: () => import('@/features/dashboard/DashboardPage.vue'), meta: { requiresAuth: true } }]
router.beforeEach((to) => { if (to.meta.requiresAuth && !auth.isAuthenticated) return '/login' })
```

### Step 4: provide/inject
```typescript
const NotificationKey: InjectionKey<{ notify: (msg: string) => void }> = Symbol('NotificationKey')
```

### Step 5: Custom Directive
```typescript
export const vFocus = { mounted(el: HTMLElement) { el.focus() } }
```

## Rules
- Composables are single-responsibility: one composable per feature concern.
- provide/inject typed with InjectionKey — never string keys.
- Pinia stores use setup store syntax (function form), not options API.
- All route components are lazy-loaded with dynamic import().
- Navigation guards are thin — delegate auth and data logic to stores.
- Renderless components expose state via scoped slots, never dictate markup.
- Named slots for structural sections, default slot for primary content.
- Custom directives for DOM-only behavior, composables for logic.

## References
  - references/composition-patterns.md — Vue Composition Patterns
  - references/state-router-patterns.md — Vue State & Router Patterns
  - references/vue-animations.md — Vue Animations
  - references/vue-form-patterns.md — Vue Form Patterns
  - references/vue-routing.md — Vue Routing Patterns
  - references/vue-state.md — Vue State Management Patterns

## Handoff
No artifact produced.
Next skill: vue-nuxt if using Nuxt. Or frontend-universal-testing for Vue component tests.
Carry forward: composable conventions, Pinia store structure, router guard patterns.
