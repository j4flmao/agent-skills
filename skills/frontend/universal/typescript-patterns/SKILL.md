---
name: frontend-typescript-patterns
description: >
  Use this skill when the user says 'TypeScript patterns', 'generic components', 'type-safe API', 'discriminated unions', 'type guards', 'type narrowing', 'TS patterns', 'type-safe React', or when writing TypeScript for frontend applications. This skill enforces: generic component patterns with proper constraint bounds, type-safe API client wrappers with response typing, discriminated unions for UI state management, and user-defined type guards. Works with React, Vue, Angular, or any TS-based frontend. Do NOT use for: backend type setup, Node.js runtime types, or basic TypeScript syntax questions.
version: "2.0.0"
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

## TypeScript Architecture / Decision Trees

### Pattern Selection Decision Tree
```
What type of code are you writing?
  |-- Component that renders different data types -->
  |     GENERIC COMPONENT with <T extends ...>
  |     Usage: List<T>, Table<T>, Select<T>
  |     Constraint: extends to limit allowed types
  |
  |-- API call that returns unknown shape -->
  |     TYPE-SAFE API CLIENT with Zod schema parsing
  |     Never: raw `as` cast
  |     Return: discriminated union { status, data | error }
  |
  |-- State that has multiple mutually-exclusive shapes -->
  |     DISCRIMINATED UNION with `status` discriminator
  |     Never: multiple boolean flags (isLoading, isError, isSuccess)
  |     Pattern: AsyncState<T> = idle | loading | success | error
  |
  |-- Runtime type check for a union type -->
  |     TYPE GUARD function: `is X` using `value is Type`
  |     Pattern: function isAdmin(user): user is Admin
  |
  |-- Variant mapping with safe access -->
        CONSTRAINED PROPS with Record<K, V> using exhaustive key check
        Pattern: Record<ButtonVariant, string>
```

### Type Safety Decision Tree
```
Can the value's shape change at runtime?
  |-- NO (statically known) -->
  |     Plain TypeScript interface or type is sufficient
  |     No runtime validation needed
  |
  |-- YES (API response, user input, localStorage) -->
  |     |-- Can use Zod schema? -->
  |     |     YES: Zod.parse() at the boundary, infer type from schema
  |     |     NO: Write a type guard function with runtime checks
  |     |
  |     |-- Never cast with `as` unless you validated first
  |
  |-- It's a framework boundary (props, events) -->
        Use satisfies to constrain to a type while keeping literal values
```

---

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

### Step 6: satisfies Pattern
```tsx
// Without satisfies — loses literal type
const variants: Record<string, string> = {
  primary: 'bg-blue-600',
  secondary: 'bg-gray-200',
}
// variants.primary is string, not 'bg-blue-600'

// With satisfies — keeps literal type while constraining
const variants = {
  primary: 'bg-blue-600',
  secondary: 'bg-gray-200',
} satisfies Record<string, string>
// variants.primary is 'bg-blue-600' (literal type)
```

### Step 7: Branded Types
```tsx
// Branded type for type-safe IDs
type Brand<T, B> = T & { __brand: B }
type UserId = Brand<string, 'UserId'>
type OrderId = Brand<string, 'OrderId'>

function getUser(id: UserId) { /* ... */ }
function getOrder(id: OrderId) { /* ... */ }

const userId = 'abc' as UserId
const orderId = 'xyz' as OrderId

getUser(userId)   // OK
getUser(orderId)  // Type error! Prevents ID confusion
```

### Step 8: Template Literal Types
```tsx
// Event handler types
type EventName = 'click' | 'hover' | 'focus'
type HandlerName = `on${Capitalize<EventName>}`
// 'onClick' | 'onHover' | 'onFocus'

// Component prop pattern
type ComponentSize = 'sm' | 'md' | 'lg'
type SpacingProp = `padding-${ComponentSize}`
// 'padding-sm' | 'padding-md' | 'padding-lg'
```

## Common Pitfalls

### 1. Bare Generic Without Constraint
```tsx
// BAD -- T can be anything, no useful methods
function getLength<T>(value: T): number { return value.length }

// GOOD -- constrain to what you need
function getLength<T extends { length: number }>(value: T): number {
  return value.length
}
```

### 2. Using `as` Instead of Runtime Validation
```tsx
// BAD -- lies to TypeScript, runtime may differ
const user = data as User

// GOOD -- parse at boundary, type is guaranteed
const user = userSchema.parse(data)
```

### 3. Boolean Flags for Mutually Exclusive State
```tsx
// BAD -- invalid states possible (both isLoading and isError true)
const [isLoading, setIsLoading] = useState(false)
const [isError, setIsError] = useState(false)
const [data, setData] = useState<T | null>(null)

// GOOD -- only one state at a time
const [state, setState] = useState<AsyncState<T>>({ status: 'idle' })
```

## Compared With

| Pattern | Type Safety | Runtime Cost | Boilerplate | Use Case |
|---------|------------|-------------|-------------|----------|
| Plain interface | Static only | 0 | Low | Internal types, props |
| Discriminated union | Static + exhaustive | 0 | Medium | State, API responses |
| Zod schema | Static + runtime | Small | Medium | API boundaries, forms |
| Type guard | Static + runtime | Small | Low | Narrowing union types |
| Branded types | Static only | 0 | Low | ID type safety |
| satisfies | Static only | 0 | Low | Literal type preservation |
| Template literals | Static only | 0 | Low | String manipulation types |

## Performance Considerations

- TypeScript types are erased at compile time — zero runtime cost
- Zod validation adds ~0.01-0.1ms per simple object parse
- Discriminated unions are just objects with a discriminator field — no overhead
- Branded types are zero-cost (just an intersection at type level)
- Template literal types are evaluated at compile time only

## Accessibility Considerations

- TypeScript has no direct accessibility implications
- Well-typed components with constrained props (ButtonVariant, ButtonSize) are easier to make accessible — the type system guides correct usage

## Security Considerations

- Zod schema parsing at API boundaries prevents unexpected data shapes from causing runtime errors
- Type guards prevent type confusion that could lead to security bugs
- Branded types prevent accidentally passing a UserId where an OrderId is expected

## Rules
- Generic type params must have constraint bounds (`extends`) — never bare `<T>` without purpose.
- Discriminated unions over boolean flags for mutually exclusive states.
- Prefer `zod` schema parsing at API boundaries over raw `as` casts.
- Type guards must be runtime-safe (check actual values), not just type-level assertions.
- Exhaustive `switch` on the `status` field — TypeScript will error if a variant is unhandled.
- Prefer `satisfies` over `as` when constraining a value to a type while keeping its literal type.

## References
  - references/ts-generics-patterns.md — TypeScript Generics Patterns
  - references/ts-react-patterns.md — TypeScript React Patterns
  - references/ts-type-safety.md — TypeScript Type Safety Patterns
  - references/ts-utility-types.md — TypeScript Utility Types
  - references/typescript-advanced.md — Advanced TypeScript
  - references/typescript-config.md — TypeScript Configuration
## Handoff
No artifact produced.
Next skill: `error-handling` — wrap API responses with typed error boundaries.
Carry forward: type patterns used, validation library (zod), discriminated union shape.
