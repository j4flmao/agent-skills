# Vue Optimization Patterns

## Reactivity Optimization

### shallowRef for Large Data

```typescript
import { shallowRef, triggerRef } from 'vue'

// ❌ Wrong: Deep reactivity for read-only data
const users = ref<User[]>([])  // Wraps every nested property

// ✅ Correct: shallowRef for large arrays
const users = shallowRef<User[]>([])
function setUsers(data: User[]) {
  users.value = data
  // triggerRef(users)  // Force update if needed
}
```

### readonly for Exposed State

```typescript
import { ref, readonly } from 'vue'

export function useCounter() {
  const count = ref(0)
  function increment() { count.value++ }

  return { count: readonly(count), increment }
}
```

## Computed Caching

```typescript
// ✅ Correct: Computed caches until dependencies change
const filtered = computed(() =>
  items.value.filter(i => i.category === selectedCategory.value)
)

// ❌ Wrong: Method re-executes on every render
function getFiltered() {
  return items.value.filter(i => i.category === selectedCategory.value)
}
```

## v-memo

```html
<!-- Only re-render when item.id or item.name changes -->
<div v-memo="[item.id, item.name]">
  <span>{{ item.name }}</span>
  <span>{{ item.price }}</span>
</div>
```

## Lazy Loading Routes

```typescript
const routes = [
  { path: '/', component: () => import('./pages/Home.vue') },
  { path: '/admin', component: () => import('./pages/Admin.vue') },
]

// Prefetch on hover
const Admin = defineAsyncComponent(() => import('./pages/Admin.vue'))
```

## Suspense

```vue
<Suspense>
  <AsyncComponent />
  <template #fallback>
    <div>Loading...</div>
  </template>
</Suspense>
```

## KeepAlive

```vue
<KeepAlive :include="['Dashboard', 'Profile']">
  <component :is="currentView" />
</KeepAlive>
```

## Performance Budget

| Metric | Target |
|--------|--------|
| Vue runtime | ~33kB |
| Initial bundle | <200kB |
| Lazy chunk | <50kB |
| LCP | <2.5s |
| Re-render time | <16ms |

## Bundle Optimization

```js
// vite.config.js
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router', 'pinia'],
          ui: ['@headlessui/vue', '@heroicons/vue'],
        },
      },
    },
    chunkSizeWarningLimit: 100,
  },
})
```

## Deferred Rendering

```vue
<script setup>
import { useTemplateRef } from 'vue'
const isVisible = useTemplateRef('lazy-section')

onMounted(() => {
  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) { isVisible.value = true; observer.disconnect() }
  })
  observer.observe(lazySection.value)
})
</script>
```
