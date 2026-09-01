# Go: Generics Compiler Internals (Go 1.18+)

## 1. Monomorphization (Stenciling) vs Type Erasure
- **C++/Rust (Monomorphization)**: The compiler generates a brand new copy of the machine code for every type used. Fast runtime, but massive binary bloat.
- **Java (Type Erasure)**: The compiler removes generics entirely, treating everything as `Object`. Requires boxing/unboxing overhead.

## 2. Go's Hybrid Approach: GC Shape Stenciling
Go groups generic types by their **GC Shape** (their memory layout and pointer characteristics).
- `*int`, `*string`, and `*MyStruct` all have the exact same GC shape (a machine-word sized pointer).
- `int` and `float64` have different GC shapes.

For types sharing the same GC shape, Go compiles the generic function **only once**.
To handle method calls dynamically, Go passes an invisible **Dictionary** (similar to a VTable) at runtime.

### Trade-offs
- **Binary Size**: Much smaller than C++/Rust because pointer types share implementations.
- **Runtime Performance**: Extremely fast for plain memory operations, but calling an interface method on a generic type incurs a slight dictionary-lookup overhead compared to non-generic code.
