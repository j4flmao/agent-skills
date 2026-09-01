# TypeScript: Type-Level Programming with Generics

## 1. Turing Completeness of the Type System
TypeScript's type system is not just for static checking; it is a purely functional, Turing-complete programming language that runs during compilation.

## 2. Recursive Conditional Types
You can use generics to write recursive loops that parse strings or deeply modify nested objects.

### Deep Readonly Object Pattern
```typescript
type DeepReadonly<T> = T extends Builtin
  ? T
  : T extends Map<infer K, infer V>
  ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
  : T extends ReadonlyArray<infer U>
  ? ReadonlyArray<DeepReadonly<U>>
  : T extends {}
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : Readonly<T>;
```

### String Literal Parsing (Type-Level Split)
You can recursively parse strings into arrays at compile-time.
```typescript
type Split<S extends string, D extends string> =
    string extends S ? string[] :
    S extends '' ? [] :
    S extends `${infer T}${D}${infer U}` ? [T, ...Split<U, D>] : [S];

// The type is exactly ["users", "123", "posts"]
type PathSegments = Split<"users/123/posts", "/">;
```
