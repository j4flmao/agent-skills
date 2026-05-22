# Svelte 5 Runes — $state, $derived, $effect, $props, $bindable

## $state — Reactive State

```svelte
<script>
  let count = $state(0)

  function increment() {
    count += 1  // Direct mutation — reactive
  }
</script>

<button onclick={increment}>{count}</button>
```

### Deep Reactivity

```svelte
<script>
  let user = $state({ name: 'Alice', address: { city: 'NYC' } })

  function updateCity() {
    user.address.city = 'Brooklyn'  // Deeply reactive
  }
</script>
```

### $state with Class Instances

```svelte
<script>
  class Counter {
    count = $state(0)
    increment() { this.count += 1 }
  }

  let counter = new Counter()
</script>

<button onclick={() => counter.increment()}>{counter.count}</button>
```

## $derived — Computed Values

```svelte
<script>
  let width = $state(100)
  let height = $state(200)

  let area = $derived(width * height)          // Synchronous only
  let description = $derived(`Area: ${area} px`) // Can depend on other $derived

  // $derived.by — for blocks
  let label = $derived.by(() => {
    if (area > 1000) return 'Large'
    return 'Small'
  })
</script>
```

## $effect — Side Effects

```svelte
<script>
  let count = $state(0)

  // Runs after DOM update when count changes
  $effect(() => {
    console.log(`Count changed to ${count}`)
  })

  // With cleanup
  $effect(() => {
    const interval = setInterval(() => console.log(count), 1000)
    return () => clearInterval(interval)
  })
</script>
```

### $effect.pre — Run Before DOM Update

```svelte
<script>
  let el = $state<HTMLElement>()
  let height = $state(0)

  $effect.pre(() => {
    if (el) {
      height = el.offsetHeight  // Read layout before DOM paint
    }
  })
</script>

<div bind:this={el}>Content</div>
```

## $props — Component Inputs

```svelte
<script>
  let { name, count = 0, children }: {
    name: string
    count?: number
    children?: import('svelte').Snippet
  } = $props()
</script>

<h1>{name} ({count})</h1>
{@render children?.()}
```

## $bindable — Two-Way Binding

```svelte
<script>
  let { value = $bindable(0) } = $props()
</script>

<button onclick={() => value++}>{value}</button>

<!-- Usage: <Counter bind:value={parentCount} /> -->
```

## Legacy Compatibility

Svelte 5 supports legacy `let` / `$:` / `export let` syntax. Migrate gradually:

```svelte
<!-- Legacy (still works in Svelte 5) -->
<script>
  export let name = 'world'
  $: greeting = `Hello ${name}`
</script>

<!-- Modern (Svelte 5 runes) -->
<script>
  let { name = 'world' } = $props()
  let greeting = $derived(`Hello ${name}`)
</script>
```

Enable runes mode project-wide:`compilerOptions: { runes: true }` in `svelte.config.js`.
