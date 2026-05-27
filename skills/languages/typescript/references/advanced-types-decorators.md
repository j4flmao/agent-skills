# TypeScript Advanced Types and Decorators

## Overview
TypeScript's type system enables complex type relationships through conditional types, mapped types, template literals, and inference. Decorators provide metaprogramming for classes, methods, and properties.

## Advanced Types

### Conditional Types
```typescript
type IsString<T> = T extends string ? true : false;
type A = IsString<"hello">;   // true
type B = IsString<42>;         // false

// Nested conditional
type TypeName<T> =
  T extends string ? "string" :
  T extends number ? "number" :
  T extends boolean ? "boolean" :
  T extends undefined ? "undefined" :
  T extends Function ? "function" :
  "object";

// Distributive conditional types
type ToArray<T> = T extends unknown ? T[] : never;
type Result = ToArray<string | number>;  // string[] | number[]

// Inference with infer
type ReturnType<T> = T extends (...args: unknown[]) => infer R ? R : never;
type ArrayItem<T> = T extends (infer U)[] ? U : never;
type PromiseValue<T> = T extends Promise<infer V> ? V : never;
```

### Mapped Types
```typescript
// Basic mapped type
type Readonly<T> = {
  readonly [K in keyof T]: T[K];
};

type Partial<T> = {
  [K in keyof T]?: T[K];
};

type Required<T> = {
  [K in keyof T]-?: T[K];
};

// Property modification
type Nullable<T> = {
  [K in keyof T]: T[K] | null;
};

type Stringify<T> = {
  [K in keyof T]: string;
};

// Key remapping (TypeScript 4.1+)
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

type Setters<T> = {
  [K in keyof T as `set${Capitalize<string & K>}`]: (value: T[K]) => void;
};

// Filter types
type FunctionsOnly<T> = {
  [K in keyof T as T[K] extends Function ? K : never]: T[K];
};
```

### Template Literal Types
```typescript
type EventName = `on${Capitalize<string>}`;
type Direction = "top" | "bottom" | "left" | "right";
type Margin = `margin${Capitalize<Direction>}`;
// "marginTop" | "marginBottom" | "marginLeft" | "marginRight"

// Pattern matching
type ExtractRouteParams<T extends string> =
  T extends `${string}:${infer Param}/${infer Rest}`
    ? Param | ExtractRouteParams<Rest>
    : T extends `${string}:${infer Param}`
      ? Param
      : never;

type Params = ExtractRouteParams<"/users/:userId/posts/:postId">;
// "userId" | "postId"

// String manipulation
type UppercaseGreeting = Uppercase<"hello">;  // "HELLO"
type LowercaseGreeting = Lowercase<"HELLO">;  // "hello"
type Capitalized = Capitalize<"name">;        // "Name"
type Uncapitalized = Uncapitalize<"Name">;     // "name"
```

### Utility Types
```typescript
// Pick and Omit
type User = {
  id: number;
  name: string;
  email: string;
  password: string;
};

type PublicUser = Pick<User, "id" | "name" | "email">;
type Credentials = Omit<User, "id" | "name">;

// Extract and Exclude
type Colors = "red" | "green" | "blue" | "yellow";
type WarmColors = Extract<Colors, "red" | "yellow">;
type CoolColors = Exclude<Colors, "red" | "yellow">;

// NonNullable
type Maybe = string | null | undefined;
type Definitely = NonNullable<Maybe>;  // string

// Record
type PageInfo = Record<string, { title: string; path: string }>;

// Parameters and ConstructorParameters
type Fn = (name: string, age: number) => boolean;
type FnParams = Parameters<Fn>;  // [string, number]

// ThisParameterType and OmitThisParameter
type WithThis = (this: Window, x: number) => void;
type ThisType = ThisParameterType<WithThis>;  // Window
type WithoutThis = OmitThisParameter<WithThis>;  // (x: number) => void
```

## Decorators

### Class Decorators
```typescript
function sealed(constructor: Function) {
  Object.seal(constructor);
  Object.seal(constructor.prototype);
}

@sealed
class BugReport {
  type = "report";
  title: string;

  constructor(t: string) {
    this.title = t;
  }
}

// Decorator factory
function logger<T extends { new (...args: any[]): {} }>(prefix: string) {
  return function (constructor: T) {
    return class extends constructor {
      constructor(...args: any[]) {
        super(...args);
        console.log(`${prefix}: ${constructor.name} created`);
      }
    };
  };
}

@logger("App")
class UserService {
  constructor(public name: string) {}
}
```

### Method Decorators
```typescript
function log(target: any, propertyKey: string,
             descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;

  descriptor.value = function (...args: any[]) {
    console.log(`Calling ${propertyKey} with:`, args);
    const result = originalMethod.apply(this, args);
    console.log(`Result:`, result);
    return result;
  };

  return descriptor;
}

// Async method decorator
function measure(target: any, propertyKey: string,
                 descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    const start = performance.now();
    const result = await originalMethod.apply(this, args);
    const duration = performance.now() - start;
    console.log(`${propertyKey} took ${duration}ms`);
    return result;
  };

  return descriptor;
}

class ApiService {
  @log
  @measure
  async fetchUser(id: number) {
    const response = await fetch(`/api/users/${id}`);
    return response.json();
  }
}
```

### Property and Accessor Decorators
```typescript
function defaultValue(value: any) {
  return (target: any, propertyKey: string) => {
    let currentValue = value;

    Object.defineProperty(target, propertyKey, {
      get: () => currentValue,
      set: (v) => { currentValue = v; },
      enumerable: true,
      configurable: true,
    });
  };
}

function format(pattern: string) {
  return (target: any, propertyKey: string,
          descriptor: PropertyDescriptor) => {
    const originalGet = descriptor.get;

    descriptor.get = function () {
      const value = originalGet?.call(this);
      if (typeof value === "number") {
        return pattern.replace("%v", value.toString());
      }
      return value;
    };
  };
}

class Product {
  @defaultValue("Untitled")
  title!: string;

  private _price: number = 0;

  @format("$%v")
  get price(): number {
    return this._price;
  }

  set price(value: number) {
    this._price = Math.max(0, value);
  }
}
```

### Parameter Decorators
```typescript
import "reflect-metadata";

function validate(target: Object, propertyKey: string,
                  parameterIndex: number) {
  const existingValidatedParams: number[] =
    Reflect.getOwnMetadata("validate", target, propertyKey) || [];
  existingValidatedParams.push(parameterIndex);
  Reflect.defineMetadata("validate", existingValidatedParams,
                         target, propertyKey);
}

class UserController {
  createUser(@validate name: string, @validate email: string) {
    // Validation happens through middleware
  }
}
```

## Key Points
- Conditional types create type relationships with extends and infer
- Mapped types transform object types with property iteration
- Template literal types enable string pattern matching at type level
- Utility types (Pick, Omit, Extract, Exclude) simplify type manipulation
- Decorators provide metaprogramming for classes, methods, and properties
- Decorator factories enable parameterized decorators
- Reflect metadata API stores decorator information
- Distributive conditional types work with union types
- infer keyword extracts types from conditional branches
- Key remapping with as clause renames mapped type keys
- String manipulation types (Uppercase, Capitalize) transform literals
- Branded types enforce nominal typing at compile time
- Satisfies operator (4.9+) validates types without widening
- Decorator order: property/parameter first, then method, then class
- Abstract constructors type mixin patterns
- Tuple variadic types with spread expressions
- Recursive conditional types handle nested data structures
- Template literal pattern inference matches URL patterns
- Mapped type as clauses filter and transform property keys
- Parameter decorators require emitDecoratorMetadata in tsconfig
