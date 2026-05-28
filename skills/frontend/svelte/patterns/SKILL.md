---
name: frontend-svelte-patterns
description: >
  Use this skill when the user says 'Svelte pattern', 'Svelte form', 'Svelte animation', 'Svelte transition', 'Svelte action', 'Svelte store pattern', 'Svelte data fetching'. This skill enforces: bind:value for form inputs, use:enhance for progressive enhancement, transition/animate directives for animations, use:action for reusable DOM behavior, and SvelteKit load functions for SSR data fetching. Requires existing Svelte 5 project (package.json with svelte ^5). Do NOT use for: React or Vue form/transition patterns.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, svelte, patterns, phase-7]
---

# Svelte Patterns

## Purpose
Apply production patterns to Svelte 5 applications: forms with bind:value and progressive enhancement, animations via transition/animate directives, actions for reusable DOM behavior, and data fetching strategies.

## Agent Protocol

### Trigger
Exact user phrases: "Svelte pattern", "Svelte form", "Svelte animation", "Svelte transition", "Svelte action", "Svelte store pattern", "Svelte data fetching".

### Input Context
Before activating, verify:
- Svelte 5 project (package.json with svelte ^5).
- Whether project uses SvelteKit (load functions) or standalone (onMount).
- If superforms is available for Zod validation.

### Output Artifact
No file output. Produces code patterns for forms, animations, actions, and data fetching.

### Response Format
Code: show .svelte component patterns with script + template.

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Forms use bind:value for two-way input binding.
- [ ] Progressive enhancement via use:enhance with SvelteKit.
- [ ] Validation uses superforms + Zod or HTML validation.
- [ ] Transitions use transition: directive (fade, slide, scale, fly).
- [ ] List animations use animate:flip with keyed each blocks.
- [ ] Actions (use:) encapsulate reusable DOM behavior.
- [ ] Data fetching uses onMount + $state for CSR, SvelteKit load for SSR.

### Max Response Length
Code: 15 lines per example.

## Component Architecture / Decision Trees

### Architecture Options

| Approach | Trade-off | When to Use |
|----------|-----------|-------------|
| bind:value + manual submit handler | Full control, no magic | Simple forms, custom validation |
| use:enhance (SvelteKit) | Progressive enhancement, no JS fallback | SvelteKit form actions |
| Superforms + Zod | Auto validation, field errors, loading states | Complex forms with validation |
| SvelteKit load functions | SSR data fetching, streaming | Full-stack apps |
| onMount + fetch | CSR data fetching | Standalone Svelte (non-SvelteKit) |
| Transition directives | CSS-driven animation | Enter/leave animations |
| use:action | Reusable DOM behavior | Global event listeners, tooltips, portals |

### Decision Tree: Form Handling

```
Is the project using SvelteKit?
  ├── No -> bind:value + manual submit + fetch
  └── Yes -> Is the form complex (many fields, validation)?
       ├── Yes -> Superforms + Zod + use:enhance
       └── No -> use:enhance with basic validation
```

### Decision Tree: Data Fetching

```
Is SvelteKit used?
  ├── Yes -> Use load() in +page.ts or +page.server.ts
  │    ├── Public data -> universal load (+page.ts)
  │    └── Private/DB data -> server load (+page.server.ts)
  └── No -> onMount() + $state() + fetch()
```

## Common Pitfalls

### Pitfall 1: Missing Keyed Each Blocks
```svelte
<!-- Wrong — no key, transitions won't animate correctly -->
{#each items as item}
  <div transition:slide>{item.text}</div>
{/each}

<!-- Correct — keyed each for proper animate:flip -->
{#each items as item (item.id)}
  <div transition:slide animate:flip>{item.text}</div>
{/each}
```

### Pitfall 2: Side Effects in Action Update
Action update functions should not have side effects that trigger re-renders. Keep updates focused on DOM manipulation only.

### Pitfall 3: Using onMount for Data in SvelteKit
```svelte
<script>
  import { onMount } from 'svelte'
  // Wrong in SvelteKit — use load() instead
  onMount(async () => {
    const res = await fetch('/api/data')
    data = await res.json()
  })
</script>
```
In SvelteKit, use `load()` functions for SSR data fetching. `onMount` is for standalone Svelte only.

### Pitfall 4: Overusing Transitions
Every transition creates CSS animation classes. Too many concurrent transitions can cause jank. Use `transition:slide` with `duration: 200` for lists; reserve `fly` and `scale` for hero elements.

### Pitfall 5: Forgetting use:enhance Returns
`use:enhance` can return a cleanup function. Use it for canceling in-flight requests when the form resubmits.

## Compared With

### Svelte Forms vs React Hook Form
Svelte's `bind:value` is simpler than React Hook Form's `register()`. SvelteKit's `use:enhance` provides progressive enhancement out of the box, while React needs to handle both client and server validation separately.

### Svelte Animations vs Framer Motion
Svelte's transition/animate directives are built-in and CSS-driven, producing zero JS overhead for animations. Framer Motion (React) is JS-driven with more complex orchestration but has a larger bundle.

### Svelte Actions vs Vue Directives
Svelte actions (`use:action`) are similar to Vue's custom directives but simpler — no config object, just a function returning `{ update, destroy }`. Both encapsulate DOM behavior.

## Performance Considerations

### CSS-Driven Animations
Svelte transitions compile to CSS animations. Use `css` option in custom transitions for GPU-accelerated properties (transform, opacity). Avoid animating layout-triggering properties (width, height, margin).

### Transition Overhead
- `transition:fade` — lightweight (opacity only)
- `transition:slide` — moderate (transform + overflow)
- `transition:fly` — moderate (transform + opacity)
- Custom transitions — cost depends on implementation
- `animate:flip` — heavier (measures positions, uses transform)

### Data Fetching
SvelteKit load functions run on the server for SSR, meaning no waterfall fetch on the client. Use `+page.server.ts` for DB queries and `+page.ts` for public API calls. Parallelize with `Promise.all` in load functions.

## Ecosystem & Tooling

### Core Packages
| Package | Purpose |
|---------|---------|
| svelte | Framework core |
| @sveltejs/kit | Meta-framework |
| svelte-forms-lib | Lightweight form library |
| superforms | Zod-based form validation with SvelteKit |
| svelte-motion | Spring animations for Svelte |
| @sveltejs/adapter-* | Deployment adapters |

### Tools
- **Svelte VS Code Extension** — Syntax highlighting, IntelliSense.
- **svelte-check** — CLI type checking.
- **svelte-migrate** — Svelte 4 to 5 migration.
- **svelte-scoped-any** — Scoped CSS with `:global()`.

### Form Libraries
| Library | Features |
|---------|----------|
| Superforms | Zod integration, use:enhance, auto field errors |
| svelte-forms-lib | Lightweight, no dependencies |
| Felte | Yup/Zod support, progressive enhancement |

### Animation Libraries
| Library | Purpose |
|---------|---------|
| svelte/transition | Built-in: fade, slide, scale, fly, blur |
| svelte/animate | Built-in: flip |
| svelte/motion | Built-in: tweened, spring |
| svelte-motion | Framer Motion API port |

## Workflow

### Step 1: Forms (bind:value + Validation)
```svelte
<script>
  let email = $state('')
  let password = $state('')
  let errors = $state<Record<string, string>>({})

  async function handleSubmit(e: Event) {
    e.preventDefault()
    const result = schema.safeParse({ email, password })
    if (!result.success) { errors = result.error.flatten().fieldErrors; return }
    await fetch('/api/login', { method: 'POST', body: JSON.stringify(result.data) })
  }
</script>

<form onsubmit={handleSubmit}>
  <input type="email" bind:value={email} aria-invalid={!!errors.email} />
  {#if errors.email}<span>{errors.email}</span>{/if}
  <input type="password" bind:value={password} />
  {#if errors.password}<span>{errors.password}</span>{/if}
  <button type="submit">Login</button>
</form>
```
For SvelteKit, use `use:enhance` for progressive enhancement and `superForms` with Zod.

### Step 2: Animations (transition: directive)
```svelte
<script>
  import { fade, slide, scale, fly } from 'svelte/transition'
  let visible = $state(false)
</script>

<button onclick={() => visible = !visible}>Toggle</button>
{#if visible}
  <div transition:fade={{ duration: 300 }}>Fade</div>
  <div transition:slide>Slide</div>
  <div transition:fly={{ x: 200 }}>Fly in</div>
{/if}
<div in:fly={{ y: -50 }} out:slide>Content</div>
```

### Step 3: List Animations (animate:flip)
```svelte
<script>
  import { flip } from 'svelte/animate'
  import { slide } from 'svelte/transition'
  let items = $state([{ id: 1, text: 'A' }, { id: 2, text: 'B' }])

  function shuffle() { items = [...items].reverse() }
</script>

<button onclick={shuffle}>Shuffle</button>
{#each items as item (item.id)}
  <div transition:slide animate:flip={{ duration: 300 }}>
    {item.text}
  </div>
{/each}
```

### Step 4: Actions (use:)
```svelte
<script>
  function clickOutside(node: HTMLElement, cb: () => void) {
    function handler(e: MouseEvent) {
      if (!node.contains(e.target as Node)) cb()
    }
    document.addEventListener('click', handler)
    return {
      destroy() { document.removeEventListener('click', handler) },
      update(newCb: () => void) { cb = newCb },
    }
  }

  let open = $state(true)
</script>

<div use:clickOutside={() => open = false}>
  Menu content — clicking outside closes
</div>
```

### Step 5: Data Fetching (onMount + $state)
```svelte
<script>
  import { onMount } from 'svelte'

  let users = $state<User[]>([])
  let loading = $state(true)

  onMount(async () => {
    const res = await fetch('/api/users')
    users = await res.json()
    loading = false
  })
</script>

{#if loading}
  <p>Loading...</p>
{:else}
  {#each users as user}
    <p>{user.name}</p>
  {/each}
{/if}
```
For SvelteKit, use `load` function in `+page.ts` / `+page.server.ts` for SSR data.

### Step 6: SvelteKit Form Actions
```svelte
<script>
  import { enhance } from '$app/forms'
  let { form } = $props()
</script>

<form method="POST" use:enhance>
  <input name="email" />
  <button>Submit</button>
</form>
```
Form actions in `+page.server.ts` handle validation, errors, and redirects on the server.

### Step 7: Motion Stores (tweened, spring)
```svelte
<script>
  import { tweened } from 'svelte/motion'
  import { cubicOut } from 'svelte/easing'
  const progress = tweened(0, { duration: 400, easing: cubicOut })

  function start() { progress.set(100) }
</script>

<progress value={$progress}></progress>
<button onclick={start}>Start</button>
```

## Rules
- bind:value for form inputs — explicit onChange handlers only when needed.
- use:enhance for progressive form enhancement in SvelteKit.
- transition: directive for enter/leave, animate:flip for list reorder.
- Actions (use:) for reusable DOM behavior — return update/destroy.
- onMount + $state for CSR fetching, SvelteKit load for SSR.
- Key each blocks with (item.id) for proper list transitions.
- Use superforms for complex forms with Zod validation.
- Prefer CSS-driven transitions over JS animations for performance.
- Always return cleanup from action destroy and update functions.
- Motion stores (tweened, spring) for smoothly animated values.

## References
- references/svelte-component-patterns.md — Svelte Component Patterns
- references/svelte-forms.md — Svelte Forms — bind:value, Form Actions, Validation, File Uploads
- references/svelte-routing.md — Svelte Routing Patterns
- references/svelte-state.md — Svelte State Management Patterns
- references/svelte-stores-state.md — Svelte Stores and State
- references/svelte-transitions.md — Svelte Transitions — Transition, Animation, InView Directives, Custom Transitions
- references/svelte-stores-state-management.md — Svelte Stores and State Management
- references/svelte-ssr-hydration.md — Svelte SSR and Hydration

## Handoff
No artifact produced.
Next skill: frontend-sveltekit if using SvelteKit, or frontend-universal-testing.
Carry forward: form binding patterns, transition/animate conventions, action patterns.
