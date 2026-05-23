---
name: frontend-typescript-patterns
description: >
  Use this skill when the user says 'TypeScript patterns', 'generic components', 'type-safe API', 'discriminated unions', 'type guards', 'type narrowing', 'TS patterns', 'type-safe React', or when writing TypeScript for frontend applications. This skill enforces: generic component patterns with proper constraint bounds, type-safe API client wrappers with response typing, discriminated unions for UI state management, and user-defined type guards. Works with React, Vue, Angular, or any TS-based frontend. Do NOT use for: backend type setup, Node.js runtime types, or basic TypeScript syntax questions.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, typescript, patterns, types, universal]
---

# TypeScript Patterns for Frontend

## Purpose
Write type-safe frontend code with generic components, typed API clients, discriminated unions for state, and reliable type guards.

## Agent Protocol

### Trigger
Exact user phrases: "TypeScript patterns", "generic components", "type-safe API", "discriminated unions", "type guards", "type narrowing", "TS patterns", "type-safe React".

### Input Context
Before activating, verify:
- The frontend framework in use (React, Vue, Angular, etc.).
- Whether the focus is on components, API clients, or state types.

### Output Artifact
No file output. Produces TypeScript pattern implementations as text.

### Response Format
```
Pattern: {name}
File: {file path suggestion}
Code:
{code block with TS implementation}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Generic components use proper constraint bounds (`extends`) — never `any`.
- [ ] API client returns typed responses with discriminated success/error union.
- [ ] UI state modeled as discriminated union — no boolean flags for mutually exclusive states.
- [ ] Type guards narrow correctly at runtime.
- [ ] No unsafe casts (`as`) without a type guard or zod schema backing them.

### Max Response Length
4096 tokens.

## Workflow

### Step 1: Generic Components
```tsx
interface ListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  keyExtractor: (item: T) => string
}

function List<T>({ items, renderItem, keyExtractor }: ListProps<T>) {
  return (
    <ul>
      {items.map((item, i) => (
        <li key={keyExtractor(item)}>{renderItem(item, i)}</li>
      ))}
    </ul>
  )
}

// Usage — type inferred from data
<List
  items={users}
  renderItem={(u) => u.name}
  keyExtractor={(u) => u.id}
/>
```

### Step 2: Type-Safe API Client
```tsx
type ApiResponse<T> =
  | { status: 'success'; data: T }
  | { status: 'error'; code: number; message: string }

async function apiGet<T>(
  url: string,
  schema: z.ZodSchema<T>
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(url)
    if (!res.ok) {
      return { status: 'error', code: res.status, message: res.statusText }
    }
    const json = await res.json()
    const parsed = schema.parse(json)
    return { status: 'success', data: parsed }
  } catch (err) {
    return { status: 'error', code: 0, message: (err as Error).message }
  }
}

// Usage
const res = await apiGet('/api/users', userArraySchema)
if (res.status === 'success') {
  // res.data is typed as User[]
}
```

### Step 3: Discriminated Unions for State
```tsx
// Instead of boolean flags:
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string }

function useAsync<T>(fn: () => Promise<T>): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: 'idle' })
  // ...
  return state
}

// Usage — exhaustive switch
switch (state.status) {
  case 'loading': return <Spinner />
  case 'error':   return <Error msg={state.error} />
  case 'success': return <Data data={state.data} />
  case 'idle':    return <Initial />
}
```

### Step 4: Type Guards
```tsx
interface User { id: string; role: 'admin' | 'user'; email: string }
interface Admin extends User { role: 'admin'; permissions: string[] }
interface RegularUser extends User { role: 'user'; teamId: string }

function isAdmin(user: User): user is Admin {
  return user.role === 'admin'
}

// Use guard to narrow type
if (isAdmin(currentUser)) {
  // currentUser is Admin here — has .permissions
}
```

### Step 5: Constrained Props Pattern
```tsx
type ButtonVariant = 'primary' | 'secondary' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps {
  variant: ButtonVariant
  size: ButtonSize
  children: React.ReactNode
  onClick?: () => void
}

// Variant-specific color map with exhaustive check
const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-blue-600 text-white',
  secondary: 'bg-gray-200 text-gray-900',
  ghost: 'bg-transparent text-blue-600',
}
```

## Rules
- Generic type params must have constraint bounds (`extends`) — never bare `<T>` without purpose.
- Discriminated unions over boolean flags for mutually exclusive states.
- Prefer `zod` schema parsing at API boundaries over raw `as` casts.
- Type guards must be runtime-safe (check actual values), not just type-level assertions.
- Exhaustive `switch` on the `status` field — TypeScript will error if a variant is unhandled.
- Prefer `satisfies` over `as` when constraining a value to a type while keeping its literal type.

## References
- `references/ts-react-patterns.md` — generic components, hooks, prop patterns in React
- `references/ts-type-safety.md` — type narrowing, branded types, Nominal typing patterns

## Handoff
No artifact produced.
Next skill: `error-handling` — wrap API responses with typed error boundaries.
Carry forward: type patterns used, validation library (zod), discriminated union shape.
