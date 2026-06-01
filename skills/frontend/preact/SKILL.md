---
name: preact
description: >
  Use this skill when the user says 'Preact', 'Preact setup', 'Preact signals', 'Preact hooks', 'Preact vs React', 'Preact project', 'Preact SSR', or when creating a Preact application. This skill enforces: Preact as React drop-in, signals for state management, compat layer usage, tiny bundle patterns, hooks compliance. Requires package.json with preact dependency. Do NOT use for: React-specific patterns (createContext, ReactDOM), Vue/Angular/Svelte, or non-Preact projects.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, preact, phase-1]
---

# Preact

## Purpose
Build ultra-lightweight Preact applications using signals for reactive state, compat layer for React interop, and hooks for component logic — all under 3kB.

## Agent Protocol

### Trigger
Exact user phrases: "Preact setup", "Preact signal", "Preact hooks", "Preact project", "Preact vs React", "Preact SSR", "preact app".

### Input Context
Before activating, verify:
- package.json has preact dependency (or preact/compat).
- Whether the project uses Vite, WMR, or manual bundler.
- If React interop is needed (preact/compat).

### Output Artifact
No file output. Produces code snippets, config examples, and structural guidance as text.

### Response Format
Config:
```
// vite.config.ts
import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
export default defineConfig({ plugins: [preact()] })
```

Code: show component, signal, and hook definitions inline. No import statements.

No preamble. No postamble. No explanations. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Entry point uses `render()` from preact (not ReactDOM).
- [ ] Stateful logic uses signals (@preact/signals) for local/global state.
- [ ] Hooks follow Preact compatibility (useEffect, useState, useMemo all work).
- [ ] JSX uses `h` pragma or compat layer.
- [ ] Bundle size is monitored — no heavy React-for-Preact swaps.
- [ ] SSR uses preact-render-to-string.
- [ ] Class components avoided (functional + hooks preferred).

### Max Response Length
~4096 tokens.

## Architecture Decision Trees

### State Management Decision
```
What type of state?
  Local UI state (toggle, input) -> useSignal() from @preact/signals
  Shared across few siblings -> Props lifting + signals
  Global application state -> Signals in a shared module file
  Server/async state -> useSWR or TanStack Query (via compat)
  Complex form state -> useReducer from preact/hooks

React library using state? -> Use preact/compat aliasing + their API
```

### React Compatibility Decision
```
Does the project use React ecosystem libraries?
  No -> Use Preact natively (smallest bundle)
  Yes -> What libraries?
    React Router -> preact/compat aliasing works
    TanStack Query -> preact/compat aliasing works
    Radix UI -> preact/compat may have issues — test first
    Framer Motion -> Known compat issues — consider alternatives
```

## Workflow

### Step 1: Setup with Vite
```tsx
// vite.config.ts
import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'

export default defineConfig({
  plugins: [preact()]
})
```

```tsx
// src/main.tsx
import { render } from 'preact'
import { App } from './app'

render(<App />, document.getElementById('app')!)
```

### Step 2: Signals for State
```tsx
import { signal, computed } from '@preact/signals'

const count = signal(0)
const doubled = computed(() => count.value * 2)

function Counter() {
  return (
    <div>
      <p>Count: {count}</p>
      <p>Doubled: {doubled}</p>
      <button onClick={() => count.value++}>+1</button>
    </div>
  )
}
```

### Step 3: Signal Patterns
```tsx
// Global signals in module
// store/cart.ts
import { signal, computed } from '@preact/signals'

export const cartItems = signal<CartItem[]>([])
export const cartCount = computed(() => cartItems.value.reduce((sum, i) => sum + i.qty, 0))
export const cartTotal = computed(() => cartItems.value.reduce((sum, i) => sum + i.price * i.qty, 0))

export function addItem(item: CartItem) {
  cartItems.value = [...cartItems.value, item]
}

// Signals with side effects
import { effect } from '@preact/signals'
effect(() => {
  console.log('Cart updated:', cartItems.value)
  localStorage.setItem('cart', JSON.stringify(cartItems.value))
})
```

### Step 4: Hooks (React-compatible)
```tsx
import { useState, useEffect, useMemo } from 'preact/hooks'

function Timer() {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [])

  return <div>{seconds}s elapsed</div>
}
```

### Step 5: Preact Compat (React interop)
```tsx
// Replace React imports with preact/compat
import React from 'preact/compat'
import ReactDOM from 'preact/compat'
// Or in vite.config:
// resolve: { alias: { react: 'preact/compat', 'react-dom': 'preact/compat' } }
```

### Step 6: SSR
```tsx
import { render } from 'preact-render-to-string'
import { App } from './app'

const html = render(<App />)
// Inject into HTML template and serve
```

### Step 7: Code Splitting
```tsx
import { lazy, Suspense } from 'preact/compat'

const Dashboard = lazy(() => import('./dashboard'))
const Settings = lazy(() => import('./settings'))

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Dashboard />
    </Suspense>
  )
}
```

## Common Pitfalls

1. **Using ReactDOM APIs**: Preact uses `render()` from `preact`, not `ReactDOM.createRoot()`.
2. **Missing compat alias**: Without preact/compat aliasing, React-ecosystem libraries import React directly.
3. **Signals in JSX without values**: `{count}` in JSX works (automatic `.value` access), but in hooks/effects use `count.value`.
4. **Class components**: Preact supports them via compat, but functional + hooks + signals is preferred.
5. **Over-using compat**: Using preact/compat loses the bundle-size benefit of Preact. Use native Preact APIs when possible.
6. **Switching from useState to signals mid-project**: Mixed state patterns cause confusion. Pick one per feature.
7. **Not tree-shaking compat**: compat adds ~2KB — only add it when needed.
8. **Forgetting SSR hydration**: preact-render-to-string on server, hydrate on client with `hydrate()`.

## Best Practices

- Use `render()` from preact, never `ReactDOM.createRoot()`.
- Prefer signals (`@preact/signals`) over useState for shared state.
- Aliasing react to preact/compat in bundler config is required for React-ecosystem libs.
- Functional components only — no class components.
- Keep component files under 100 lines.
- Use `preact/hooks` for lifecycle effects.
- Avoid `createContext` when signals provide simpler reactivity.
- Bundle target: keep preact-specific code under 3kB total.

## Compared With

| Aspect | Preact | React | SolidJS |
|--------|--------|-------|---------|
| Bundle size | ~3KB | ~45KB | ~8KB |
| Signals | Built-in (@preact/signals) | External | Built-in (createSignal) |
| VDOM | Yes, lightweight | Full | No (compiled) |
| React compat | preact/compat | Native | N/A |
| Hooks | Compatible subset | Full | Different API |
| SSR | preact-render-to-string | react-dom/server | solid-ssr |

### Preact vs React
Preact is a React-compatible library at 1/15th the size. It supports most React APIs (hooks, JSX, Context) but lacks React 18's concurrent features and some edge cases. Use Preact when bundle size is critical and advanced React features are not needed.

### Preact vs SolidJS
Both are lightweight alternatives to React. SolidJS avoids VDOM entirely for fine-grained updates; Preact keeps a lightweight VDOM for React compatibility. Preact is the drop-in replacement; SolidJS requires rewriting components.

## Performance

### Bundle Size Advantage
- Preact core: ~3KB gzipped (vs React ~45KB).
- Compat layer: ~2KB additional.
- Signals: ~1KB.
- Total Preact + signals: ~4KB — 10x smaller than React alone.

### Rendering Performance
- Preact 10+ uses a modern diff algorithm similar to React but lighter.
- Signals provide fine-grained updates — only components reading the signal re-render.
- Compat mode adds overhead (~2KB, ~10% performance hit).
- Preact/compat aliases VDOM operations through an extra abstraction layer.

### Optimization Techniques
- Use signals instead of useState for frequently updated state (avoids component re-render).
- Batch signal updates within the same microtask.
- Use `useCallback` and `useMemo` sparingly — Preact's diff is cheaper than React's.
- `preact/compat` has `PureComponent` and `React.memo` support.
- Lazy-load route components with `lazy()` + `Suspense` (via compat).

## Testing Strategies

### Unit Testing with Vitest
```typescript
import { render, screen, fireEvent } from '@testing-library/preact'
import { Counter } from './Counter'

test('renders counter and increments', () => {
  render(<Counter />)
  expect(screen.getByText('Count: 0')).toBeTruthy()
  fireEvent.click(screen.getByRole('button'))
  expect(screen.getByText('Count: 1')).toBeTruthy()
})
```

### Signal Testing
```typescript
import { signal, computed } from '@preact/signals'

test('signal computed values', () => {
  const count = signal(0)
  const doubled = computed(() => count.value * 2)
  expect(doubled.value).toBe(0)
  count.value = 5
  expect(doubled.value).toBe(10)
})
```

### Key Testing Practices
- Use `@testing-library/preact` for component tests.
- Test signals independently of components (pure logic).
- Use `act()` from preact/test-utils for async rendering.
- Test compat mode by importing from `preact/compat` in tests.
- SSR test: render to string and assert HTML output.

## Migration Patterns

### From React to Preact
| React | Preact |
|-------|--------|
| `import React from 'react'` | `import { h } from 'preact'` or compat |
| `ReactDOM.createRoot().render()` | `render()` from preact |
| `useState` | `useState` from preact/hooks or signals |
| `createContext` | `createContext` from preact or signals |
| `React.lazy` | `lazy()` from preact/compat |
| `React.memo` | `memo()` from preact/compat |

**Migration steps**: 1) Install preact + @preact/preset-vite, 2) Add alias in vite.config, 3) Replace react-dom imports with preact, 4) Add preact/compat for remaining React libs, 5) Verify bundle size reduction.

### From Vue/Options API to Preact
| Vue Concept | Preact Equivalent |
|-------------|-------------------|
| `ref()` | `signal()` |
| `computed()` | `computed()` from @preact/signals |
| `watch()` | `effect()` from @preact/signals |
| `v-if` | `{condition && <Component/>}` |
| `v-for` | `{items.map(i => <Item />)}` |
| Props | Component props argument |

## Build and Bundle Considerations

- Vite plugin: `@preact/preset-vite` auto-configures JSX pragma.
- Aliasing: `resolve.alias = { react: 'preact/compat', 'react-dom': 'preact/compat' }`.
- WMR: Preact's own dev server (alternative to Vite).
- Production builds: Vite's default build tree-shakes unused compat features.
- Bundle analysis: `vite-plugin-bundle-analyzer` to verify preact/compat usage.
- SSR: Use `preact-render-to-string` for Node.js rendering, `prerender` for static sites.
- ES modules: Preact ships ESM and UMD bundles.

## Tooling

1. Preact DevTools browser extension — inspect component tree, hooks, signals.
2. `@preact/preset-vite` — official Vite preset with HMR and alias config.
3. `preact-render-to-string` — SSR rendering for Preact.
4. `@testing-library/preact` — component testing utilities.
5. `preact-ssr-prepass` — data prefetching for SSR (Apollo, TanStack Query).
6. `preact-iso` — routing and lazy loading for Preact SPA without compat.
7. `preact-hooks-testing-library` — hook testing utilities.
8. Size comparison: `npx preact size` compares Preact vs React bundle size.

## Ecosystem

### Preact-Compatible React Libraries
| Library | Compat Status |
|---------|---------------|
| React Router | Full compat |
| TanStack Query | Full compat |
| Zustand | Full compat |
| React Hook Form | Mostly works |
| Radix UI | Some issues |
| Framer Motion | Known issues |

### Preact-Native Libraries
- **preact-iso** — Routing and lazy loading.
- **preact-router** — Simple routing (legacy).
- **htm** — Hyperscript Tagged Markup (JSX alternative).

## Rules
- Use `render()` from preact, never `ReactDOM.createRoot()`.
- Prefer signals (`@preact/signals`) over useState for shared state.
- Aliasing react to preact/compat in bundler config is required for React-ecosystem libs.
- Functional components only — no class components.
- Keep component files under 100 lines.
- Use `preact/hooks` for lifecycle effects.
- Avoid `createContext` when signals provide simpler reactivity.
- Bundle target: keep preact-specific code under 3kB total.

## References
  - references/preact-advanced.md — Preact Advanced Topics
  - references/preact-architecture.md — Preact Architecture Patterns
  - references/preact-deployment.md — Preact Deployment
  - references/preact-fundamentals.md — Preact Fundamentals
  - references/preact-setup.md — Preact Setup Guide
  - references/preact-vs-react.md — Preact vs React: Differences & Migration

## Handoff
No artifact produced.
Next skill: preact-ssr (if SSR needed) or frontend-testing.
Carry forward: signal-based reactivity, hooks conventions, tiny-bundle mindset.
