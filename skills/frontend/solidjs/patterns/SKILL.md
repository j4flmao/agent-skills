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

## Rules
- createResource for all async data — never fetch in effects.
- Wrap resource consumers in Suspense.
- Validate forms with Zod on submit — both client and server.
- Children as functions for render-props pattern.
- CSS transitions are preferred — Solid Flip for list reorder.
- Avoid createEffect for data fetching — use createResource.

## References
- `references/solid-data.md` — createResource, Suspense, error boundaries, lazy loading
- `references/solid-forms.md` — controlled inputs, validation, field arrays, custom form state

## Handoff
No artifact produced.
Next skill: frontend-universal-testing for unit/integration tests in SolidJS.
Carry forward: resource patterns, form validation approach, composition patterns.
