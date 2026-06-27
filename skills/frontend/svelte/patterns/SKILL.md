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

### Decision Tree: Animation Strategy

```
What kind of animation?
  ├── Enter/leave single element -> transition: directive
  ├── List reorder -> animate:flip + keyed each
  ├── Shared element between routes -> SvelteKit crossfade
  └── Continuous animation -> svelte/motion (tweened, spring)
```

## Component Design Patterns

### Form with Superforms + Zod

```svelte
<script>
  import { superForm } from 'sveltekit-superforms/client'
  import { schema } from './schema'

  const { form, errors, enhance, submitting } = superForm(data.form, { schema })
</script>

<form method="POST" use:enhance>
  <input name="email" type="email" bind:value={form.email} aria-invalid={!!errors.email} />
  {#if errors.email}<span>{errors.email}</span>{/if}
  <input name="password" type="password" bind:value={form.password} />
  {#if errors.password}<span>{errors.password}</span>{/if}
  <button type="submit" disabled={submitting}>
    {submitting ? 'Submitting...' : 'Login'}
  </button>
</form>
```

### Custom Action (use:)

```svelte
<script>
  function tooltip(node: HTMLElement, text: string) {
    const tip = document.createElement('div')
    tip.className = 'tooltip'
    tip.textContent = text
    tip.style.cssText = 'position:absolute;background:#333;color:white;padding:4px 8px;border-radius:4px;'

    function show() {
      const rect = node.getBoundingClientRect()
      tip.style.top = `${rect.top - tip.offsetHeight - 4}px`
      tip.style.left = `${rect.left + rect.width / 2 - tip.offsetWidth / 2}px`
      document.body.appendChild(tip)
    }

    function hide() { tip.remove() }

    node.addEventListener('mouseenter', show)
    node.addEventListener('mouseleave', hide)

    return {
      destroy() {
        node.removeEventListener('mouseenter', show)
        node.removeEventListener('mouseleave', hide)
        hide()
      },
      update(newText: string) { tip.textContent = newText },
    }
  }

  let message = $state('Hello')
</script>

<button use:tooltip={message}>Hover me</button>
```

### Nested Transition Animation

```svelte
<script>
  import { fly, slide } from 'svelte/transition'
  import { cubicOut } from 'svelte/easing'

  let items = $state([
    { id: 1, text: 'Item 1' },
    { id: 2, text: 'Item 2' },
    { id: 3, text: 'Item 3' },
  ])

  function removeItem(id: number) {
    items = items.filter(i => i.id !== id)
  }

  function addItem() {
    items = [...items, { id: Date.now(), text: `Item ${items.length + 1}` }]
  }
</script>

<button onclick={addItem}>Add</button>
{#each items as item (item.id)}
  <div
    transition:fly={{ y: -20, duration: 200, easing: cubicOut }}
    animate:flip={{ duration: 300 }}
  >
    <span>{item.text}</span>
    <button onclick={() => removeItem(item.id)}>x</button>
  </div>
{/each}
```

## State Management Patterns

### Local Form State

```svelte
<script>
  let email = $state('')
  let password = $state('')
  let errors = $state<Record<string, string>>({})
</script>
```

### Derived Values

```svelte
<script>
  let cart = $state<CartItem[]>([])
  let total = $derived(cart.reduce((sum, i) => sum + i.price * i.quantity, 0))
  let itemCount = $derived(cart.reduce((sum, i) => sum + i.quantity, 0))
</script>
```

### Reactive Side Effects

```svelte
<script>
  let theme = $state('light')

  $effect(() => {
    localStorage.setItem('theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
  })
</script>
```

### Cross-Component State via Context

```svelte
<script>
  // provider component
  import { setContext } from 'svelte'
  let user = $state<User | null>(null)
  setContext('user', {
    get user() { return user },
    login: (u: User) => user = u,
    logout: () => user = null,
  })
</script>

<script>
  // consumer component
  import { getContext } from 'svelte'
  let ctx = getContext<{ user: User | null; login: (u: User) => void; logout: () => void }>('user')
</script>
```

## Performance Optimization

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

### Keyed Each Blocks
Always use keyed each blocks `{#each items as item (item.id)}` for efficient DOM updates and correct animation behavior.

## Build & Bundle Considerations

### SvelteKit Build
```bash
npm run build    # Adapter-specific build
npm run preview  # Preview production build
```

### Standalone Svelte Build
```bash
npm run build    # Output to dist/
```

### CSS Extraction
Svelte scopes CSS automatically per component. Global styles go in `app.html` or imported via Vite.

## Testing Strategies

### Component Tests

```tsx
import { render, screen, fireEvent } from '@testing-library/svelte'
import { describe, it, expect } from 'vitest'
import Counter from './Counter.svelte'

it('increments on click', async () => {
  render(Counter, { props: { initial: 0 } })
  await fireEvent.click(screen.getByRole('button'))
  expect(screen.getByText('1')).toBeDefined()
})
```

### SvelteKit Form Action Tests

```tsx
import { describe, it, expect } from 'vitest'
import { actions } from './+page.server'

it('validates form data', async () => {
  const formData = new FormData()
  formData.set('email', 'invalid')
  const result = await actions.default({ request: new Request('http://localhost', { method: 'POST', body: formData }) })
  expect(result.status).toBe(400)
})
```

## Migration Patterns

### Svelte 4 to Svelte 5

```svelte
// Svelte 4: stores
import { writable, derived } from 'svelte/store'
const count = writable(0)
const doubled = derived(count, $c => $c * 2)
count.update(n => n + 1)

// Svelte 5: runes
let count = $state(0)
let doubled = $derived(count * 2)
count++
```

### React to Svelte 5

```tsx
// React
const [count, setCount] = useState(0)
const doubled = useMemo(() => count * 2, [count])
useEffect(() => { document.title = String(count) }, [count])

// Svelte 5
let count = $state(0)
let doubled = $derived(count * 2)
$effect(() => { document.title = String(count) })
```

## Anti-Patterns

### Missing Keyed Each

```svelte
<!-- Anti-pattern: no key -->
{#each items as item}
  <div transition:slide>{item.text}</div>
{/each}

<!-- Correct: keyed -->
{#each items as item (item.id)}
  <div transition:slide animate:flip>{item.text}</div>
{/each}
```

### onMount for Data in SvelteKit

In SvelteKit, use `load()` functions instead of onMount for initial data. onMount is for standalone Svelte only.

### Side Effects in Action Update

Action update functions should not trigger re-renders. Keep them focused on DOM manipulation.

### Overusing Transitions

Too many concurrent transitions cause jank. Use `fade`/`slide` with short durations for lists; reserve `fly`/`scale` for hero elements.

## Common Pitfalls

1. **Missing keyed each blocks** — transitions break without keys
2. **Side effects in action update** — keep DOM focused
3. **onMount for data in SvelteKit** — use load() instead
4. **Overusing transitions** — short durations for lists
5. **Forgetting use:enhance returns** — cancel in-flight requests

## Compared With

### Svelte Forms vs React Hook Form
Svelte's bind:value is simpler. SvelteKit's use:enhance provides progressive enhancement out of the box.

### Svelte Animations vs Framer Motion
Svelte transitions are CSS-driven with zero JS overhead. Framer Motion is JS-driven with larger bundle.

### Svelte Actions vs Vue Directives
Both encapsulate DOM behavior. Svelte actions are simpler (function returning update/destroy).

## Ecosystem & Tooling

| Package | Purpose |
|---------|---------|
| svelte | Framework core |
| @sveltejs/kit | Meta-framework |
| superforms | Zod form validation |
| svelte-motion | Spring animations |
| Felte | Form library |

## Workflow

### Step 1: Forms (bind:value + Validation)
```svelte
<form onsubmit={handleSubmit}>
  <input type="email" bind:value={email} aria-invalid={!!errors.email} />
  {#if errors.email}<span>{errors.email}</span>{/if}
  <input type="password" bind:value={password} />
  <button type="submit">Login</button>
</form>
```

### Step 2: Animations (transition:)
```svelte
{#if visible}
  <div transition:fade={{ duration: 300 }}>Fade</div>
  <div transition:slide>Slide</div>
  <div transition:fly={{ x: 200 }}>Fly in</div>
{/if}
```

### Step 3: List Animations (animate:flip)
```svelte
{#each items as item (item.id)}
  <div transition:slide animate:flip={{ duration: 300 }}>
    {item.text}
  </div>
{/each}
```

### Step 4: Actions (use:)
```svelte
<div use:clickOutside={() => open = false}>
  Menu content
</div>
```

### Step 5: Data Fetching (onMount + $state)
```svelte
onMount(async () => {
  const res = await fetch('/api/users')
  users = await res.json()
})
```

### Step 6: SvelteKit Form Actions
```svelte
<form method="POST" use:enhance>
  <input name="email" />
  <button>Submit</button>
</form>
```

### Step 7: Motion Stores
```svelte
<script>
  import { tweened } from 'svelte/motion'
  const progress = tweened(0, { duration: 400 })
</script>
<progress value={$progress}></progress>
```

## Rules
- bind:value for form inputs.
- use:enhance for progressive enhancement in SvelteKit.
- transition: for enter/leave, animate:flip for list reorder.
- Actions (use:) for reusable DOM behavior.
- onMount + $state for CSR, SvelteKit load for SSR.
- Key each blocks with stable keys for transitions.
- Prefer CSS-driven transitions over JS animations.

## References
- references/svelte-component-patterns.md
- references/svelte-forms.md
- references/svelte-routing.md
- references/svelte-state.md
- references/svelte-stores-state.md
- references/svelte-transitions.md
- references/svelte-ssr-hydration.md

## Handoff
No artifact produced.
Next skill: frontend-sveltekit if using SvelteKit.
Carry forward: form binding patterns, transition/animate conventions, action patterns.
## Implementation Patterns

### Factory Pattern for Module Creation
`
function createModule<T>(config: ModuleConfig): T {
  const dependencies = initializeDependencies(config);
  const module = new Module(dependencies);
  module.hooks.onInit();
  return module as T;
}
`

### Builder Pattern for Complex Configuration
`
class ConfigBuilder {
  private config: AppConfig = new AppConfig();
  withDatabase(url: string): ConfigBuilder { ... }
  withCache(ttl: number): ConfigBuilder { ... }
  withLogging(level: string): ConfigBuilder { ... }
  build(): AppConfig { return this.config; }
}
`

## Production Considerations

### Deployment Checklist
- [ ] Production build with optimizations enabled
- [ ] Environment variables configured per environment
- [ ] Health check endpoint responds correctly
- [ ] Error tracking and monitoring integrated
- [ ] Logging level configured (not debug in production)
- [ ] Resource limits configured
- [ ] Database migrations applied
- [ ] Static assets built and served from CDN or cache
- [ ] Feature flags toggled appropriately
- [ ] Rollback plan documented and tested

### Monitoring and Alerting
| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| Error rate | > 1% | Critical | Rollback or fix |
| p95 latency | > 500ms | Warning | Profile and optimize |
| Uptime | < 99.9% | Critical | Investigate infrastructure |
| Memory usage | > 80% | Warning | Check for leaks |
| CPU usage | > 80% | Warning | Scale up or optimize |

## Architecture Decision Trees

### Reactive State Decision Tree
```
Is the state used in a single component?
  ├── No  → Should it persist across page loads?
  │    ├── Yes → localStorage store or URL search params
  │    └── No  → Svelte writable store (shared module-level store)
  └── Yes → Is it derived from props or other state?
       ├── Yes → $derived expression
       └── No  → $state with local component scope
            Does it need async handling?
            ├── Yes → $state with promise resolution or $effect
            └── No  → Synchronous state only
```

### Component Composition Decision Tree
```
Does the child need to project content?
  ├── No  → Standard props-based component
  └── Yes → Is the projected content static?
       ├── Yes → <slot> with fallback content
       └── No  → Named slots + slot props for dynamic content
            Need to pass children through multiple levels?
            ├── Yes → Svelte snippets ({#snippet}) or stores
            └── No  → Direct slot usage with prop drilling
```

## Security Considerations

- **@html template escaping**: `{@html userContent}` bypasses Svelte's auto-escaping. Always sanitize HTML through DOMPurify. Never use `{@html}` with unsanitized user input. For rich text rendering, use a dedicated sanitized component.
- **Store data exposure**: Svelte stores at module level are singletons shared across all users on the server (SSR). Never store per-user sensitive data in module-level stores - use context API or server-only modules.
- **Action security**: Custom `use:action` functions have access to the element. Validate any data passed to action parameters. Actions in SSR must handle missing `window`/`document`. Clean up event listeners in destroy callback.
- **Form action validation**: SvelteKit form actions require both client and server validation. Never trust `FormData` values - validate server-side. Use `zod` or `superforms` for schema validation. Sanitize output before rendering in `{@html}`.
