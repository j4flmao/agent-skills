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

## Workflow

### Step 1: Svelte 5 Runes
```svelte
<script>
  let count = $state(0)                        // Reactive state
  let user = $state({ name: 'Alice' })         // Deeply reactive
  let doubled = $derived(count * 2)             // Computed value
  let label = $derived.by(() => count > 10 ? 'High' : 'Low')  // Block computed

  $effect(() => {                               // Side effect
    console.log(`Count: ${count}`)
    return () => console.log('cleanup')          // Cleanup
  })

  let { name = 'world', children } = $props()   // Component inputs
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
    items = [...items, { id: Date.now(), text }]   // Triggers update
  }

  function updateItem(id: number, text: string) {
    items = items.map(i => i.id === id ? { ...i, text } : i)  // Deep update
  }

  let sorted = $derived([...items].sort((a, b) => a.text.localeCompare(b.text)))
</script>
```

### Step 4: State Management
```svelte
<script>
  // Context for scoped state
  import { setContext, getContext } from 'svelte'

  const KEY = Symbol('theme')
  let theme = $state('light')

  // Provider
  setContext(KEY, { theme, toggle: () => theme = theme === 'light' ? 'dark' : 'light' })

  // Consumer (in child component)
  let ctx = getContext<{ theme: string; toggle: () => void }>(KEY)
</script>
```
For global state, use $state class instances in a module `.svelte.js` file: `export const store = new Store()`.

### Step 5: Lifecycle
```svelte
<script>
  import { onMount, onDestroy, tick } from 'svelte'
  let el = $state()

  onMount(() => {
    console.log('mounted', el)
    return () => console.log('unmount cleanup')
  })

  onDestroy(() => console.log('destroyed'))

  async function handleClick() {
    await tick()  // Wait for DOM update
    console.log('DOM synced')
  }
</script>

<div bind:this={el}>Content</div>
```

## Rules
- Runes work in .svelte and .svelte.js files.
- $state makes variable reactive — direct mutation works.
- Use $derived for computed values, never $effect.
- $effect runs after DOM update — side effects only.
- Avoid $effect for derived state — use $derived.
- $effect cleanup returned as function runs on re-run or destroy.
- Svelte 5 retains backward compatibility with legacy syntax.

## References
  - references/svelte-5-runes.md — Svelte 5 Runes
  - references/svelte-components.md — Svelte Components — Slots, Context, Lifecycle, Events, Actions, Transitions
  - references/svelte-optimization.md — Svelte Optimization Patterns
  - references/svelte-reactivity.md — Svelte Reactivity Patterns
  - references/svelte-runes.md — Svelte 5 Runes — $state, $derived, $effect, $props, $bindable
  - references/svelte-testing.md — Svelte Testing Reference
## Handoff
No artifact produced.
Next skill: frontend-svelte-patterns for forms, animations, actions, and data fetching.
Carry forward: rune conventions, lifecycle patterns, context setup.
