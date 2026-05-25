# Svelte State Management Patterns

## Local State ($state)

```svelte
<script>
  let count = $state(0)
  let user = $state({ name: 'Alice', preferences: { theme: 'dark' } })
  let items = $state(['a', 'b', 'c'])

  function increment() { count++ }           // Direct mutation
  function updateTheme(t: string) { user.preferences.theme = t }  // Deep reactive
  function addItem(item: string) { items = [...items, item] }      // Reassign
</script>
```

## Derived State ($derived)

```svelte
<script>
  let items = $state([
    { name: 'Widget', price: 10, quantity: 2 },
    { name: 'Gadget', price: 20, quantity: 1 },
  ])

  let total = $derived(items.reduce((s, i) => s + i.price * i.quantity, 0))
  let itemCount = $derived(items.reduce((s, i) => s + i.quantity, 0))
  let sortedItems = $derived([...items].sort((a, b) => a.name.localeCompare(b.name)))

  let status = $derived.by(() => {
    if (total === 0) return 'Empty cart'
    if (total < 50) return 'Add more for free shipping'
    return 'Free shipping eligible'
  })
</script>
```

## Shared State (.svelte.js Module)

```js
// stores/theme.svelte.js
let theme = $state('light')
let subscribers = 0

export function getTheme() { return theme }
export function toggleTheme() {
  theme = theme === 'light' ? 'dark' : 'light'
}
export function setTheme(t: string) { theme = t }
```

```svelte
<script>
  import { getTheme, toggleTheme } from './stores/theme.svelte.js'
</script>

<button onclick={toggleTheme}>Current: {getTheme()}</button>
```

## Context State

```svelte
<script>
  // Provider
  import { setContext } from 'svelte'

  const THEME_KEY = Symbol('theme')
  let theme = $state('light')

  setContext(THEME_KEY, {
    get theme() { return theme },
    toggle: () => theme = theme === 'light' ? 'dark' : 'light',
  })
</script>

<script>
  // Consumer (in child)
  import { getContext } from 'svelte'

  const ctx = getContext<{ theme: string; toggle: () => void }>(THEME_KEY)
</script>

<button onclick={ctx.toggle}>Current: {ctx.theme}</button>
```

## Class-Based State

```js
// stores/cart.svelte.js
class CartStore {
  items = $state([])
  coupon = $state(null)

  get count() { return this.items.reduce((s, i) => s + i.quantity, 0) }
  get total() { return this.items.reduce((s, i) => s + i.price * i.quantity, 0) }

  addItem(product, qty = 1) {
    const existing = this.items.find(i => i.id === product.id)
    if (existing) existing.quantity += qty
    else this.items = [...this.items, { ...product, quantity: qty }]
  }

  removeItem(id) {
    this.items = this.items.filter(i => i.id !== id)
  }
}

export const cart = new CartStore()
```

## State Decision Guide

| State Type | Svelte 5 Solution |
|------------|-------------------|
| Component-local | `$state()` |
| Derived/computed | `$derived()` |
| Side effects | `$effect()` |
| Shared module state | `$state` in `.svelte.js` |
| Scoped to subtree | `setContext` / `getContext` |
| URL state | `$page.url.searchParams` |
| Forms | `bind:value` + `$state` |
| Server data | SvelteKit `load` functions |
