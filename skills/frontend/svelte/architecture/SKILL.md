---
name: frontend-svelte-architecture
description: >
  Use this skill when the user says 'Svelte architecture', 'Svelte 5', 'Svelte runes', 'Svelte component', 'Svelte reactivity', 'Svelte store', 'Svelte compiler', '.svelte file'. This skill enforces: Svelte 5 runes ($state, $derived, $effect, $props, $bindable), .svelte file syntax, compile-time reactivity, and lifecycle tied to component tree. Requires Svelte 5 project (package.json with svelte ^5). Do NOT use for: Svelte 4 with legacy $: syntax, or non-Svelte frameworks.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, svelte, phase-7]
---

# Svelte Architecture

## Purpose
Build applications with Svelte 5 runes — explicit reactivity via $state, $derived, $effect, compiled at build time, no virtual DOM, and minimal runtime.

## Agent Protocol

### Trigger
Exact user phrases: "Svelte architecture", "Svelte 5", "Svelte runes", "Svelte component", "Svelte reactivity", "Svelte store", "Svelte compiler", ".svelte file".

### Input Context
Before activating, verify:
- package.json has svelte ^5 dependency.
- Whether the project uses SvelteKit or Svelte standalone.
- svelte.config.js has compilerOptions: { runes: true } if not default.

### Output Artifact
No file output. Produces component code, rune usage, and lifecycle patterns as text.

### Response Format
Code: show .svelte components with script, markup, optional style.

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Components use Svelte 5 runes ($state, $derived, $effect, $props).
- [ ] Derived values use $derived, not $effect.
- [ ] $state provides deep reactivity for objects and arrays.
- [ ] State shared across components via $state class instances or context.
- [ ] Lifecycle hooks (onMount, onDestroy) tied to component tree.
- [ ] Legacy $: syntax replaced with runes in new code.

### Max Response Length
Code: 15 lines per example.

## Component Architecture / Decision Trees

### Architecture Options

| Approach | Trade-off | When to Use |
|----------|-----------|-------------|
| Single-file .svelte with all logic | Simple, colocated | Small components under 100 lines |
| .svelte.js module for shared state | Separates state from UI | Multiple components share state |
| SvelteKit + load functions | SSR data fetching built-in | Full-stack SvelteKit apps |
| Svelte standalone + adapter | Minimal, SPA-like | Existing non-SvelteKit projects |
| Snippets + render functions | Reusable template fragments | Complex list rendering patterns |

### Decision Tree: State Sharing

```
Does state need to be shared across components?
  ├── No → $state() locally inside component
  └── Yes → Is it component-tree scoped?
       ├── Yes → setContext() / getContext()
       └── No → .svelte.js module with $state class
```

### Decision Tree: Reactivity

```
Is the value derived from existing state?
  ├── No → $state()
  └── Yes → $derived() or $derived.by()
```

```
Is there a side effect (localStorage, analytics)?
  ├── No → Use $derived
  └── Yes → Use $effect with cleanup
```

### Decision Tree: Template Syntax

```
What kind of logic in template?
  ├── Conditional display → {#if} {:else if} {:else} {/if}
  ├── List rendering → {#each items as item (key)} {/each}
  ├── Await promise → {#await promise} {:then value} {:catch error} {/await}
  └── Reusable fragment → {#snippet name()} {@render name()}
```

## Component Design Patterns

### Basic Counter

```svelte
<script>
  let count = $state(0)
  let doubled = $derived(count * 2)

  function increment() { count++ }
  function decrement() { count-- }
</script>

<div>
  <p>Count: {count}</p>
  <p>Doubled: {doubled}</p>
  <button onclick={increment}>+</button>
  <button onclick={decrement}>-</button>
</div>
```

### Form with Validation

```svelte
<script>
  let email = $state('')
  let password = $state('')
  let errors = $state<Record<string, string>>({})

  let isValid = $derived(email.includes('@') && password.length >= 8)

  async function handleSubmit(e: Event) {
    e.preventDefault()
    const result = schema.safeParse({ email, password })
    if (!result.success) { errors = result.error.flatten().fieldErrors; return }
    await api.login(result.data)
  }
</script>

<form onsubmit={handleSubmit}>
  <input type="email" bind:value={email} aria-invalid={!!errors.email} />
  {#if errors.email}<span class="error">{errors.email}</span>{/if}
  <input type="password" bind:value={password} />
  {#if errors.password}<span class="error">{errors.password}</span>{/if}
  <button type="submit" disabled={!isValid}>Login</button>
</form>
```

### Data Fetching with onMount

```svelte
<script>
  import { onMount } from 'svelte'
  let users = $state<User[]>([])
  let loading = $state(true)
  let error = $state<string | null>(null)

  onMount(async () => {
    try {
      const res = await fetch('/api/users')
      if (!res.ok) throw new Error('Failed to load')
      users = await res.json()
    } catch (e) {
      error = e instanceof Error ? e.message : 'Unknown error'
    } finally {
      loading = false
    }
  })
</script>

{#if loading}
  <p>Loading...</p>
{:else if error}
  <p class="error">{error}</p>
{:else}
  {#each users as user (user.id)}
    <p>{user.name}</p>
  {/each}
{/if}
```

### Snippet Pattern

```svelte
{#snippet tableRow(item: { id: string; name: string; email: string })}
  <tr>
    <td>{item.name}</td>
    <td>{item.email}</td>
  </tr>
{/snippet}

<table>
  {#each users as user}
    {@render tableRow(user)}
  {/each}
</table>
```

## State Management Patterns

### Local State with $state

```svelte
<script>
  let count = $state(0)           // primitive
  let user = $state({ name: 'Alice', email: 'alice@test.com' })  // deep reactive
  let items = $state<Item[]>([])  // array
  let theme = $state<'light' | 'dark'>('light')

  count++  // direct mutation works
  user.name = 'Bob'  // deeply reactive
  items = [...items, newItem]  // replace for reactivity
</script>
```

### Derived State with $derived

```svelte
<script>
  let count = $state(0)
  let doubled = $derived(count * 2)
  let label = $derived.by(() => count > 10 ? 'High' : count > 5 ? 'Medium' : 'Low')
  // $derived.by() for multi-statement computations
</script>
```

### Side Effects with $effect

```svelte
<script>
  let count = $state(0)

  $effect(() => {
    console.log(`Count changed to: ${count}`)
    // Runs when count changes, and on mount
  })

  $effect(() => {
    const interval = setInterval(() => count++, 1000)
    return () => clearInterval(interval) // cleanup
  })
</script>
```

### Context-Based Shared State

```svelte
<script>
  import { setContext, getContext } from 'svelte'
  const KEY = Symbol('theme')

  // Provider
  let theme = $state('light')
  setContext(KEY, {
    get theme() { return theme },
    toggle: () => theme = theme === 'light' ? 'dark' : 'light',
  })

  // Consumer (in another component)
  let ctx = getContext<{ theme: string; toggle: () => void }>(KEY)
  // ctx.theme, ctx.toggle()
</script>
```

### Module-Level State (.svelte.js)

```typescript
// stores/counter.svelte.js
class CounterStore {
  count = $state(0)
  doubled = $derived(this.count * 2)

  increment() { this.count++ }
  decrement() { this.count-- }
  reset() { this.count = 0 }
}
export const counter = new CounterStore()
```

## Performance Optimization

### Compile-Time Optimization
Svelte 5's compiler analyzes variable dependencies at build time. The generated code updates only the specific DOM nodes that depend on changed values — no VDOM diffing.

### Bundle Size
- Svelte runtime: ~2KB gzipped (vs React ~45KB, Vue ~30KB).
- Components compile to vanilla JS with no runtime overhead.
- Runes add zero overhead — they compile to direct variable assignments.

### Avoiding Wasted Reactivity
```svelte
<script>
  let count = $state(0)
  // This creates a new subscription each render. Use $derived instead.
  $effect(() => {
    // Don't use $effect for DOM that can use {count * 2}
  })
</script>
<p>{count * 2}</p> <!-- Direct expression — no extra memory, no effect -->
```
Expressions in the template are compiled to direct DOM updates, not diffed through VDOM.

### $state Proxy Overhead
Deeply nested objects in $state are wrapped in proxies. For very large arrays (10K+ entries), consider using an immutable update pattern or virtual scrolled lists.

## Build & Bundle Considerations

### Svelte Configuration

```js
// svelte.config.js
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

export default {
  preprocess: vitePreprocess(),
  compilerOptions: {
    runes: true,
    compatibility: { componentApi: 4 },
  },
}
```

### Vite Configuration

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte()],
  build: { target: 'esnext' },
})
```

### Build Output
- Components compile to vanilla JS, no runtime needed
- CSS is extracted from `<style>` blocks and bundled
- Route-level code splitting with SvelteKit is automatic

## Testing Strategies

### Unit Testing with Vitest

```tsx
// __tests__/Component.test.ts
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/svelte'
import Counter from './Counter.svelte'

describe('Counter', () => {
  it('renders initial count', () => {
    render(Counter, { props: { initial: 5 } })
    expect(screen.getByText('5')).toBeDefined()
  })

  it('increments on click', async () => {
    render(Counter)
    const btn = screen.getByRole('button')
    await fireEvent.click(btn)
    expect(screen.getByText('1')).toBeDefined()
  })
})
```

### SvelteKit Load Function Tests

```tsx
// __tests__/load.test.ts
import { describe, it, expect } from 'vitest'
import { load } from './+page.server'

describe('page load', () => {
  it('returns products', async () => {
    const result = await load({ params: {}, url: new URL('http://localhost'), locals: {} })
    expect(result).toHaveProperty('products')
  })
})
```

## Migration Patterns

### Svelte 4 to Svelte 5

```svelte
// Svelte 4: $: reactive statements
let count = 0
let doubled
$: doubled = count * 2
$: console.log(count)

// Svelte 5: runes
let count = $state(0)
let doubled = $derived(count * 2)
$effect(() => console.log(count))
```

Run `npx svelte-migrate@latest runes` to automate the migration.

### React to Svelte 5
```
useState -> $state
useMemo -> $derived
useEffect -> $effect
useContext -> setContext/getContext
useRef -> $state with bind:this
React.memo -> Automatic (compile-time)
```

## Anti-Patterns

### $effect for Derived State

```svelte
<script>
  // Anti-pattern
  let count = $state(0)
  let doubled = $state(0)
  $effect(() => { doubled = count * 2 })

  // Correct
  let doubled = $derived(count * 2)
</script>
```

### Missing $effect Cleanup

```svelte
<script>
  // Anti-pattern — memory leak
  $effect(() => {
    const interval = setInterval(() => count++, 1000)
  })

  // Correct
  $effect(() => {
    const interval = setInterval(() => count++, 1000)
    return () => clearInterval(interval)
  })
</script>
```

### Mutating Props

Props from `$props()` are read-only. Copy to local state if mutation is needed:

```svelte
<script>
  let { initialCount } = $props()
  let count = $state(initialCount) // copy for mutation
</script>
```

### Using $: in Svelte 5

The legacy `$:` syntax is deprecated. All new code must use runes.

## Common Pitfalls

### Pitfall 1: Using $effect for Derived State
Writable + $effect instead of $derived creates redundant state and potential infinite loops.

### Pitfall 2: Missing $effect Cleanup
Always return cleanup from $effect for subscriptions, intervals, or abort controllers.

### Pitfall 3: Mutating Props
Props passed via $props() are read-only. Copy to local $state if mutation is needed.

### Pitfall 4: Forgetting $state Makes Objects Deeply Reactive
Objects initialized with `$state({...})` are deeply reactive. Direct mutation works.

### Pitfall 5: Legacy $: Syntax in Svelte 5
Svelte 5 still supports `$:` for backward compatibility but it is deprecated. All new code must use runes.

## Compared With

### Svelte 5 vs React
| Aspect | Svelte 5 | React |
|--------|----------|-------|
| Reactivity | Compile-time, fine-grained | Runtime, VDOM diffing |
| Bundle size | Very small (no runtime) | Larger (react-dom + scheduler) |
| Learning curve | Lower (natural JS syntax) | Higher (hooks rules, deps arrays) |
| Component syntax | Single file (html+js+css) | JSX/TSX only |
| State management | Built-in runes | External libs (Zustand, Jotai) |
| SSR | SvelteKit | Next.js, Remix |

### Svelte 5 vs Vue
Both have single-file components, but Svelte 5 uses compile-time reactivity (no proxy system, no ref() wrapper). Vue's Composition API is closer to React hooks; Svelte runes feel more like plain JS.

### Svelte 5 vs SolidJS
Both compile to fine-grained reactive DOM updates. SolidJS uses JSX-only with signals as functions; Svelte uses template syntax with runes as variables. Svelte is more approachable for designers; SolidJS is closer to React developers.

## Ecosystem & Tooling

### Core Packages
| Package | Purpose |
|---------|---------|
| svelte | Core compiler and runtime with runes |
| @sveltejs/kit | Full-stack framework (routing, SSR, adapters) |
| @sveltejs/adapter-* | Deploy targets (node, vercel, netlify, cloudflare) |

### Tools
- **Svelte VS Code Extension** — Syntax highlighting, TypeScript support, auto-complete for runes.
- **svelte-check** — CLI type checking and validation (`npx svelte-check`).
- **svelte-migrate** — Automatically migrate Svelte 4 to Svelte 5 runes.
- **Vite** — Official build tool with HMR for instant updates.

### UI Libraries
- **Skeleton** — UI toolkit for Svelte + Tailwind.
- **Shadcn-svelte** — Port of shadcn/ui for Svelte.
- **Melt UI** — Headless UI primitives for Svelte.
- **Threlte** — Three.js integration for Svelte.

### Community
- Official docs: svelte.dev
- SvelteKit docs: kit.svelte.dev
- GitHub: github.com/sveltejs/svelte
- Discord: discord.gg/svelte

## Workflow

### Step 1: Svelte 5 Runes
```svelte
<script>
  let count = $state(0)
  let user = $state({ name: 'Alice' })
  let doubled = $derived(count * 2)
  let label = $derived.by(() => count > 10 ? 'High' : 'Low')

  $effect(() => {
    console.log(`Count: ${count}`)
    return () => console.log('cleanup')
  })

  let { name = 'world', children } = $props()
</script>

<h1>Hello {name}! Count: {count}</h1>
<button onclick={() => count++}>+1</button>
{@render children?.()}
```

### Step 2: Component Syntax (.svelte)
```svelte
<script>
  let { variant = 'primary', disabled = false, onclick } = $props()
</script>

<button class={variant} {disabled} {onclick}>
  <slot />
</button>

<style>
  button { padding: 0.5rem 1rem; border-radius: 0.375rem; }
  .primary { background: #3b82f6; color: white; }
</style>
```

### Step 3: Reactivity (Fine-Grained)
```svelte
<script>
  let items = $state([{ id: 1, text: 'Learn Svelte' }])

  function addItem(text: string) {
    items = [...items, { id: Date.now(), text }]
  }

  function updateItem(id: number, text: string) {
    items = items.map(i => i.id === id ? { ...i, text } : i)
  }

  let sorted = $derived([...items].sort((a, b) => a.text.localeCompare(b.text)))
</script>
```

### Step 4: State Management
```svelte
<script>
  import { setContext, getContext } from 'svelte'
  const KEY = Symbol('theme')
  let theme = $state('light')

  setContext(KEY, { theme, toggle: () => theme = theme === 'light' ? 'dark' : 'light' })

  let ctx = getContext<{ theme: string; toggle: () => void }>(KEY)
</script>
```
For global state, use $state class instances in a module `.svelte.js` file: `export const store = new Store()`.

### Step 5: Snippets and Render Functions
```svelte
{#snippet tableRow(item: { id: string; name: string })}
  <tr><td>{item.name}</td></tr>
{/snippet}

{#each data as item}
  {@render tableRow(item)}
{/each}
```

### Step 6: Lifecycle
```svelte
<script>
  import { onMount, onDestroy, tick } from 'svelte'
  let el = $state()

  onMount(() => {
    console.log('mounted', el)
    return () => console.log('unmount cleanup')
  })

  onDestroy(() => console.log('destroyed'))
</script>

<div bind:this={el}>Content</div>
```

## Rules
- Runes work in .svelte and .svelte.js files.
- $state makes variable reactive — direct mutation works.
- Use $derived for computed values, never $effect.
- $effect runs after DOM update — side effects only.
- $effect cleanup returned as function runs on re-run or destroy.
- Always return cleanup from $effect for subscriptions, intervals.
- Use $state class instances in .svelte.js for global state.
- Snippets over slots for typed, reusable template fragments.

## References
- references/svelte-5-runes.md — Svelte 5 Runes
- references/svelte-components.md — Svelte Components
- references/svelte-optimization.md — Svelte Optimization Patterns
- references/svelte-reactivity.md — Svelte Reactivity Patterns
- references/svelte-runes.md — Svelte 5 Runes
- references/svelte-testing.md — Svelte Testing Reference
- references/svelte-5-runes-deep-dive.md — Svelte 5 Runes Deep Dive
- references/svelte-performance-optimization.md — Svelte Performance Optimization

## Handoff
No artifact produced.
Next skill: frontend-svelte-patterns for forms, animations, actions, data fetching.
Carry forward: rune conventions, lifecycle patterns, context setup.
