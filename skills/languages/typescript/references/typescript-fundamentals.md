# TypeScript Fundamentals

## What is TypeScript?

TypeScript is a typed superset of JavaScript that compiles to plain JavaScript. It adds static type checking, interfaces, generics, and modern ECMAScript features with backward compatibility. TypeScript catches type errors at compile time rather than runtime.

## Core Types

### Primitive Types
```typescript
let name: string = "Alice";
let age: number = 30;
let isActive: boolean = true;
let id: symbol = Symbol("id");
let big: bigint = 100n;
let nothing: null = null;
let notDefined: undefined = undefined;
```

### Object Types
```typescript
// Interface
interface User {
  readonly id: number;
  name: string;
  email?: string;  // Optional
}

// Type alias
type Point = {
  x: number;
  y: number;
};

// Index signature
type Dictionary<T> = { [key: string]: T };
```

### Array & Tuple
```typescript
let numbers: number[] = [1, 2, 3];
let names: Array<string> = ["a", "b"];

// Tuple (fixed length, typed positions)
let pair: [string, number] = ["Alice", 30];
// Optional tuple elements
let optional: [string, number?] = ["hello"];
```

### Union & Intersection
```typescript
// Union — value can be one of several types
type Status = "active" | "inactive" | "banned";
type ID = string | number;

// Intersection — combine types
type WithTimestamps = {
  createdAt: Date;
  updatedAt: Date;
};
type AuditedUser = User & WithTimestamps;
```

### Literal Types
```typescript
// String literal union
type Direction = "up" | "down" | "left" | "right";

// Numeric literal
type DiceRoll = 1 | 2 | 3 | 4 | 5 | 6;

// Template literal (TypeScript 4.1+)
type EventName = `user:${"created" | "updated" | "deleted"}`;
```

## Type System

### Type Inference
```typescript
// TypeScript infers types when possible
let message = "hello";  // type: string
let count = 42;         // type: number

// Return type inference
function add(a: number, b: number) {
  return a + b;  // inferred: number
}
```

### Type Annotations
```typescript
// Parameter and return types
function greet(name: string): string {
  return `Hello, ${name}`;
}

// Variable annotation
let user: User = { id: 1, name: "Alice" };

// Array + type
const items: string[] = ["a", "b"];
```

### Type Assertions
```typescript
// Angle bracket (not in .tsx)
let value: any = "hello";
let len: number = (<string>value).length;

// As syntax
let length: number = (value as string).length;

// Non-null assertion
let element = document.getElementById("root")!;
```

### Type Guards
```typescript
// typeof
function format(value: string | number) {
  if (typeof value === "string") {
    return value.toUpperCase();
  }
  return value.toFixed(2);
}

// instanceof
class Order {}
class Invoice {}
function handle(doc: Order | Invoice) {
  if (doc instanceof Order) {
    // Order-specific logic
  }
}

// Custom type guard
function isUser(obj: any): obj is User {
  return "id" in obj && "name" in obj;
}

// in operator
if ("email" in user) {
  console.log(user.email);
}
```

## Interfaces vs Types

```typescript
// Interface — extensible, declaration merging
interface Animal {
  name: string;
}
interface Animal {
  age: number;  // Merges with above
}

// Type — cannot be reopened, can do more things
type AnimalType = {
  name: string;
};
type NameOrId = string | number;  // Union (interface can't)
type Pair<T> = [T, T];            // Tuple
type Keys = keyof User;           // Keyof
```

## Generics

```typescript
// Generic function
function first<T>(items: T[]): T | undefined {
  return items[0];
}

// Generic interface
interface Repository<T> {
  findById(id: string): Promise<T | null>;
  save(item: T): Promise<T>;
  delete(id: string): Promise<void>;
}

// Generic constraints
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

// Multiple generics
function pair<A, B>(a: A, b: B): [A, B] {
  return [a, b];
}

// Default type parameter
function create<T = string>(items: T[]): T[] {
  return items;
}
```

## Enums

```typescript
// Numeric enum (auto-incrementing)
enum Direction {
  Up,      // 0
  Down,    // 1
  Left,    // 2
  Right,   // 3
}

// String enum
enum Status {
  Active = "ACTIVE",
  Inactive = "INACTIVE",
  Pending = "PENDING",
}

// Const enum (completely inlined, no runtime object)
const enum Size {
  Small = "S",
  Medium = "M",
  Large = "L",
}

// Better alternative: const + union
const STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
} as const;
type Status = (typeof STATUS)[keyof typeof STATUS];
```

## Functions

```typescript
// Function type
type MathOp = (a: number, b: number) => number;
const add: MathOp = (a, b) => a + b;

// Overloads
function len(x: string): number;
function len(x: any[]): number;
function len(x: string | any[]): number {
  return x.length;
}

// Rest parameters
function sum(...numbers: number[]): number {
  return numbers.reduce((a, b) => a + b, 0);
}

// 'this' typing
function onClick(this: HTMLElement, event: MouseEvent) {
  console.log(this.id);
}
```

## Configuring TypeScript

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Building & Running

```bash
# Compile TypeScript
npx tsc

# Type-check only (no emit)
npx tsc --noEmit

# Watch mode
npx tsc --watch

# Execute with tsx (no build step)
npx tsx src/index.ts

# Build library with tsup
npx tsup src/index.ts --format esm,cjs --dts --clean
```
