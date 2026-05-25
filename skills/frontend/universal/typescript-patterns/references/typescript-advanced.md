# Advanced TypeScript

## Branded Types

```typescript
// Nominal typing via brands
type Brand<K, T> = K & { __brand: T }

type UserId = Brand<string, 'UserId'>
type OrderId = Brand<string, 'OrderId'>
type Email = Brand<string, 'Email'>

function createUserId(id: string): UserId {
  return id as UserId
}

function getUser(id: UserId) { /* ... */ }
function getOrder(id: OrderId) { /* ... */ }

// ✅ Correct — type-safe
const uid = createUserId('abc')
getUser(uid)
// getOrder(uid)  ← TypeScript error: Type 'UserId' is not assignable to type 'OrderId'

// Branded type guard
function isUserId(id: string): id is UserId {
  return /^[a-f0-9]{24}$/.test(id)
}
```

## Template Literal Types

```typescript
type EventName = `on${Capitalize<string>}`
// 'onChange', 'onClick', 'onSubmit', etc.

type CSSProperty = 'margin' | 'padding'
type CSSDirection = 'top' | 'right' | 'bottom' | 'left'
type CSSValue = `${CSSProperty}-${CSSDirection}`
// 'margin-top' | 'margin-right' | 'margin-bottom' | 'margin-left'
// 'padding-top' | 'padding-right' | 'padding-bottom' | 'padding-left'

type ApiPath = `/api/${string}`
// '/api/users', '/api/orders', etc.

type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'
type ApiEndpoint = `${HTTPMethod} /api/${string}`
// 'GET /api/users', 'POST /api/orders'
```

## Conditional Types

```typescript
// Extract async return type
type AsyncReturnType<T> = T extends Promise<infer U> ? U : T

type Result = AsyncReturnType<Promise<string>>  // string
type Result2 = AsyncReturnType<string>           // string (not a promise)

// Deep partial
type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T

interface Config {
  server: { host: string; port: number }
  features: { darkMode: boolean }
}

type PartialConfig = DeepPartial<Config>
// { server?: { host?: string; port?: number }; features?: { darkMode?: boolean } }

// Non-nullable keys
type NonNullableKeys<T> = {
  [K in keyof T as T[K] extends null | undefined ? never : K]: T[K]
}
```

## Mapped Types with Key Remapping

```typescript
// Prefix all keys
type Prefixed<T, P extends string> = {
  [K in keyof T as `${P}${Capitalize<string & K>}`]: T[K]
}

type User = { name: string; email: string }
type FormUser = Prefixed<User, 'form'>
// { formName: string; formEmail: string }

// Pick by value type
type PickByType<T, V> = {
  [K in keyof T as T[K] extends V ? K : never]: T[K]
}

interface Entity {
  id: string
  name: string
  age: number
  createdAt: Date
}

type StringKeys = PickByType<Entity, string>
// { id: string; name: string }
```

## Satisfies Operator

```typescript
// satisfies checks type while keeping literal values
const palette = {
  primary: '#2563eb',
  secondary: '#6b7280',
  danger: '#dc2626',
} satisfies Record<string, `#${string}`>

// palette.primary is literal '#2563eb' (not string)
// Compile error if any value isn't a hex color

type Color = keyof typeof palette
// "primary" | "secondary" | "danger"

// With component props
const buttonVariants = {
  primary: 'bg-blue-600 text-white',
  secondary: 'bg-gray-200 text-gray-900',
} satisfies Record<string, string>

type ButtonVariant = keyof typeof buttonVariants
```

## Typed Event Patterns

```typescript
// Type-safe event emitter
type EventMap = {
  'user:created': { id: string; name: string }
  'order:placed': { orderId: string; total: number }
  'error': { message: string; code: number }
}

class TypedEmitter<T extends Record<string, unknown>> {
  private handlers = new Map<keyof T, Set<(...args: any[]) => void>>()

  on<K extends keyof T>(event: K, handler: (payload: T[K]) => void) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set())
    this.handlers.get(event)!.add(handler as any)
    return () => this.handlers.get(event)?.delete(handler as any)
  }

  emit<K extends keyof T>(event: K, payload: T[K]) {
    this.handlers.get(event)?.forEach(h => h(payload))
  }
}

const emitter = new TypedEmitter<EventMap>()
emitter.on('user:created', (user) => console.log(user.name))  // typed payload
emitter.emit('order:placed', { orderId: '123', total: 50 })   // type-checked
```

## Function Overloads

```typescript
// Overload signatures
function parse(input: string): JSONValue
function parse<T>(input: string, schema: z.ZodSchema<T>): T
function parse(input: string, schema?: z.ZodSchema<any>) {
  const json = JSON.parse(input)
  return schema ? schema.parse(json) : json
}

// Usage
const result = parse('{"name":"Alice"}')           // JSONValue
const user = parse('{"name":"Alice"}', userSchema)  // User
```

## Type Assertion Functions

```typescript
function assertIsDefined<T>(value: T): asserts value is NonNullable<T> {
  if (value === undefined || value === null) {
    throw new Error(`Expected value to be defined, got ${value}`)
  }
}

function processUser(id: string | undefined) {
  assertIsDefined(id)
  // id is now string (narrowed)
  getUser(id)
}
```

## Advanced Type Patterns Decision

| Pattern | Use Case | Example |
|---------|----------|---------|
| Branded types | Prevent mixing IDs | `UserId` vs `OrderId` |
| Template literals | Constrained string types | `CSSValue` type |
| Conditional types | Extract/infer types | `AsyncReturnType` |
| Key remapping | Transform object keys | `Prefixed<T>` |
| satisfies | Literal type preservation | `palette satisfies Record` |
| Typed events | Event type safety | `TypedEmitter` |
| Function overloads | Different return types | `parse()` |
| Assertion functions | Narrow after validation | `assertIsDefined` |
