# Vue Composition Patterns

## Composable Design

### Naming Convention
- Prefix with `use` — signals it's a composable (e.g., `useUsers`, `useMediaQuery`).
- Return an object of refs/computed/functions. Never return raw values.

### Basic Composable
```typescript
// composables/useMediaQuery.ts
import { ref, onMounted, onUnmounted } from 'vue'

export function useMediaQuery(query: string) {
  const matches = ref(false)
  let mediaQuery: MediaQueryList | null = null

  function onChange(e: MediaQueryListEvent) {
    matches.value = e.matches
  }

  onMounted(() => {
    mediaQuery = window.matchMedia(query)
    matches.value = mediaQuery.matches
    mediaQuery.addEventListener('change', onChange)
  })

  onUnmounted(() => {
    mediaQuery?.removeEventListener('change', onChange)
  })

  return { matches }
}
```

### Async Composable
```typescript
// composables/useAsync.ts
import { ref, type Ref } from 'vue'

export function useAsync<T>(fn: () => Promise<T>) {
  const data = ref<T | null>(null) as Ref<T | null>
  const error = ref<string | null>(null)
  const loading = ref(false)

  async function execute() {
    loading.value = true
    error.value = null
    try {
      data.value = await fn()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
    } finally {
      loading.value = false
    }
  }

  return { data, error, loading, execute }
}
```

### Composable with Reactive Parameters
```typescript
// composables/useUserSearch.ts
import { ref, watch, type Ref } from 'vue'
import { debounce } from '@/shared/utils/debounce'

export function useUserSearch(searchTerm: Ref<string>) {
  const results = ref<User[]>([])
  const searching = ref(false)

  const debouncedSearch = debounce(async (term: string) => {
    searching.value = true
    try {
      results.value = await api.searchUsers(term)
    } finally {
      searching.value = false
    }
  }, 300)

  watch(searchTerm, (term) => {
    if (term.length >= 2) debouncedSearch(term)
    else results.value = []
  })

  return { results, searching }
}
```

## provide/inject Patterns

### Typed Injection Keys
```typescript
// types/injection-keys.ts
import type { InjectionKey, Ref, ComputedRef } from 'vue'

export interface ThemeContext {
  theme: Ref<'light' | 'dark'>
  toggle: () => void
  isDark: ComputedRef<boolean>
}

export const ThemeKey: InjectionKey<ThemeContext> = Symbol('ThemeKey')
```

### Provider
```vue
<script setup lang="ts">
import { provide, ref, computed } from 'vue'
import { ThemeKey, type ThemeContext } from '@/types/injection-keys'

const theme = ref<'light' | 'dark'>('light')
const isDark = computed(() => theme.value === 'dark')

function toggle() {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
}

provide<ThemeContext>(ThemeKey, { theme, toggle, isDark })
</script>
```

### Injector
```vue
<script setup lang="ts">
import { inject } from 'vue'
import { ThemeKey } from '@/types/injection-keys'

const theme = inject(ThemeKey)
if (!theme) throw new Error('ThemeKey not provided — missing ThemeProvider ancestor')
</script>

<template>
  <div :class="theme.isDark ? 'dark' : 'light'">
    <button @click="theme.toggle">Toggle Theme</button>
  </div>
</template>
```

## Renderless Components

### Pattern
```vue
<!-- components/RenderlessList.vue -->
<script setup lang="ts" generic="T extends { id: string | number }">
import { ref, computed } from 'vue'

const props = defineProps<{
  items: T[]
  filterKey?: keyof T
}>()

const search = ref('')

const filtered = computed(() => {
  if (!props.filterKey || !search.value) return props.items
  return props.items.filter(item =>
    String(item[props.filterKey]).toLowerCase().includes(search.value.toLowerCase())
  )
})

function trackBy(item: T) {
  return item.id
}
</script>

<template>
  <slot :items="filtered" :search="search" :track-by="trackBy" />
</template>
```

Usage:
```vue
<RenderlessList :items="users" filter-key="name" v-slot="{ items, search, trackBy }">
  <input v-model="search" placeholder="Search users..." />
  <ul>
    <li v-for="user in items" :key="trackBy(user)">{{ user.name }}</li>
  </ul>
</RenderlessList>
```

## Slot Patterns

### Named Slots with Fallback
```vue
<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <header>
        <slot name="title">Confirm Action</slot>
      </header>
      <main>
        <slot name="default">Are you sure?</slot>
      </main>
      <footer>
        <slot name="actions">
          <button @click="$emit('close')">Cancel</button>
          <button @click="$emit('confirm')">Confirm</button>
        </slot>
      </footer>
    </div>
  </div>
</template>
```

### Conditional Slot Rendering
```vue
<template>
  <div class="card">
    <header v-if="$slots.header" class="card-header">
      <slot name="header" />
    </header>
    <div class="card-body"><slot /></div>
    <footer v-if="$slots.footer" class="card-footer">
      <slot name="footer" />
    </footer>
  </div>
</template>
```

## Custom Directives
```typescript
// directives/clickOutside.ts
import { type Directive, type DirectiveBinding } from 'vue'

export const vClickOutside: Directive<HTMLElement, () => void> = {
  mounted(el, binding: DirectiveBinding<() => void>) {
    el._clickOutsideHandler = (e: MouseEvent) => {
      if (!el.contains(e.target as Node)) binding.value()
    }
    document.addEventListener('click', el._clickOutsideHandler)
  },
  unmounted(el) {
    document.removeEventListener('click', el._clickOutsideHandler)
  },
}
```

## Composition Anti-Patterns
- ❌ Composable returning raw ref instead of object — consumers lose named destructuring.
- ❌ Side effects in composable scope — effects belong in setup or watchers.
- ❌ Generic `provide` with string keys — no type safety, risk of collisions.
- ❌ Renderless component without generic types — no type inference for slot scope.
