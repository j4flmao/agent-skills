# TypeScript: Variance and Inference (`infer`)

## 1. Variance: Covariance vs Contravariance
Understanding variance determines if a generic type can be safely cast.
- **Covariance** (Read): A `List<Dog>` is assignable to `List<Animal>`.
- **Contravariance** (Write): A function `(a: Animal) => void` is assignable to `(d: Dog) => void`.

### The Bivariance Hack
Historically, TS function parameters were bivariant (both co- and contravariant). This was unsafe. You must enable `"strictFunctionTypes": true` in `tsconfig.json` to force strict contravariance for function arguments.

```typescript
type Handler<T> = (event: T) => void;
interface Animal { name: string; }
interface Dog extends Animal { bark(): void; }

let handleAnimal: Handler<Animal> = (a) => console.log(a.name);
let handleDog: Handler<Dog> = (d) => d.bark();

// Valid: Contravariance allows this.
handleDog = handleAnimal; 
```

## 2. Advanced Inference with `infer`
The `infer` keyword allows you to pattern-match inside a conditional type to extract generic variables.

```typescript
// Extracts the Return Type of ANY generic function
type MyReturnType<T> = T extends (...args: any[]) => infer R ? R : any;

// Unwrapping a heavily nested Promise
type UnpackPromise<T> = T extends Promise<infer U> ? UnpackPromise<U> : T;

// Usage:
type DeepType = UnpackPromise<Promise<Promise<string>>>; // resolves to string
```
