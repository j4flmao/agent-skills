---
name: frontend-solidjs-architecture
description: >
  Use this skill when the user says 'SolidJS', 'SolidJS architecture', 'Solid signal', 'Solid component', 'Solid reactivity', 'SolidJS app', 'Solid router', 'SolidJS vs React', 'SolidJS fine-grained'. This skill enforces: fine-grained reactivity via Signals/Memos/Effects, compiled JSX with no virtual DOM, declarative control flow components (Show/For/Switch), createStore for deep reactivity, and @solidjs/router for routing. Requires SolidJS project (package.json with solid-js). Do NOT use for: React, Vue, or Svelte projects.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, solidjs, phase-7]
---

# SolidJS Architecture

## Purpose
Build applications with SolidJS fine-grained reactivity — no virtual DOM, compiled JSX, signals-based state management, and declarative control flow.

## Agent Protocol

### Trigger
Exact user phrases: "SolidJS", "SolidJS architecture", "Solid signal", "Solid component", "Solid reactivity", "SolidJS app", "Solid router", "SolidJS vs React", "SolidJS fine-grained".

### Input Context
Before activating, verify:
- package.json has solid-js dependency.
- Whether the project uses Vite with the Solid plugin.
- Whether @solidjs/router is installed for routing.

### Output Artifact
No file output. Produces component patterns, signal/store usage, control flow examples, and routing setup as text.

### Response Format
Code: show signal/component definitions. No imports. Control flow with Show/For/Switch.

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Components use signals (createSignal) for local state.
- [ ] Derived values use createMemo, not createEffect.
- [ ] Deep state uses createStore with path syntax for updates.
- [ ] Control flow uses <Show>, <For>, <Switch>, <Index> components.
- [ ] @solidjs/router configured with lazy loading for code splitting.
- [ ] No use of hooks rules — components run once.
- [ ] JSX compiles to real DOM expressions, not vdom.

### Max Response Length
Code: 15 lines per example. Unlimited patterns.

## Workflow

### Step 1: Reactivity Model
```tsx
const [count, setCount] = createSignal(0)
const doubled = createMemo(() => count() * 2)      // derived — use createMemo
createEffect(() => console.log(`Count: ${count()}`))  // side effects

// Signals are read as functions: count()
// Write directly: setCount(5) or setCount(p => p + 1)
```
Signals are lazy — nothing recomputes until a signal is read inside a tracking scope.

### Step 2: Component Model
```tsx
function Counter(props: { initial?: number }) {
  const [count, setCount] = createSignal(props.initial ?? 0)
  return <button onClick={() => setCount(c => c + 1)}>{count()}</button>
}
```
Components run once. JSX compiles to `document.createElement` calls. Only signal expressions re-execute — not the whole component.

### Step 3: Control Flow
```tsx
<Show when={user()} fallback={<p>Loading...</p>}>
  <p>Welcome {user().name}</p>
</Show>

<For each={items()}>{(item, i) => <li>{i()}: {item.name}</li>}</For>

<Switch fallback={<p>Unknown</p>}>
  <Match when={tab() === 'info'}><Info /></Match>
  <Match when={tab() === 'settings'}><Settings /></Match>
</Switch>

<Index each={letters()}>{(letter, i) => <span>{i()}: {letter()}</span>}</Index>
```

### Step 4: State Management
```tsx
const [state, setState] = createStore({ user: { name: 'Alice' }, items: [] })
setState('user', 'name', 'Bob')                          // Path syntax
setState('items', items => [...items, { id: 1 }])          // Function updater

// createMutable for mutable-style
const mutable = createMutable({ count: 0 })
mutable.count++  // Direct mutation triggers updates
```
Use createStore for complex state. Prefer path syntax over destructuring stores.

### Step 5: Routing
```tsx
import { Router, Route } from '@solidjs/router'
import { lazy } from 'solid-js'

const Home = lazy(() => import('./pages/Home'))
const Users = lazy(() => import('./pages/Users'))

<Router>
  <Route path="/" component={Home} />
  <Route path="/users" component={Users} />
  <Route path="/users/:id" component={lazy(() => import('./pages/UserDetail'))} />
</Router>
```
Route params are signals: `const params = useParams()`. Prefetch with `<Link>`.

## Rules
- No hooks rules — components run once. Don't call signals conditionally.
- JSX is compiled, not interpreted. No dynamic component creation.
- Destructure signals with care — use `props.name` as `() => props.name`.
- Use createMemo for derived values. Never use createEffect for computing values.
- Solid is compile-time optimized — trust the compiler.
- createStore path syntax for targeted updates. Avoid replacing entire objects.

## References
- `references/solid-reactivity.md` — signals, memos, effects, stores, batching
- `references/solid-components.md` — JSX, control flow, context, portals, lifecycle
- `references/solidjs-reactivity.md` — signals, createStore, createResource, batching, context API
- `references/solidjs-optimization.md` — compiler optimizations, avoiding re-renders, memoization, lazy loading

## Handoff
No artifact produced.
Next skill: frontend-solidjs-patterns for data fetching, forms, composition, and animation.
Carry forward: signal patterns, store usage, control flow conventions.
