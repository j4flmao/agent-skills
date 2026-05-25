# Svelte Reactivity Patterns

## Runes Overview (Svelte 5)

| Rune | Purpose | Replacement For |
|------|---------|-----------------|
| `$state` | Reactive variable | `let x = ...` + reactivity |
| `$derived` | Computed value | `$: derived = ...` |
| `$derived.by` | Block computed | `$: { ... }` |
| `$effect` | Side effect | `$: { ... }` for effects |
| `$props` | Component inputs | `export let` |
| `$bindable` | Two-way binding | `export let` + parent set |
| `$inspect` | Debug reactivity | `console.log` |

## $state Deep Reactivity

```svelte
<script>
  let user = $state({ name: 'Alice', address: { city: 'NYC' } })
  let items = $state([{ id: 1, text: 'Learn Svelte' }])

  function updateCity(city: string) {
    user.address.city = city  // Deeply reactive — no set() needed
  }

  function addItem(text: string) {
    items = [...items, { id: Date.now(), text }]  // Array reassignment
  }

  function updateItem(id: number, text: string) {
    items = items.map(i => i.id === id ? { ...i, text } : i)
  }
</script>
```

## $derived Patterns

```svelte
<script>
  let count = $state(0)
  let items = $state([{ price: 10 }, { price: 20 }])

  // Simple derived
  let doubled = $derived(count * 2)

  // Block derived
  let label = $derived.by(() => {
    if (count === 0) return 'Zero'
    if (count < 10) return 'Low'
    return 'High'
  })

  // Derived from arrays
  let total = $derived(items.reduce((s, i) => s + i.price, 0))
  let sorted = $derived([...items].sort((a, b) => a.price - b.price))
</script>
```

## $effect Guidelines

```svelte
<script>
  let count = $state(0)
  let theme = $state('light')
  let user = $state(null)

  // ✅ Side effects
  $effect(() => {
    localStorage.setItem('theme', theme)
  })

  // ✅ With cleanup
  $effect(() => {
    const id = setInterval(() => console.log(count), 1000)
    return () => clearInterval(id)
  })

  // ✅ Async effect
  $effect(() => {
    const unsub = subscribeToUser(user, (u) => user = u)
    return unsub
  })

  // ❌ Wrong for derived values
  $effect(() => {
    doubled = count * 2  // Use $derived instead
  })
</script>
```

## $props & $bindable

```svelte
<script>
  let { name = 'world', count = 0, onclick } = $props()
  let value = $bindable()  // Two-way bindable prop
</script>

<input bind:value={value} />
<button onclick={onclick}>Count: {count}</button>
```

## Shared State (.svelte.js)

```js
// stores/counter.svelte.js
let count = $state(0)

export function getCount() { return count }
export function increment() { count++ }
export function decrement() { count-- }
```

```svelte
<script>
  import { getCount, increment } from './stores/counter.svelte.js'
</script>

<button onclick={increment}>{getCount()}</button>
```
