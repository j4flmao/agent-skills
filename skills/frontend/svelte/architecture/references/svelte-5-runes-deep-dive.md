# Svelte 5 Runes Deep Dive

## What Are Runes?

Runes are compiler primitives introduced in Svelte 5 that replace the magic `$:` reactive syntax with explicit, predictable reactivity. Unlike Svelte 4 where `let` declarations could become reactive by assignment, Svelte 5 requires explicit `$state`, `$derived`, and `$effect` declarations. This makes reactivity visible in the source code rather than hidden in the compiler.

Runes are not JavaScript syntax — they are compiler directives that Svelte's compiler recognizes and transforms into efficient DOM update code. They work in `.svelte` files and `.svelte.js` / `.svelte.ts` module files.

## $state

### Basic Usage

```svelte
<script>
  let count = $state(0)
  let name = $state('Svelte')
  let isActive = $state(true)
</script>

<button onclick={() => count++}>
  Clicks: {count}
</button>
```

`$state(initialValue)` declares a reactive variable. The variable can be read and assigned like any JavaScript variable. Assignment triggers updates in all consumers.

### Deep Reactivity

`$state` provides deep reactivity for objects and arrays:

```svelte
<script>
  let user = $state({
    name: 'Alice',
    address: {
      city: 'New York',
      zip: '10001'
    },
    hobbies: ['reading', 'coding']
  })

  function updateCity() {
    user.address.city = 'Brooklyn'  // triggers update
  }

  function addHobby() {
    user.hobbies.push('gaming')      // triggers update
  }

  function updateName() {
    user = { ...user, name: 'Bob' }  // reassignment also works
  }
</script>
```

Internally, `$state` creates a JavaScript Proxy for objects and arrays. The Proxy intercepts:
- Property access (for tracking)
- Property assignment (for triggering updates)
- Array mutations (push, pop, splice, shift, unshift)
- Property deletion

### $state with Classes

```svelte
<script>
  class Counter {
    value = $state(0)

    increment() {
      this.value++
    }

    reset() {
      this.value = 0
    }
  }

  let counter = new Counter()
</script>

<button onclick={() => counter.increment()}>
  Count: {counter.value}
</button>
<button onclick={() => counter.reset()}>Reset</button>
```

Using `$state` inside classes allows creating reactive model objects with methods. This is the recommended pattern for shared state in `.svelte.js` module files.

### $state.raw

For performance-critical scenarios where deep reactivity is unnecessary:

```svelte
<script>
  let items = $state.raw([
    { id: 1, name: 'Item A' },
    { id: 2, name: 'Item B' },
  ])

  function replace() {
    items = [...items, { id: 3, name: 'Item C' }]
  }
</script>
```

`$state.raw` creates a shallowly reactive state. Only direct reassignment of `items` triggers updates. Mutations inside the array do not. Use for large arrays where deep proxy overhead is a concern.

### $state.snapshot

For reading the current value without creating a reactive dependency:

```svelte
<script>
  let user = $state({ name: 'Alice', count: 0 })

  function logSnapshot() {
    const snapshot = $state.snapshot(user)
    console.log(snapshot) // { name: 'Alice', count: 0 }
    // snapshot is a plain object, not reactive
  }
</script>
```

Useful for:
- Passing state to non-Svelte code
- Storing state in local storage
- Logging/debugging without creating tracking dependencies
- Integration with libraries that expect plain objects

## $derived

### Basic Usage

```svelte
<script>
  let count = $state(0)
  let doubled = $derived(count * 2)
  let label = $derived.by(() => {
    if (count === 0) return 'Zero'
    if (count > 100) return 'High'
    return `Count: ${count}`
  })
</script>

<p>{count} doubled is {doubled}</p>
<p>{label}</p>
```

`$derived(expression)` creates a computed value from other reactive state. The expression is re-evaluated when any dependency changes.

`$derived.by(fn)` is the block form for multi-line computations.

### Derived Chains

Derived values can depend on other derived values:

```svelte
<script>
  let items = $state([
    { price: 10, quantity: 2 },
    { price: 20, quantity: 1 },
  ])

  let subtotal = $derived(
    items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  )
  let tax = $derived(subtotal * 0.08)
  let total = $derived(subtotal + tax)
  let formatted = $derived(`$${total.toFixed(2)}`)
</script>

<p>Subtotal: ${subtotal.toFixed(2)}</p>
<p>Tax: ${tax.toFixed(2)}</p>
<p>Total: {formatted}</p>
```

The dependency graph is computed at compile time. Each derived value only recomputes when its direct dependencies change.

### Derived with Arrays and Objects

```svelte
<script>
  let todos = $state([
    { id: 1, text: 'Learn Svelte', done: false },
    { id: 2, text: 'Build app', done: true },
  ])

  let activeTodos = $derived(todos.filter(t => !t.done))
  let completedTodos = $derived(todos.filter(t => t.done))
  let completion = $derived(
    todos.length > 0
      ? Math.round((completedTodos.length / todos.length) * 100)
      : 0
  )
</script>

<progress value={completion} max={100}>{completion}%</progress>

<h3>Active ({activeTodos.length})</h3>
{#each activeTodos as todo (todo.id)}
  <p>{todo.text}</p>
{/each}
```

### $derived Gotchas

```svelte
<script>
  let numbers = $state([1, 2, 3, 4, 5])

  // Wrong — mutating the array does not create a new derived
  let evens = $derived(numbers.filter(n => n % 2 === 0))
  // If we do numbers.push(6), evens does NOT update because
  // the filter result is the same array reference

  // Correct — trigger reassignment
  function addEven() {
    numbers = [...numbers, numbers.length + 1]
  }
</script>
```

`$derived` compares its return value by reference for objects/arrays. If you push into an array, the reference doesn't change and the derived won't recompute. Always create new arrays/objects in derived expressions.

## $effect

### Basic Usage

```svelte
<script>
  let count = $state(0)

  $effect(() => {
    console.log(`Count changed to ${count}`)
  })
</script>

<button onclick={() => count++}>Increment</button>
```

`$effect(fn)` runs a function whenever its reactive dependencies change. It runs after the DOM has updated.

### Cleanup Function

```svelte
<script>
  let userId = $state(1)

  $effect(() => {
    const controller = new AbortController()

    fetch(`/api/users/${userId}`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => { user = data })

    return () => {
      controller.abort()
    }
  })
</script>
```

Return a function from `$effect` for cleanup. It runs:
- Before the effect re-runs (dependencies changed)
- When the component unmounts

### Effect Timing

```svelte
<script>
  let count = $state(0)
  let el = $state<HTMLParagraphElement>()

  $effect(() => {
    // Runs AFTER DOM update
    // DOM element is available here
    if (el) {
      console.log('Element height:', el.offsetHeight)
    }
  })
</script>

<p bind:this={el}>Count: {count}</p>
```

`$effect` runs after the DOM has been updated. Use `tick()` from `svelte` to wait for the DOM update if needed outside `$effect`.

### $effect.root

For creating non-tracked effects (not tied to component lifecycle):

```svelte
<script>
  let count = $state(0)

  // Not tracked — does not re-run when count changes
  $effect.root(() => {
    console.log('This runs once')

    return () => {
      console.log('Cleanup on destroy')
    }
  })
</script>
```

### $effect.tracking

For checking if inside a tracking context:

```svelte
<script>
  $effect(() => {
    if ($effect.tracking()) {
      console.log('Inside tracking scope')
    }
  })
</script>
```

## $props

### Destructuring Props

```svelte
<script>
  interface UserCardProps {
    user: {
      id: string
      name: string
      email?: string
    }
    variant?: 'compact' | 'full'
    onSelect?: (id: string) => void
    children?: Snippet
  }

  let {
    user,
    variant = 'compact',
    onSelect,
    children
  }: UserCardProps = $props()
</script>

<div class="card {variant}">
  <h3>{user.name}</h3>
  {#if variant === 'full' && user.email}
    <p>{user.email}</p>
  {/if}
  {#if onSelect}
    <button onclick={() => onSelect(user.id)}>Select</button>
  {/if}
  {@render children?.()}
</div>
```

### $bindable

For two-way binding with `bind:` directive:

```svelte
<script>
  let { value = $bindable('') } = $props()
</script>

<input bind:value={value} />
```

```svelte
<!-- Parent -->
<script>
  let search = $state('')
</script>

<SearchInput bind:value={search} />
```

`$bindable` allows the parent to use `bind:prop` syntax for two-way binding.

### Rest Props

```svelte
<script>
  let { class: className, children, ...rest } = $props()
</script>

<button class={className} {...rest}>
  {@render children?.()}
</button>
```

## $inspect

For debugging reactive state during development:

```svelte
<script>
  let count = $state(0)
  let doubled = $derived(count * 2)

  $inspect(count, doubled)
  // Logs: [count, doubled] whenever either changes
</script>
```

`$inspect` is compiled away in production builds.

## Snapshot Semantics

Understanding how Svelte 5 tracks dependencies is critical:

```svelte
<script>
  let user = $state({ name: 'Alice', address: { city: 'NYC' } })

  // This effect tracks `user` because it reads `user.name`
  // It also tracks `user.address.city`
  $effect(() => {
    console.log(user.name, user.address.city)
  })

  // This only tracks `user` reference, not its properties
  $effect(() => {
    console.log(user)  // logs the proxy, not individual properties
  })
</script>
```

Svelte tracks individual property access, not the variable as a whole. Reading `user.name` creates a dependency only on `name`, not on `address` or other properties.

## Runes in .svelte.js Files

Runes work in `.svelte.js` and `.svelte.ts` module files:

```ts
// store.svelte.ts
import { writable } from 'svelte/store'

export class AppState {
  theme = $state<'light' | 'dark'>('light')
  user = $state<{ id: string; name: string } | null>(null)

  toggleTheme() {
    this.theme = this.theme === 'light' ? 'dark' : 'light'
  }

  setUser(user: { id: string; name: string }) {
    this.user = user
  }
}

export const appState = new AppState()
```

```svelte
<!-- Component.svelte -->
<script>
  import { appState } from './store.svelte.js'
</script>

<button onclick={() => appState.toggleTheme()}>
  Theme: {appState.theme}
</button>
```

## Migration from Svelte 4

```svelte
<!-- Svelte 4 -->
<script>
  export let name = 'world'
  let count = 0
  $: doubled = count * 2
  $: console.log(count)
</script>

<!-- Svelte 5 -->
<script>
  let { name = 'world' } = $props()
  let count = $state(0)
  let doubled = $derived(count * 2)
  $effect(() => console.log(count))
</script>
```

Use `npx svelte-migrate@latest runes` to automate migration.

## Compiler Output

Svelte 5 compiles runes into efficient DOM update code:

```svelte
<!-- Input -->
<script>
  let count = $state(0)
  let doubled = $derived(count * 2)
</script>

<p>{count} x 2 = {doubled}</p>
<button onclick={() => count++}>+1</button>
```

The compiler produces JavaScript like this (conceptual):

```js
let count = 0
let doubled = 0

function update() {
  doubled = count * 2
  p.textContent = `${count} x 2 = ${doubled}`
}

button.onclick = () => {
  count++
  update()
}
```

No VDOM, no diffing, no component re-render. Only the specific DOM nodes that depend on `count` are updated.

## Runes vs Signals (SolidJS)

| Aspect | Svelte Runes | SolidJS Signals |
|--------|--------------|-----------------|
| Syntax | `$state(0)` with `count++` | `createSignal(0)` with `setCount(c+1)` |
| Access | Direct variable access | Function call `count()` |
| Deep reactivity | Automatic via Proxy | Manual via createStore |
| Derived | `$derived(expr)` | `createMemo(() => expr)` |
| Effect | `$effect(() => {})` | `createEffect(() => {})` |
| Component scope | Variables are scoped | Signals returned from hooks |
| Bundle size | 0KB (compiled away) | ~8KB runtime |

## Summary

| Rune | Purpose | Key Behavior |
|------|---------|--------------|
| `$state(v)` | Reactive variable | Deep proxy, triggers updates on assignment |
| `$state.raw(v)` | Shallow reactive | Only reassignment triggers update |
| `$state.snapshot(v)` | Read without tracking | Returns plain object |
| `$derived(e)` | Computed value | Cached, updates on dependency change |
| `$derived.by(fn)` | Block computed | Multi-line computation |
| `$effect(fn)` | Side effect | Runs after DOM, cleanup via return |
| `$effect.root(fn)` | Untracked effect | Runs once, manual cleanup |
| `$effect.tracking()` | Context check | True inside reactive scope |
| `$props()` | Component inputs | Destructure for typed props |
| `$bindable(v)` | Two-way binding | Enables `bind:prop` |
| `$inspect(...)` | Debug tool | Logs values on change (dev only) |
