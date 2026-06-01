---
name: vue-architecture
description: >
  Use this skill when the user says 'Vue structure', 'Vue architecture', 'Vue 3 folder', 'Composition API architecture', 'Vue clean arch', 'Vue feature structure', 'Pinia architecture', 'Vue project layout', or when structuring a Vue 3 application. This skill enforces: feature-based folder structure, script setup always, Composition API with composables (useX naming), Pinia for global state, one concern per composable, scoped styles by default, and component file under 200 lines. Requires Vue 3 (vue package). Do NOT use for: Nuxt-specific features, Vue 2 Options API, or React/Angular.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, vue, phase-3]
---

# Vue Architecture

## Purpose
Structure Vue 3 applications with Composition API, feature-based folders, and Pinia stores. All logic in composables. script setup always.

## Agent Protocol

### Trigger
Exact user phrases: "Vue structure", "Vue architecture", "Vue 3 folder", "Composition API architecture", "Vue clean arch", "Vue feature structure", "Pinia architecture", "Vue project layout".

### Input Context
Before activating, verify:
- package.json has vue dependency (version 3).
- Whether the project uses Vite or Vue CLI.

### Output Artifact
No file output. Produces folder structure and Vue component code as text.

### Response Format
Folder structure:
```
src/
  features/{feature}/
    composables/, components/
  shared/components/
  stores/
```

Code: show <script setup> and <template>. No <style> block.

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Folder structure is feature-based (src/features/{feature}).
- [ ] All .vue files use <script setup lang="ts"> syntax.
- [ ] All reusable logic is in composables (useX naming), not in mixins.
- [ ] Pinia stores for global state, composables for reusable logic, components for UI.
- [ ] Props and emits have full TypeScript types.
- [ ] Styles are scoped by default (scoped attribute).
- [ ] Components are under 200 lines.

### Max Response Length
Folder structure: unlimited. Code: 20 lines per example.

## Component Architecture / Decision Trees

### Architecture Options

| Approach | Trade-off | When to Use |
|----------|-----------|-------------|
| Feature-based folders | Cohesion, scalability | All projects with multiple features |
| Type-based (components/, composables/) | Simple for small apps | Small projects, prototypes |
| Composition API + script setup | Modern Vue, type-safe | All new Vue 3 code |
| Options API | Legacy, verbose | Existing Vue 2 migration |
| Pinia stores | Global state management | Multi-component shared state |
| Composables | Reusable logic | Data fetching, form logic, browser APIs |

### Decision Tree: Component Type

```
Does the component fetch data or manage state?
  ├── Yes -> Smart component (feature-specific)
  │    ├── Uses composables for logic
  │    ├── Renders shared UI components
  │    └── Lives in features/{feature}/components/
  └── No -> Dumb (presentational) component
       ├── Receives props, emits events
       ├── No data fetching
       └── Lives in shared/components/
```

### Decision Tree: State Management

```
How is the state scoped?
  ├── Local (single component) -> ref() / reactive()
  ├── Feature-level (few components) -> composable + provide/inject
  └── Global (many components across features) -> Pinia store
```

### Decision Tree: Composable vs Store

```
Is this reusable logic or shared state?
  ├── Reusable logic (data fetching, formatting, browser API) -> composable
  └── Shared state (auth, cart, theme) -> Pinia store
```

## Component Design Patterns

### Smart Component with Composable

```vue
<script setup lang="ts">
const { users, isLoading, error, refresh } = useUsers()

const props = defineProps<{ userId: string }>()
const emit = defineEmits<{ select: [id: string] }>()

const displayName = computed(() =>
  users.value?.find(u => u.id === props.userId)?.name ?? 'Unknown'
)

watch(() => props.userId, () => refresh())
</script>

<template>
  <div v-if="isLoading">Loading...</div>
  <div v-else-if="error">{{ error }}</div>
  <div v-else @click="emit('select', userId)">
    <p>{{ displayName }}</p>
    <ul><li v-for="user in users" :key="user.id">{{ user.name }}</li></ul>
  </div>
</template>
```

### Presentational Component

```vue
<script setup lang="ts">
interface Props { variant?: 'primary' | 'secondary'; disabled?: boolean }
interface Emits { (e: 'click'): void }

const props = withDefaults(defineProps<Props>(), { variant: 'primary' })
const emit = defineEmits<Emits>()
</script>

<template>
  <button :class="['btn', `btn-${variant}`]" :disabled="disabled" @click="emit('click')">
    <slot />
  </button>
</template>

<style scoped>
.btn { padding: 0.5rem 1rem; border-radius: 0.375rem; cursor: pointer; }
.btn-primary { background: #3b82f6; color: white; border: none; }
.btn-secondary { background: #e5e7eb; color: #374151; border: 1px solid #d1d5db; }
</style>
```

### Composable for Data Fetching

```typescript
export function useUsers(filters?: Ref<UserFilters>) {
  const users = ref<User[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function refresh() {
    isLoading.value = true
    error.value = null
    try {
      users.value = await api.getUsers(filters?.value)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
    } finally {
      isLoading.value = false
    }
  }

  return { users, isLoading, error, refresh }
}
```

## State Management Patterns

### Local State with ref/reactive

```typescript
const count = ref(0)
const user = reactive({ name: 'Alice', email: 'alice@test.com' })

count.value++
user.name = 'Bob'
```

### Computed State

```typescript
const count = ref(0)
const doubled = computed(() => count.value * 2)
const status = computed(() => count.value > 10 ? 'High' : 'Low')
```

### Watched Side Effects

```typescript
watch(count, (newVal, oldVal) => {
  console.log(`Count changed from ${oldVal} to ${newVal}`)
})

watchEffect(() => {
  localStorage.setItem('count', String(count.value))
})
```

### Pinia Store

```typescript
// stores/auth.store.ts
import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(null)
  const isAuthenticated = computed(() => !!token.value)

  async function login(email: string, password: string) {
    const res = await api.login(email, password)
    user.value = res.user
    token.value = res.token
  }

  function logout() {
    user.value = null
    token.value = null
  }

  return { user, token, isAuthenticated, login, logout }
})
```

### provide/inject with InjectionKey

```typescript
export const ThemeKey: InjectionKey<{ theme: Ref<string>; toggle: () => void }> = Symbol('ThemeKey')
```

## Performance Optimization

### Reactivity Overhead
- Vue 3's proxy-based reactivity is efficient for most use cases
- Avoid deeply nested reactive objects (3+ levels) — flatten when possible
- Use `shallowRef` and `shallowReactive` for large data that doesn't need deep tracking

### Bundle Size
- Vue runtime: ~30KB gzipped
- Route-level code splitting via dynamic imports
- Tree-shaking — import only what you need from vue

### Re-render Optimization
- `v-memo` for list items that rarely change
- `v-once` for static content
- `shallowRef` for large arrays that are replaced entirely

## Build & Bundle Considerations

### Vite Configuration

```ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router', 'pinia'],
        },
      },
    },
  },
})
```

### TypeScript Config

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

## Testing Strategies

### Component Testing

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Button from './Button.vue'

describe('Button', () => {
  it('renders slot content', () => {
    const wrapper = mount(Button, { slots: { default: 'Click' } })
    expect(wrapper.text()).toBe('Click')
  })

  it('emits click on click', async () => {
    const wrapper = mount(Button)
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })
})
```

### Composable Testing

```ts
import { describe, it, expect } from 'vitest'
import { useCounter } from './useCounter'

describe('useCounter', () => {
  it('increments', () => {
    const { count, increment } = useCounter()
    expect(count.value).toBe(0)
    increment()
    expect(count.value).toBe(1)
  })
})
```

### Pinia Store Testing

```ts
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from './auth.store'

beforeEach(() => setActivePinia(createPinia()))

it('starts unauthenticated', () => {
  const store = useAuthStore()
  expect(store.isAuthenticated).toBe(false)
})
```

## Migration Patterns

### Vue 2 Options API to Vue 3 Composition API

```vue
<!-- Vue 2 -->
<script>
export default {
  data: () => ({ count: 0 }),
  computed: { doubled() { return this.count * 2 } },
  watch: { count(val) { console.log(val) } },
  methods: { increment() { this.count++ } },
}
</script>

<!-- Vue 3 -->
<script setup lang="ts">
const count = ref(0)
const doubled = computed(() => count.value * 2)
watch(count, (val) => console.log(val))
function increment() { count.value++ }
</script>
```

### Vuex to Pinia

```ts
// Vuex
new Vuex.Store({ state: { count: 0 }, mutations: { increment: s => s.count++ } })

// Pinia
defineStore('counter', () => {
  const count = ref(0)
  function increment() { count.value++ }
  return { count, increment }
})
```

## Anti-Patterns

### Mutating Props

```vue
<!-- Anti-pattern -->
<script setup>
const props = defineProps<{ count: number }>()
props.count++ // runtime warning
</script>

<!-- Correct: emit -->
<script setup>
const emit = defineEmits<{ update: [number] }>()
</script>
<button @click="emit('update', count + 1)">+</button>
```

### Options API in New Code

Vue 3 supports both, but new code must use Composition API + script setup.

### Overusing provide/inject

For data that only goes 1-2 levels, prop drilling is clearer and more traceable.

### Large Components

Components over 200 lines should be split: extract logic to composables, extract UI sections to child components.

## Common Pitfalls

1. **Options API in new code** — use script setup
2. **Mutating props** — emit events instead
3. **Composables with side effects** — composables should be pure, effects in components
4. **Missing ref.value** — `ref()` requires `.value` in script (not in template)
5. **Reactive arrays** — use `reactive([])` not `ref([])` if you need index access

## Compared With

### Vue 3 vs React
| Aspect | Vue 3 | React |
|--------|-------|-------|
| Reactivity | Proxy-based, automatic | VDOM + hooks |
| Component syntax | SFC (template + script + style) | JSX only |
| State | ref/reactive | useState |
| Bundled state | Pinia | Zustand, Jotai |
| Bundle size | ~30KB | ~45KB |

### Vue 3 vs Svelte 5
Vue uses runtime reactivity (proxies); Svelte uses compile-time reactivity (runes). Vue has larger ecosystem; Svelte has smaller bundles.

## Ecosystem & Tooling

| Package | Purpose |
|---------|---------|
| vue | Core framework |
| vue-router | Client-side routing |
| pinia | State management |
| vite | Build tool |
| @vue/test-utils | Component testing |

## Workflow

### Step 1: Feature-Based Structure
```
src/features/users/
  composables/useUsers.ts
  components/UserList.vue, UserCard.vue
  types/index.ts
```

### Step 2: Composition API Component
```vue
<script setup lang="ts">
const { users, isLoading } = useUsers()
const props = defineProps<{ userId: string }>()
const emit = defineEmits<{ select: [id: string] }>()
</script>
```

### Step 3: Composable Design
```typescript
export function useUsers() {
  const users = ref<User[]>([])
  return { users }
}
```

### Step 4: Pinia Store
```typescript
export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  return { user }
})
```

### Step 5: Component Organization Rules
- One component per file, under 200 lines
- scoped styles by default
- Avoid :deep selectors — pass CSS classes as props

## Rules
- script setup always. No Options API in new code.
- Composables use useX naming, return only what template needs.
- Pinia for global state, composables for reusable logic.
- Props and emits have full TypeScript types.
- Never mutate props. Emit events to communicate up.
- Components under 200 lines. Split early.

## References
  - references/composition-api.md
  - references/folder-structure.md
  - references/vue-composition.md
  - references/vue-error-handling.md
  - references/vue-optimization.md
  - references/vue-testing.md

## Handoff
Next skill: vue-nuxt (if using Nuxt) or frontend-testing.
Carry forward: component organization, composable patterns, Pinia store structure.
