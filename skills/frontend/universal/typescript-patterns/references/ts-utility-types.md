# TypeScript Utility Types

## Deep Partial and Required

```typescript
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P]
}

type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P]
}

// Usage
interface Config {
  database: {
    host: string
    port: number
    credentials: {
      user: string
      password: string
    }
  }
  cache: {
    ttl: number
    strategy: string
  }
}

type PartialConfig = DeepPartial<Config>
const updateConfig: PartialConfig = {
  database: { host: 'localhost' },
}

type LockedConfig = DeepReadonly<Config>
```

## Union and Intersection Helpers

```typescript
type UnionKeys<T> = T extends T ? keyof T : never

type UnionValues<T, K extends keyof T = keyof T> = T extends T
  ? K extends keyof T
    ? { [P in K]: T[P] }
    : never
  : never

type DistributivePick<T, K extends keyof T> = T extends T
  ? Pick<T, K>
  : never

type DistributiveOmit<T, K extends keyof T> = T extends T
  ? Omit<T, K>
  : never

// Usage
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'rectangle'; width: number; height: number }
  | { kind: 'triangle'; base: number; height: number }

type ShapeKind = UnionKeys<Shape> // "kind"
type AllRadius = DistributivePick<Shape, 'radius'>[]
```

## Branded Types

```typescript
type Brand<T, B extends string> = T & { __brand: B }

type UserId = Brand<string, 'UserId'>
type PostId = Brand<string, 'PostId'>
type Email = Brand<string, 'Email'>

function createUserId(id: string): UserId {
  return id as UserId
}

function createPostId(id: string): PostId {
  return id as PostId
}

function getUser(id: UserId): Promise<User>
function getPost(id: PostId): Promise<Post>

// Compile-time error prevention
const userId = createUserId('abc123')
const postId = createPostId('xyz789')

getUser(userId) // OK
getUser(postId) // Error! Type 'PostId' not assignable to 'UserId'
```

## Result Type

```typescript
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E }

async function tryCatch<T, E = Error>(
  fn: () => Promise<T>
): Promise<Result<T, E>> {
  try {
    const data = await fn()
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error as E }
  }
}

function unwrap<T>(result: Result<T>): T {
  if (result.success) return result.data
  throw result.error
}

// Usage
const result = await tryCatch(() => fetchUser(123))
if (result.success) {
  console.log(result.data.name)
} else {
  console.error(result.error.message)
}
```

## String Manipulation Types

```typescript
type CamelCase<S extends string> =
  S extends `${infer P1}_${infer P2}${infer P3}`
    ? `${P1}${Capitalize<P2>}${CamelCase<P3>}`
    : S

type KebabCase<S extends string> =
  S extends `${infer Char}${infer Rest}`
    ? Char extends Uppercase<Char>
      ? `-${Lowercase<Char>}${KebabCase<Rest>}`
      : `${Char}${KebabCase<Rest>}`
    : S

type SnakeCase<S extends string> =
  S extends `${infer Char}${infer Rest}`
    ? Char extends Uppercase<Char>
      ? `_${Lowercase<Char>}${SnakeCase<Rest>}`
      : `${Char}${SnakeCase<Rest>}`
    : S

// Usage
type ApiResponse = {
  user_id: number
  user_name: string
  created_at: string
}

type CamelCasedApi = {
  [K in keyof ApiResponse as CamelCase<K & string>]: ApiResponse[K]
}
```

## Function Type Helpers

```typescript
type Asyncify<T extends (...args: any[]) => any> = (
  ...args: Parameters<T>
) => Promise<ReturnType<T>>

type MaybePromise<T> = T | Promise<T>

type FirstArg<T> = T extends (first: infer A, ...rest: any[]) => any
  ? A
  : never

type ReturnOf<T> = T extends (...args: any[]) => infer R ? R : never

type MethodNames<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never
}[keyof T]

type Throttled<T extends (...args: any[]) => void> = (
  ...args: Parameters<T>
) => void

// Usage
type AsyncHandler = Asyncify<(x: number) => string>
type LogMethod = MethodNames<Console>
```

## Object Path Types

```typescript
type Path<T, K extends keyof T = keyof T> = K extends string
  ? T[K] extends Record<string, unknown>
    ? `${K}.${Path<T[K], keyof T[K]>}`
    : K
  : never

type PathValue<T, P extends string> =
  P extends `${infer Key}.${infer Rest}`
    ? Key extends keyof T
      ? PathValue<T[Key], Rest>
      : never
    : P extends keyof T
      ? T[P]
      : never

// Usage
interface DeepConfig {
  server: {
    port: number
    host: string
    ssl: {
      enabled: boolean
      cert: string
    }
  }
  logging: {
    level: string
    format: string
  }
}

type ConfigPaths = Path<DeepConfig>
type SslEnabled = PathValue<DeepConfig, 'server.ssl.enabled'>
```

## Union to Intersection

```typescript
type UnionToIntersection<U> = (
  U extends any ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never

type LastOf<T> =
  UnionToIntersection<T extends any ? () => T : never> extends () => infer R
    ? R
    : never

type UnionToTuple<T, L = LastOf<T>> = [T] extends [never]
  ? []
  : [...UnionToTuple<Exclude<T, L>>, L]

// Usage
type Actions = { save: () => void } | { delete: () => void } | { update: () => void }
type CombinedActions = UnionToIntersection<Actions>
```

## Conditional Types for API

```typescript
type ApiResponse<T, E = string> = {
  data: T
  error: null
} | {
  data: null
  error: E
}

type PaginatedResponse<T> = {
  items: T[]
  total: number
  page: number
  perPage: number
  hasMore: boolean
}

type ApiMethod<T> = {
  request: (...args: any[]) => Promise<ApiResponse<T>>
}

type EnsureArray<T> = T extends any[] ? T : T[]

type NonNullableFields<T> = {
  [P in keyof T]: NonNullable<T[P]>
}

// Usage
type UserResponse = ApiResponse<User>
type PaginatedUsers = PaginatedResponse<User>
```

## Event Handler Types

```typescript
type EventMap = {
  click: MouseEvent
  change: Event
  submit: FormEvent
  keydown: KeyboardEvent
  focus: FocusEvent
  blur: FocusEvent
  input: InputEvent
}

type EventHandler<E extends keyof EventMap> = (
  event: EventMap[E]
) => void

type TypedEmitter<T extends Record<string, unknown>> = {
  on<K extends keyof T>(event: K, handler: (data: T[K]) => void): void
  emit<K extends keyof T>(event: K, data: T[K]): void
  off<K extends keyof T>(event: K, handler: (data: T[K]) => void): void
}

// Usage
type AppEvents = {
  userLogin: { userId: string; timestamp: number }
  error: { message: string; code: number }
  navigation: { path: string; referrer?: string }
}

const emitter: TypedEmitter<AppEvents> = createEmitter()
emitter.on('userLogin', (data) => {
  console.log(data.userId, data.timestamp)
})
```

## Immutable Update Types

```typescript
type Update<T, K extends keyof T, V> = Omit<T, K> & { [P in K]: V }

type AddField<T, K extends string, V> = T & { [P in K]: V }

type RemoveField<T, K extends keyof T> = Omit<T, K>

type RenameField<T, Old extends keyof T, New extends string> = {
  [P in keyof T as P extends Old ? New : P]: T[P]
}

// Usage
interface User {
  id: number
  name: string
  email: string
}

type UpdatedUser = Update<User, 'name', string>
type UserWithAge = AddField<User, 'age', number>
type UserWithoutEmail = RemoveField<User, 'email'>
type RenamedUser = RenameField<User, 'name', 'fullName'>
```

## Key Points

- Use branded types to prevent mixing semantically different IDs
- Implement Result types for safe error handling without exceptions
- Create recursive utility types (DeepPartial, DeepReadonly) for nested objects
- Use distributive conditional types to work with union members
- Define string transformation types for API key conversion
- Build typed event emitters with mapped event-to-handler maps
- Create immutable update types for state management
- Use union-to-intersection types for combining constraints
- Leverage template literal types for path-based access patterns
- Avoid over-engineering: prefer simple types when adequate
