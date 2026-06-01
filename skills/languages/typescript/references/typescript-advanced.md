# Advanced TypeScript Patterns

## Conditional Types

### Basic Conditional
```typescript
type IsString<T> = T extends string ? true : false;

type A = IsString<"hello">;  // true
type B = IsString<number>;    // false
```

### Distributive Conditional
```typescript
// When T is a union, conditional distributes
type ToArray<T> = T extends any ? T[] : never;
type Result = ToArray<string | number>;  // string[] | number[]

// Prevent distribution with []
type ToArrayNonDist<T> = [T] extends [any] ? T[] : never;
type Result2 = ToArrayNonDist<string | number>;  // (string | number)[]
```

### infer Keyword
```typescript
// Extract return type
type ReturnOf<T> = T extends (...args: any[]) => infer R ? R : never;

// Extract array element type
type ElementType<T> = T extends (infer U)[] ? U : never;

// Extract Promise value
type Unwrap<T> = T extends Promise<infer U> ? U : T;

// Extract function parameters as tuple
type Params<T> = T extends (...args: infer P) => any ? P : never;

// Deep-flatten
type Flatten<T> = T extends any[]
  ? T[number] extends infer U
    ? U extends any[]
      ? Flatten<U>
      : U
    : never
  : T;
```

### Recursive Conditional Types
```typescript
// Deep readonly
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object
    ? T[P] extends Function
      ? T[P]
      : DeepReadonly<T[P]>
    : T[P];
};

// JSON types
type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };
```

## Mapped Types

### Key Transformation
```typescript
// Make all properties optional
type Partial<T> = { [P in keyof T]?: T[P] };

// Make all properties required
type Required<T> = { [P in keyof T]-?: T[P] };

// Make all properties readonly
type Readonly<T> = { readonly [P in keyof T]: T[P] };

// Pick subset of keys
type Pick<T, K extends keyof T> = { [P in K]: T[P] };

// Omit keys
type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;
```

### Key Remapping (TypeScript 4.1+)
```typescript
// Prefix keys
type AddPrefix<T, P extends string> = {
  [K in keyof T as `${P}${Capitalize<string & K>}`]: T[K];
};

type User = { name: string; age: number };
type APIUser = AddPrefix<User, "get">;
// { getName: string; getAge: number }

// Filter by value type
type KeysOfType<T, V> = {
  [K in keyof T as T[K] extends V ? K : never]: T[K];
};

type StringKeys = KeysOfType<User, string>;  // { name: string }

// Remove keys with null/undefined values
type NonNullableKeys<T> = {
  [K in keyof T as T[K] extends null | undefined ? never : K]: T[K];
};
```

### Template Literal Types
```typescript
// Parse API paths
type ExtractRouteParams<T extends string> =
  T extends `${string}:${infer Param}/${infer Rest}`
    ? { [K in Param | keyof ExtractRouteParams<Rest>]: string }
    : T extends `${string}:${infer Param}`
      ? { [K in Param]: string }
      : {};

type Params = ExtractRouteParams<"/users/:userId/orders/:orderId">;
// { userId: string; orderId: string }

// Event emitters
type EventName<T extends string> = `on${Capitalize<T>}`;
type ClickEvent = EventName<"click">;  // "onClick"
```

## Utility Types Reference

| Utility | Description |
|---------|-------------|
| `Partial<T>` | All properties optional |
| `Required<T>` | All properties required |
| `Readonly<T>` | All properties readonly |
| `Pick<T, K>` | Select subset of keys |
| `Omit<T, K>` | Remove subset of keys |
| `Record<K, V>` | Object with keys K and values V |
| `Exclude<T, U>` | Remove from T types assignable to U |
| `Extract<T, U>` | Keep from T types assignable to U |
| `NonNullable<T>` | Remove null and undefined |
| `Parameters<T>` | Extract function parameter types |
| `ReturnType<T>` | Extract function return type |
| `ConstructorParameters<T>` | Constructor param types |
| `InstanceType<T>` | Constructor return type |
| `ThisParameterType<T>` | Extract this parameter type |
| `OmitThisParameter<T>` | Remove this parameter |
| `Uppercase<S>` | Uppercase string literal |
| `Lowercase<S>` | Lowercase string literal |
| `Capitalize<S>` | Capitalize string literal |
| `Uncapitalize<S>` | Uncapitalize string literal |

## Branded Types

```typescript
// Prevent type confusion at the type level
type Brand<T, B> = T & { __brand: B };

type UserId = Brand<string, "UserId">;
type OrderId = Brand<string, "OrderId">;
type Email = Brand<string, "Email">;

function createUserId(value: string): UserId {
  return value as UserId;
}

function findUser(id: UserId): User { ... }
function findOrder(id: OrderId): Order { ... }

// Compile error: mixing IDs
const uid = createUserId("abc");
findOrder(uid);  // ❌ Error!
```

## Type-Safe Builder Pattern

```typescript
// Builder that tracks which fields are set
class QueryBuilder<T, Fields extends keyof T = never> {
  private conditions: Partial<T> = {};

  where<K extends keyof T, V extends T[K]>(
    field: K,
    value: V
  ): QueryBuilder<T, Fields | K> {
    this.conditions[field] = value;
    return this as any;
  }

  build(): this extends QueryBuilder<any, infer F>
    ? F extends keyof T ? Required<Pick<T, F>> : never
    : never {
    return this.conditions as any;
  }
}

// Usage
type Filter = { name?: string; age?: number; status?: string };
const query = new QueryBuilder<Filter>()
  .where("name", "Alice")
  .where("status", "active")
  .build();
// Type: { name: string; status: string }
```

## Advanced Module Patterns

### Barrel Files
```typescript
// src/repository/index.ts
export { UserRepository } from "./user-repository";
export { OrderRepository } from "./order-repository";
export type { RepositoryConfig } from "./types";
```

### Declaration Merging
```typescript
// Extend existing types
interface Array<T> {
  last(): T | undefined;
  first(): T | undefined;
}

Array.prototype.last = function () {
  return this[this.length - 1];
};

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
```

### Module Augmentation
```typescript
// Augment third-party module types
import "some-library";

declare module "some-library" {
  interface Options {
    enableFeature?: boolean;
  }
}
```
