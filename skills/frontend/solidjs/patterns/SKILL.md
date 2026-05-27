---
name: frontend-solidjs-patterns
description: >
  Use this skill when the user says 'SolidJS pattern', 'SolidJS form', 'SolidJS data fetching', 'SolidJS component pattern', 'SolidJS animation'. This skill enforces: createResource for async data with Suspense, controlled forms via signals, component composition via JSX children as functions, and transitions/animation with createTransition and CSS. Requires existing SolidJS project (package.json with solid-js). Do NOT use for: React or Vue data fetching patterns.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, solidjs, patterns, phase-7]
---

# SolidJS Patterns

## Purpose
Apply production patterns to SolidJS applications: async data with createResource, controlled forms with signals and Zod, component composition patterns, and animation.

## Agent Protocol

### Trigger
Exact user phrases: "SolidJS pattern", "SolidJS form", "SolidJS data fetching", "SolidJS component pattern", "SolidJS animation".

### Input Context
Before activating, verify:
- SolidJS project with solid-js package.
- Whether @tanstack/solid-form or custom forms are used.
- If css transitions or Solid Flip is available for animation.

### Output Artifact
No file output. Produces code patterns for data fetching, forms, composition, and animation.

### Response Format
Code: show resource, form, and composition examples. No imports beyond SolidJS APIs.

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Data fetching uses createResource with Suspense boundaries.
- [ ] createResource refetches when source signal changes.
- [ ] Forms use controlled inputs with signals and Zod validation.
- [ ] Component composition uses JSX children as functions or slot patterns.
- [ ] Animation uses createTransition, Solid Flip, or CSS transitions with signals.

### Max Response Length
Code: 15 lines per example.

## Workflow

### Step 1: Data Fetching with createResource
```tsx
function UserProfile(props: { userId: () => string }) {
  const [user] = createResource(props.userId, async (id) => {
    const res = await fetch(`/api/users/${id}`)
    if (!res.ok) throw new Error('Failed')
    return res.json()
  })
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <h1>{user()?.name}</h1>
    </Suspense>
  )
}
```
Use `mutate` for optimistic updates. Use `refetch` for manual revalidation. Wrap Suspense around resource consumers.

### Step 2: Forms (Controlled via Signals)
```tsx
function LoginForm() {
  const [email, setEmail] = createSignal('')
  const [password, setPassword] = createSignal('')
  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    const result = schema.safeParse({ email: email(), password: password() })
    if (!result.success) return setErrors(result.error.flatten().fieldErrors)
    await fetch('/api/login', { method: 'POST', body: JSON.stringify(result.data) })
  }
  return (
    <form onSubmit={handleSubmit}>
      <input value={email()} onInput={(e) => setEmail(e.currentTarget.value)} />
      <input type="password" value={password()} onInput={(e) => setPassword(e.currentTarget.value)} />
      <button type="submit">Login</button>
    </form>
  )
}
```
For complex forms, use createStore for nested values and field arrays.

### Step 3: Component Composition
```tsx
// Render props via JSX children as functions
function List(props: { each: any[]; children: (item: any, index: () => number) => any }) {
  return <For each={props.each}>{(item, i) => props.children(item, i)}</For>
}

// Slot pattern via spreads
function Card(props: { header?: any; footer?: any; children: any }) {
  return (
    <div class="card">
      <div class="header">{props.header}</div>
      <div class="body">{props.children}</div>
    </div>
  )
}
```

### Step 4: Animation
```tsx
// CSS transitions with signals
const [expanded, setExpanded] = createSignal(false)
<div classList={{ expanded: expanded() }} onClick={() => setExpanded(!expanded())}>
  <div class="content">Animated content</div>
</div>

// createTransition for shared element transitions
const [tab, setTab] = createSignal('home')
const [pending, startTransition] = createTransition(() => setTab('settings'))
```

## SolidJS SSR Patterns

```yaml
solidjs_ssr:
  streaming_ssr:
    description: "SolidJS supports streaming server-side rendering — sends HTML as it renders"
    implementation: "Use SolidStart or custom Vite plugin with solid-ssr"
    benefits:
      - "Faster time to first byte (TTFB) — shell renders immediately"
      - "Progressive enhancement — content streams as it becomes available"
      - "Reduced time to interactive — island hydration for interactive parts"
      
  islands_architecture:
    description: "Selective hydration — only interactive components hydrate on client"
    vs_nextjs: "SolidJS islands are more granular than Next.js app router (page-level)"
    implementation:
      - "Static content renders to HTML on server — no JavaScript sent"
      - "Interactive islands (counters, forms, search) hydrate independently"
      - "Each island has its own JS bundle — no page-level JS required"
    code:
      pattern: 'Use <Island> component or SolidStart route export — only components using signals/effects need hydration'
      example: "Header (static HTML) + SearchBar (interactive island) + Footer (static HTML)"
      
  data_loading_ssr:
    pattern: "Use createResource on server, data serialized and rehydrated on client"
    approach: "Server fetches data during render → data serialized in HTML → client deserializes without refetch"
    code:
      server: "createResource(() => fetch(`/api/data`)) — runs during SSR"
      client: "createResource(() => fetch(`/api/data`)) — skips fetch if server data available"
```

## State Management Decision Guide

```yaml
state_management:
  component_local_state:
    tool: "createSignal, createStore"
    use_case: "Form inputs, toggle state, local UI state"
    example: "const [name, setName] = createSignal('')"
    
  shared_state_without_server:
    tool: "createContext + createSignal/createStore"
    use_case: "Theme, user preferences, app-wide settings"
    pattern: "Provider pattern — wrap app in context provider, consume with useContext"
    
  server_cache_state:
    tool: "createResource + createMutation (optional)"
    use_case: "API data that needs caching, refetching, optimistic updates"
    libraries: "TanStack Solid Query (if using Solid 1.8+) or custom createResource wrapper"
    features: ["Caching", "Background refetch", "Optimistic updates", "Pagination"]
    
  complex_shared_state:
    tool: "createStore with actions/reducers pattern"
    use_case: "Complex state with multiple consumers, undo/redo, middleware"
    libraries: "Zustand (via zustand-solid), or manual store with createStore + signals"
    trade_off: "More boilerplate but predictable state updates"
    
  global_state_with_persistence:
    tool: "signal + localStorage/sessionStorage sync"
    pattern: "Create signal, subscribe to changes, persist to storage on write, hydrate on load"
    example: "const [theme, setTheme] = createSignal(localStorage.getItem('theme') || 'light')"
```

## Testing Patterns

```yaml
solidjs_testing:
  unit_tests:
    framework: "Vitest — native ESM, fast, compatible with SolidJS"
    testing_library: "solid-testing-library — render, screen, fireEvent"
    patterns:
      signal_testing:
        - "Create signals directly, test derived values with computed"
        - "Test resource fetchers by mocking fetch/axios"
      component_testing:
        - "Render component with solid-testing-library"
        - "Test user interactions with fireEvent"
        - "Assert on rendered output with screen queries"
        
  integration_tests:
    approach: "Test component compositions — parent + child interactions"
    mock: "Mock API layer at network level (MSW — Mock Service Worker)"
    coverage: "Test key user flows, not every component in isolation"
    
  e2e_tests:
    tool: "Playwright — cross-browser, mobile emulation"
    focus: "Critical user journeys (signup, purchase, search results)"
```

## Rules
- createResource for all async data — never fetch in effects.
- Wrap resource consumers in Suspense.
- Validate forms with Zod on submit — both client and server.
- Children as functions for render-props pattern.
- CSS transitions are preferred — Solid Flip for list reorder.
- Avoid createEffect for data fetching — use createResource.
- Signals for local state, stores for shared state, createResource for server state.
- Use islands architecture for SSR — minimize JavaScript sent to client.
- Choose state management based on scope — don't use global store for local state.

## References
  - references/solid-data.md — SolidJS Data — createResource, Suspense, Error Boundaries, Lazy Loading
  - references/solid-forms.md — SolidJS Forms — Controlled Inputs, Validation, Field Arrays, Custom Form State
  - references/solidjs-routing.md — SolidJS Routing Patterns
  - references/solidjs-state.md — SolidJS State Management Patterns
  - references/solidjs-testing.md — SolidJS Testing Reference
  - references/solidjs-ui-patterns.md — SolidJS Patterns
## Handoff
No artifact produced.
Next skill: frontend-universal-testing for unit/integration tests in SolidJS.
Carry forward: resource patterns, form validation approach, composition patterns.
