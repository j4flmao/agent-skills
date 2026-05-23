# TypeScript Type Safety Patterns

## Type Narrowing with Discriminated Unions

```tsx
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; sideLength: number }
  | { kind: 'triangle'; base: number; height: number }

function area(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':   return Math.PI * shape.radius ** 2
    case 'square':   return shape.sideLength ** 2
    case 'triangle': return (shape.base * shape.height) / 2
  }
}
```

## Branded / Nominal Types

```tsx
type Brand<T, B extends string> = T & { __brand: B }

type UserId = Brand<string, 'UserId'>
type OrderId = Brand<string, 'OrderId'>

function getUser(id: UserId): User { /* ... */ }
function getOrder(id: OrderId): Order { /* ... */ }

// Brand factory — only way to create branded types
function createUserId(id: string): UserId {
  return id as UserId
}

// Compile-time error:
getUser(createUserId('abc'))  // OK
// getUser('abc')             // Error!
```

## Zod Schema for API Boundaries

```tsx
import { z } from 'zod'

const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['admin', 'user']),
  createdAt: z.string().datetime(),
})

type User = z.infer<typeof UserSchema>
```

## Exhaustive Check Helper

```tsx
function assertNever(value: never): never {
  throw new Error(`Unhandled union member: ${value}`)
}

type Status = 'idle' | 'loading' | 'success' | 'error'

function handleStatus(status: Status) {
  switch (status) {
    case 'idle':    return 'Ready'
    case 'loading': return 'Please wait'
    case 'success': return 'Done'
    case 'error':   return 'Failed'
    default:        return assertNever(status)
  }
}
```

## `satisfies` for Const Objects

```tsx
const colors = {
  primary: '#1a73e8',
  secondary: '#5f6368',
  error: '#d93025',
} satisfies Record<string, string>

// colors.primary is literal type '#1a73e8', not string
```

## `ReadonlyArray` for Immutable Props

```tsx
function List({ items }: { readonly items: readonly string[] }) {
  // items.push('x') — error!
}
```

## Mapped Types for UI Variants

```tsx
type Variant = 'primary' | 'secondary' | 'ghost'
type ColorMap = { [K in Variant]: string }

const buttonColors: ColorMap = {
  primary: 'bg-blue-600',
  secondary: 'bg-gray-200',
  ghost: 'bg-transparent',
}
```

## Utility Types Reference

| Type | Use Case |
|------|----------|
| `Partial<T>` | All properties optional |
| `Required<T>` | All properties required |
| `Pick<T, K>` | Select specific keys |
| `Omit<T, K>` | Exclude specific keys |
| `Record<K, V>` | Object with keys K and values V |
| `Extract<T, U>` | Extract union members assignable to U |
| `Exclude<T, U>` | Exclude union members assignable to U |
| `NonNullable<T>` | Remove null and undefined from T |
