# Svelte Performance Optimization

## Introduction

Svelte 5 achieves high performance through compile-time optimization. The compiler transforms .svelte files into vanilla JavaScript that directly manipulates the DOM, eliminating the need for a virtual DOM, diffing algorithms, or a runtime reconciliation engine. This guide covers optimization strategies from the compiler level through application architecture.

## Compiler-Level Optimizations

### How Svelte 5 Compiles Components

When Svelte 5 compiles a component, it:

1. Analyzes the template to identify reactive dependencies
2. Creates `$state`, `$derived`, and `$effect` bindings
3. Generates direct DOM manipulation code for each reactive binding
4. Eliminates unused variables and expressions (tree-shaking friendly)
5. Inlines small functions where possible

```svelte
<!-- Input -->
<script>
  let count = $state(0)
  let doubled = $derived(count * 2)
</script>

<p>Count: {count}</p>
<p>Doubled: {doubled}</p>
<button onclick={() => count++}>+1</button>
```

The generated code (simplified):
```js
let count = 0
let doubled = 0
let p1, p2, button

function update() {
  doubled = count * 2
  p1.data = `Count: ${count}`
  p2.data = `Doubled: ${doubled}`
}

button.onclick = () => { count++; update() }
```

No VDOM, no component function re-run, no diffing. Only the specific text nodes are updated.

### $derived vs Inline Expressions

```svelte
<script>
  let count = $state(0)
  // Option A: $derived
  let doubled = $derived(count * 2)
</script>

<!-- Option A: Uses $derived variable -->
<p>{doubled}</p>

<!-- Option B: Inline expression (also optimized) -->
<p>{count * 2}</p>
```

Both options compile to equivalent code. The compiler inlines simple expressions. Use `$derived` when:
- The expression is complex or multi-line
- The derived value is used in multiple places
- The computation is expensive and benefits from caching

### Tree Shaking

Svelte 5's compiler tracks which features are used and eliminates unused code:
- Unused runes are removed
- Unused template variables are stripped
- Feature flags remove development-only code in production

```svelte
<!-- $inspect is removed in production -->
<script>
  let count = $state(0)
  $inspect(count) // Removed from production build
</script>
```

### Compiled CSS

Svelte scopes CSS by adding hash classes. The compiler:
- Adds a unique class to each component's elements
- Rewrites CSS selectors with scoping class
- Removes unused CSS rules

```svelte
<style>
  p { color: blue; }  /* Becomes .s-abc123 p { color: blue; } */
  .special { font-weight: bold; }
</style>
```

## Application-Level Optimization

### Avoiding Unnecessary Reactivity

```svelte
<script>
  let items = $state([...largeArray])
  let search = $state('')

  // Bad: filtering in the template creates a new array every render
  // But Svelte compiles this efficiently — template expressions are reactive

  // Better: use $derived for explicit caching
  let filtered = $derived(
    search
      ? items.filter(item => item.name.includes(search))
      : items
  )
</script>

{#each filtered as item (item.id)}
  <p>{item.name}</p>
{/each}
```

### Using $state.raw for Large Arrays

```svelte
<script>
  // For arrays with 1000+ items that are replaced wholesale
  let items = $state.raw<Item[]>([])

  async function load() {
    const data = await fetchLargeDataset()
    items = data // Direct reassignment, no proxy overhead
  }
</script>
```

`$state.raw` avoids the Proxy wrapper. Use when:
- You mutate the array by replacing it entirely
- The array contains 1000+ items
- Deep reactivity isn't needed

### Avoiding Component Boundaries

Each .svelte component creates a boundary. For performance-critical lists:

```svelte
<!-- Slow: individual components for each item -->
{#each items as item (item.id)}
  <ListItem {item} />
{/each}

<!-- Fast: inline the rendering -->
{#each items as item (item.id)}
  <div class="item">
    <h3>{item.name}</h3>
    <p>{item.description}</p>
  </div>
{/each}
```

If you need component boundaries for event handlers or styling, pass data directly rather than using stores:

```svelte
<!-- Efficient component with direct props -->
<script>
  let { item, onSelect } = $props()
</script>

<button onclick={() => onSelect(item.id)}>
  {item.name}
</button>
```

### Context vs Props vs Stores

```svelte
<script>
  import { getContext } from 'svelte'

  // Slower: context lookup on every access
  const theme = getContext('theme')
  // Slightly slower than props because of context resolution

  // Faster: direct props
  let { theme } = $props()
  // Direct, no lookup overhead
</script>
```

Performance hierarchy (fastest to slowest):
1. Direct props
2. Module-level $state (imported)
3. Context (getContext)
4. Stores (writable/readable) — legacy Svelte 4 pattern

### Snippet Performance

Snippets are lightweight template fragments that don't create component boundaries:

```svelte
{#snippet card(item: Item)}
  <div class="card">
    <h3>{item.name}</h3>
    <p>{item.description}</p>
  </div>
{/snippet}

{#each items as item}
  {@render card(item)}
{/each}
```

Snippets are more performant than separate components because they:
- Don't create component boundaries
- Don't have their own lifecycle
- Don't require prop validation

## SvelteKit-Specific Optimizations

### Server-Side Rendering

```ts
// +page.server.ts — runs on server only, never in client bundle
export async function load({ params, fetch }) {
  const response = await fetch(`/api/items/${params.id}`)
  return response.json()
}
```

Server load functions keep data fetching out of the client bundle. The data is serialized and sent with the HTML.

### Streaming

```ts
// +page.server.ts
export async function load() {
  return {
    critical: await getCriticalData(),  // Waits for this
    nonCritical: getNonCriticalData(),   // Streams this
  }
}
```

```svelte
<!-- +page.svelte -->
<script>
  let { data } = $props()
</script>

{#await data.nonCritical}
  <p>Loading additional content...</p>
{:then result}
  <p>Non-critical: {result}</p>
{/await}
```

SvelteKit supports streaming non-critical data. The page renders immediately with critical data, and non-critical data streams in later.

### Prerendering

```svelte
<!-- +page.ts or +page.server.ts -->
export const prerender = true
```

Prerendering generates static HTML at build time. No server resources needed for these pages. Use for:
- Blog posts
- Documentation
- Marketing pages
- Public product listings

### Cache Headers

```ts
// +page.server.ts
export async function load({ setHeaders, fetch }) {
  const data = await fetch('/api/data').then(r => r.json())

  setHeaders({
    'Cache-Control': 'public, max-age=300, s-maxage=3600',
  })

  return data
}
```

Set Cache-Control headers in server load functions to enable CDN and browser caching.

## Measuring Performance

### Using svelte-check

```bash
npx svelte-check
```

Identifies:
- Unused CSS
- Missing type annotations
- Accessibility issues
- Potential performance problems

### Using the Browser Profiler

1. Open Chrome DevTools > Performance
2. Record user interactions
3. Look for:
   - Long tasks (>50ms)
   - Forced reflows
   - Layout thrashing
   - Expensive event handlers

### Svelte-Specific Metrics

| Metric | How to Measure | Target |
|--------|---------------|--------|
| Component mount time | Performance API | <10ms per component |
| Update latency | requestAnimationFrame callback | <16ms (60fps) |
| Bundle size | vite bundle analyzer | <200KB total |
| SSR time | SvelteKit server logs | <200ms |
| Hydration time | Performance API | <100ms |

## Advanced Techniques

### Lazy Loading Components

```svelte
<script>
  import { mount } from 'svelte'
  let HeavyComponent = $state(null)

  async function loadHeavy() {
    const module = await import('./HeavyComponent.svelte')
    HeavyComponent = module.default
  }
</script>

<button onclick={loadHeavy}>Load Heavy Component</button>
{#if HeavyComponent}
  <HeavyComponent />
{/if}
```

### Virtual Scrolling

For lists of 1000+ items, use virtual scrolling:

```svelte
<script>
  let items = $state([])
  let container = $state()
  let visible = $derived(
    items.filter(/* viewport calculation */)
  )
</script>

<div bind:this={container} style="height: 400px; overflow-y: auto;">
  {#each visible as item (item.id)}
    <div style="height: 50px;">
      {item.name}
    </div>
  {/each}
</div>
```

For production, use `svelte-virtual-list` or implement with IntersectionObserver.

### Debounced Input

```svelte
<script>
  import { tick } from 'svelte'

  let rawQuery = $state('')
  let debouncedQuery = $state('')
  let timer = $state()

  $effect(() => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      debouncedQuery = rawQuery
    }, 300)
    return () => clearTimeout(timer)
  })
</script>

<input bind:value={rawQuery} />
```

### Memoizing Expensive Computations

```svelte
<script>
  import { fibonacci } from './math'

  let n = $state(30)

  // Bad: recalculates on every dependency change
  // But $derived caches — so this IS fine
  let result = $derived(fibonacci(n))

  // For extremely expensive operations, add explicit caching
  let cache = $state({})
  let memoized = $derived.by(() => {
    if (cache[n] !== undefined) return cache[n]
    const val = veryExpensiveComputation(n)
    cache[n] = val
    return val
  })
</script>
```

## Bundle Size Optimization

### Analyzing Bundle

```bash
npm run build
# SvelteKit outputs stats to .svelte-kit/output/
# Use vite-bundle-analyzer for visual output
```

### Code Splitting

```ts
// +page.ts — lazy load route modules
// Routes are automatically code-split in SvelteKit
```

SvelteKit automatically code-splits by route. Each route is a separate chunk loaded on navigation.

### Dynamic Imports

```svelte
<script>
  async function loadChart() {
    const { Chart } = await import('chart-library')
    chartInstance = new Chart(container)
  }
</script>
```

## Avoiding Common Performance Issues

### Issue 1: Reactive Over-subscription

```svelte
<script>
  let user = $state({ name: 'Alice', preferences: { theme: 'dark' } })

  // This re-runs when ANY property of user changes
  $effect(() => {
    console.log(user.name)  // Also subscribes to entire user
  })
</script>
```

The effect only subscribes to properties actually read. Reading `user.name` subscribes only to `name`, not to `preferences`. Svelte's compiler tracks individual property access.

### Issue 2: Heavy Computations in Templates

```svelte
<!-- Bad: sorting on every reactive update -->
{#each [...items].sort(compare) as item (item.id)}
  <p>{item.name}</p>
{/each}

<!-- Good: cached computation -->
<script>
  let sorted = $derived([...items].sort(compare))
</script>
{#each sorted as item (item.id)}
  <p>{item.name}</p>
{/each}
```

### Issue 3: Uncontrolled Re-renders from Stores

```svelte
<script>
  import { todos } from './stores'

  // This subscribes to ALL todo changes
  // Even if this component only displays count
</script>

<p>Total: {$todos.length}</p>
```

Use derived stores or selectors to minimize subscriptions:

```svelte
<script>
  import { derived } from 'svelte/store'
  import { todos } from './stores'

  let count = derived(todos, $todos => $todos.length)
</script>

<p>Total: {$count}</p>
```

Or better, use $state in a .svelte.js module:

```ts
// todos.svelte.ts
export class TodoStore {
  items = $state([])

  get count() {
    return this.items.length
  }
}

export const todos = new TodoStore()
```

```svelte
<script>
  import { todos } from './todos.svelte.js'
</script>

<!-- Only subscribed to todos.count -->
<p>Total: {todos.count}</p>
```

## Svelte 5 Specific Optimizations

### Use $derived.by for Complex Computations

```svelte
<script>
  let searchTerm = $state('')
  let items = $state([])

  // $derived.by creates a proper dependency scope
  let results = $derived.by(() => {
    if (!searchTerm) return items
    const start = performance.now()
    const filtered = items.filter(i => i.name.includes(searchTerm))
    console.log(`Filter took ${performance.now() - start}ms`)
    return filtered
  })
</script>
```

### Avoid $effect Where Possible

```svelte
<script>
  let count = $state(0)
  let name = $state('')

  // Bad: using $effect for logging
  $effect(() => {
    console.log(count)
  })

  // Better: use event handler for user-initiated actions
  function increment() {
    count++
    console.log('User incremented to', count)
  }
</script>
```

Use `$effect` only for:
- Side effects that must sync with the DOM (focus management, measurements)
- Subscriptions to external systems (WebSocket, intervals)
- Integration with non-Svelte libraries

## Summary Checklist

| Optimization | Impact | Effort |
|-------------|--------|--------|
| Use $state.raw for large arrays | Medium | Low |
| Inline list items instead of components | High | Medium |
| Use $derived for filters/sorts | High | Low |
| Use snippets instead of slot components | Medium | Low |
| Prerender static pages | High | Low |
| Set Cache-Control headers | High | Low |
| Lazy load heavy components | High | Medium |
| Virtual scroll for 1000+ lists | Very High | Medium |
| Bundle analysis | Medium | Low |
| svelte-check regularly | Low | Low |
