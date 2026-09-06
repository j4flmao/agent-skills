# Compiler Design & LLVM

## 1. Skill Context
**Focus**: Understanding how high-level human-readable code is transformed into optimized machine code.
**Triggers**: compiler, llvm, ast, intermediate-representation, clang, parsing.

## 2. The Three-Phase Compiler Architecture
Before LLVM, every compiler (like GCC) was a monolithic block. If you wanted a new language, you had to write a compiler for every CPU architecture (x86, ARM, MIPS).
LLVM splits this into three modular phases:
1. **Frontend**: Reads source code (C++, Rust, Swift), parses it into an Abstract Syntax Tree (AST), and translates it into LLVM IR.
2. **Optimizer (Middle-end)**: Takes the IR and runs generic optimization passes (Dead Code Elimination, Loop Unrolling).
3. **Backend**: Takes the optimized IR and translates it into specific machine code (x86 assembly, ARM64 assembly, WebAssembly).

## 3. LLVM IR (Intermediate Representation)
The secret sauce of LLVM. It looks like a high-level assembly language but is strictly **Static Single Assignment (SSA)**.
- **SSA Property**: Every variable (register) is assigned exactly once. You cannot do `x = 1; x = 2;`. You must do `x1 = 1; x2 = 2;`. This mathematical strictness makes it incredibly easy for the Optimizer to track data flow and remove useless code.
