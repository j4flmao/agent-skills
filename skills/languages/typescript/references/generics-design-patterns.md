# TypeScript: Generic Design Patterns

## 1. The Typestate Pattern (Compile-Time State Machines)
By returning different generic configurations, you can prevent developers from calling methods in the wrong order.

```typescript
class ServerBuilder<State extends 'empty' | 'hasDb' | 'ready'> {
  private constructor(private config: any = {}) {}
  
  static create(): ServerBuilder<'empty'> {
    return new ServerBuilder();
  }
  
  withDatabase(dbUrl: string): ServerBuilder<'hasDb'> {
    return new ServerBuilder({ ...this.config, dbUrl });
  }
  
  // This method ONLY exists on ServerBuilder<'hasDb'>
  withPort(this: ServerBuilder<'hasDb'>, port: number): ServerBuilder<'ready'> {
    return new ServerBuilder({ ...this.config, port });
  }
  
  build(this: ServerBuilder<'ready'>) {
    return new Server(this.config);
  }
}
// ServerBuilder.create().build(); // COMPILE ERROR!
```

## 2. Higher-Order Type Emulation (HKT)
TypeScript lacks Higher-Kinded Types (passing uninstantiated generic types like `F<T>`). We emulate this using Defunctionalization.

```typescript
export interface HKT<T = any> {
  readonly _returned: unknown; 
}

export interface ArrayHKT extends HKT {
  readonly _returned: Array<this["_input"]>;
  _input: unknown;
}

export type Apply<F extends HKT, T> = (F & { _input: T })["_returned"];
type Matrix = Apply<ArrayHKT, number>; // number[]
```
