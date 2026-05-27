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

### Step 3: Hooks (React-compatible)
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

### Step 4: Preact Compat (React interop)
```tsx
// Replace React imports with preact/compat
import React from 'preact/compat'
import ReactDOM from 'preact/compat'
// Or in vite.config:
// resolve: { alias: { react: 'preact/compat', 'react-dom': 'preact/compat' } }
```

### Step 5: SSR
```tsx
import { render } from 'preact-render-to-string'
import { App } from './app'

const html = render(<App />)
// Inject into HTML template and serve
```

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
