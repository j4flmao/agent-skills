# C Skill Architecture (Low-Level & Bare Metal)

## 1. Skill Context
**Focus**: Systems programming, kernel development, embedded systems, and high-performance bare-metal computing.
**Triggers**: c, bare-metal, pointers, memory-management, volatile, undefined-behavior.

## 2. The Illusion of C
C is often called "portable assembly," but this is a dangerous misconception. Modern C compilers (GCC, Clang) are highly aggressive optimizing engines. If you write code that violates the C standard, the compiler will silently optimize it into something entirely different or delete it completely. This is known as **Undefined Behavior (UB)**.

## 3. Core Low-Level Concepts

### A. The `volatile` Keyword
In bare-metal programming, memory can change without the CPU's knowledge (e.g., a hardware sensor updating a memory address). The `volatile` keyword tells the compiler: *"Never cache this variable in a CPU register, and never optimize away reads/writes to it. Always fetch it from RAM."*
Without `volatile`, a loop waiting for a hardware flag to turn `1` will be optimized into an infinite loop.

### B. Strict Aliasing and `restrict`
The C standard assumes that pointers of different types (e.g., `int*` and `float*`) never point to the same memory address (Strict Aliasing). 
If you cast a `float*` to an `int*` to read its bits, you invoke Undefined Behavior, and the compiler may reorder the instructions destructively. 
- **Solution**: Use `memcpy` or a `union` for type punning.
- **`restrict` Keyword**: Tells the compiler that a pointer is the *only* way to access that memory, allowing the compiler to aggressively optimize loops without worrying about overlapping memory writes.

## 4. References
- `references/memory-mapped-io.md` — Communicating with hardware via MMIO.
- `references/inline-assembly.md` — Injecting raw opcodes (Extended Asm).
