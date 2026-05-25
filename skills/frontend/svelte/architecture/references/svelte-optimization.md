# Svelte Optimization Patterns

## Compile-Time Optimization

Svelte 5 compiles your components to minimal, imperative JavaScript at build time:

```svelte
<script>
  let count = $state(0)
  let items = $state([])
</script>

<button onclick={() => count++}>Clicked {count}</button>
```

Compiled output (simplified) — direct DOM updates, no virtual DOM:

```js
function template() {
  let count = 0
  const button = document.createElement('button')
  const text = new Text()
  button.append('Clicked ', text)
  button.addEventListener('click', () => {
    count++
    text.data = count  // Direct text node update
  })
  return button
}
```

## Avoiding Unnecessary Reactivity

```svelte
<script>
  let items = $state([])
  let filter = $state('')

  // ❌ Wrong: Runs on every items change
  let visibleItems = $derived(
    items.filter(i => i.name.includes(filter))
  )

  // ✅ Correct: Fine-grained dependencies
  let visibleItems = $derived.by(() => {
    if (!filter) return items
    return items.filter(i => i.name.includes(filter))
  })
</script>
```

## Keyed Each Blocks

```svelte
<!-- ✅ Correct: Keyed reconciliation -->
{#each items as item (item.id)}
  <div>{item.name}</div>
{/each}

<!-- ❌ Wrong: No key — recreates DOM -->
{#each items as item}
  <div>{item.name}</div>
{/each}
```

## Lazy Loading Components

```svelte
<script>
  import { mount } from 'svelte'
  let HeavyComponent

  async function loadHeavy() {
    HeavyComponent = (await import('./HeavyComponent.svelte')).default
  }
</script>

<button onclick={loadHeavy}>Show Heavy Component</button>
{#if HeavyComponent}
  <HeavyComponent />
{/if}
```

## Transition Optimization

```svelte
<script>
  import { flip } from 'svelte/animate'
  import { slide } from 'svelte/transition'
  let items = $state([{ id: 1, text: 'A' }, { id: 2, text: 'B' }])

  function shuffle() { items = items.reverse() }
</script>

<button onclick={shuffle}>Shuffle</button>
{#each items as item (item.id)}
  <div transition:slide animate:flip>{{item.text}}</div>
{/each}
```

## Performance Budget

| Metric | Target |
|--------|--------|
| Svelte runtime | ~1.5kB |
| Per component output | <0.5kB |
| Initial JS (no SvelteKit) | <10kB |
| Hydration | Not needed (no VDOM) |
| Bundle comparison | 5-10x smaller than React |

## Resource Hints

```svelte
<svelte:head>
  <link rel="preload" href={heroImage} as="image" fetchpriority="high">
  <link rel="modulepreload" href="/build/chunk-abc.js">
</svelte:head>
```

## Untrack

```svelte
<script>
  import { untrack } from 'svelte'

  $effect(() => {
    // count change triggers, but access theme without tracking
    console.log('Count:', count, 'Theme:', untrack(() => theme))
  })
</script>
```
