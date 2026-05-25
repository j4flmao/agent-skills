# Vue Composition API Patterns

## composables — Reusable Logic

### Basic Composable

```typescript
// composables/useCounter.ts
import { ref, computed } from 'vue'

export function useCounter(initial = 0) {
  const count = ref(initial)
  const doubled = computed(() => count.value * 2)

  function increment() { count.value++ }
  function decrement() { count.value-- }
  function reset() { count.value = initial }

  return { count, doubled, increment, decrement, reset }
}
```

### Async Composable

```typescript
// composables/useAsyncData.ts
import { ref, type Ref } from 'vue'

export function useAsyncData<T>(fetcher: () => Promise<T>) {
  const data = ref<T | null>(null) as Ref<T | null>
  const error = ref<string | null>(null)
  const loading = ref(false)

  async function execute() {
    loading.value = true
    error.value = null
    try { data.value = await fetcher() }
    catch (e) { error.value = e instanceof Error ? e.message : 'Unknown' }
    finally { loading.value = false }
  }

  return { data, error, loading, execute }
}
```

### Composable with Watcher

```typescript
// composables/useSearch.ts
import { ref, watch, type Ref } from 'vue'

export function useSearch(api: (q: string) => Promise<any[]>) {
  const query = ref('')
  const results = ref<any[]>([])
  const searching = ref(false)

  watch(query, async (val) => {
    if (val.length < 2) { results.value = []; return }
    searching.value = true
    results.value = await api(val)
    searching.value = false
  })

  return { query, results, searching }
}
```

## Lifecycle Hooks in Composables

```typescript
// composables/useMousePosition.ts
import { ref, onMounted, onUnmounted } from 'vue'

export function useMousePosition() {
  const x = ref(0)
  const y = ref(0)

  function update(e: MouseEvent) { x.value = e.pageX; y.value = e.pageY }

  onMounted(() => window.addEventListener('mousemove', update))
  onUnmounted(() => window.removeEventListener('mousemove', update))

  return { x, y }
}
```

## Composable Composition

```typescript
// composables/useUserWithPermissions.ts
import { computed } from 'vue'

export function useUserWithPermissions() {
  const { user } = useAuth()
  const { permissions } = usePermissions()

  const canEdit = computed(() => user.value?.role === 'admin' || permissions.value.includes('edit'))
  const canDelete = computed(() => permissions.value.includes('delete'))

  return { user, canEdit, canDelete }
}
```

## Composable Guidelines

| Rule | Reason |
|------|--------|
| Prefix with `use` | Convention for composable detection |
| Return stable refs | Avoid destructuring reactivity loss |
| Accept `Ref<T>` params | Reactive parameters for watchers |
| One concern per composable | Single responsibility |
| No side effects in scope | Effects belong in lifecycle hooks |
| TypeScript always | Type safety for consumers |

## Composable Anti-Patterns

```typescript
// ❌ Wrong: Mutable returned value
export function useBad() {
  const count = ref(0)
  return { count }  // Consumer might replace ref
}

// ✅ Correct: Encapsulated mutation
export function useGood() {
  const count = ref(0)
  function increment() { count.value++ }
  return { count: readonly(count), increment }
}

// ❌ Wrong: Side effect in composable scope
export function useLogging() {
  console.log('Created')  // Runs on import!
}
```
