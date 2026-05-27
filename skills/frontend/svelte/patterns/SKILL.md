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
<!-- In/out separate -->
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

## Rules
- bind:value for form inputs — explicit onChange handlers only when needed.
- use:enhance for progressive form enhancement in SvelteKit.
- transition: directive for enter/leave, animate:flip for list reorder.
- Actions (use:) for reusable DOM behavior — return update/destroy.
- onMount + $state for CSR fetching, SvelteKit load for SSR.
- Key each blocks with (item.id) for proper list transitions.

## References
  - references/svelte-component-patterns.md — Svelte Component Patterns
  - references/svelte-forms.md — Svelte Forms — bind:value, Form Actions, Validation, File Uploads
  - references/svelte-routing.md — Svelte Routing Patterns
  - references/svelte-state.md — Svelte State Management Patterns
  - references/svelte-stores-state.md — Svelte Stores and State
  - references/svelte-transitions.md — Svelte Transitions — Transition, Animation, InView Directives, Custom Transitions
## Handoff
No artifact produced.
Next skill: frontend-sveltekit if using SvelteKit, or frontend-universal-testing.
Carry forward: form binding patterns, transition/animate conventions, action patterns.
