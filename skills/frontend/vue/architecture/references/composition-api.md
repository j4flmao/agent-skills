# Vue Composition API

## Basic Composable
```typescript
// composables/useOrders.ts
import { ref, onMounted } from 'vue'

export function useOrders() {
  const orders = ref<Order[]>([])
  const loading = ref(true)

  async function fetchOrders() {
    loading.value = true
    orders.value = await fetch('/api/orders').then(r => r.json())
    loading.value = false
  }

  onMounted(fetchOrders)

  return { orders, loading, fetchOrders }
}
```

## Usage in Component
```vue
<script setup lang="ts">
import { useOrders } from '@/composables/useOrders'

const { orders, loading } = useOrders()
</script>

<template>
  <div v-if="loading">Loading...</div>
  <OrderList v-else :orders="orders" />
</template>
```

## Composable Naming
- `use` prefix: `useAuth`, `useDebounce`, `useMediaQuery`
- Return reactive refs — destructure preserves reactivity
- Accept `ref` or raw value with `toValue()` (Vue 3.3+)

```typescript
import { toValue, type MaybeRef } from 'vue'

export function useDebounce<T>(input: MaybeRef<T>, delay: number) {
  const debounced = ref(toValue(input)) as Ref<T>
  watch(input, () => {
    const timer = setTimeout(() => { debounced.value = toValue(input) }, delay)
    return () => clearTimeout(timer)
  })
  return debounced
}
```

## Lifecycle in Composables
```typescript
export function useLogger(componentName: string) {
  onMounted(() => console.log(`${componentName} mounted`))
  onUnmounted(() => console.log(`${componentName} unmounted`))
  onWatcherCleanup(() => console.log('cleanup'))
}
```
