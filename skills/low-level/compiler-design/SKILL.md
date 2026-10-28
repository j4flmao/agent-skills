---
name: compiler-design
description: >
  Use this skill when the user says 'compiler', 'lexer', 'parser', 'AST', 'grammar', 'LLVM IR', 'SSA', 'optimization pass', 'code generation', 'register allocation', 'write an interpreter', 'MLIR', 'type checker'. Designs compilers and interpreters end to end: lexing and parsing strategies, AST and semantic analysis, IR design (SSA, LLVM IR), optimisation passes with the new pass manager, code generation and register allocation, plus testing. Do NOT use for: reading assembly output for performance only (use lang-assembly), CPU microarchitecture (use cpu-architecture), GPU kernel tuning.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [low-level, compilers, llvm, parsing, ssa, codegen]
---

# Compiler Design

## Purpose
Build a language implementation that is correct first and fast second. This skill gives decision rules for each phase — which parsing technique, what the AST and IR should look like, which optimisations matter, and when to lean on LLVM/MLIR/Cranelift instead of writing a backend.

## Agent Protocol

### Trigger
"compiler", "lexer", "parser", "AST", "grammar", "LLVM IR", "SSA", "optimization pass", "codegen", "register allocation", "interpreter", "MLIR", "type checker".

### Input Context
- Source language (existing or new), size of the grammar, target (native, WASM, bytecode VM, JVM)
- Implementation language and whether LLVM/Cranelift/MLIR may be used
- Priorities: compile speed, runtime speed, error messages, incremental/IDE support

### Output Artifact
Phase design, grammar, data structures, pass code or LLVM IR examples. No file unless requested.

### Response Format
```
Pipeline: {lex -> parse -> resolve/typecheck -> IR -> passes -> codegen}
Choice per phase: {technique + reason}
Code/IR: {snippet}
Tests: {golden files, fuzzing, differential testing}
```

## 1. Pipeline
```
source → lexer (tokens) → parser (CST/AST) → name resolution + type checking (typed AST / HIR)
       → lowering to IR (SSA) → optimisation passes → instruction selection
       → register allocation + scheduling → object code / bytecode
```
Keep each stage's data structure explicit; most bugs come from phases sharing mutable state.

## 2. Lexing
- Tokens = kind + span (byte offsets) + optional interned value. Spans enable good diagnostics.
- Hand-written lexers (a `match` on the current char) are simple and fast; generators (re2c, flex, `logos` in Rust) build DFAs from regular expressions.
- Handle maximal munch, keywords vs identifiers (look up after scanning an identifier), nested comments (needs a counter, not a regex), and string escapes.

## 3. Parsing
| Technique | Strength | Use |
|-----------|----------|-----|
| Recursive descent (LL) | readable, great errors, easy recovery | most production compilers (GCC, Clang, Go, Rust, TypeScript use hand-written parsers) |
| Pratt / precedence climbing | expressions with many precedence levels | embedded inside recursive descent |
| LR/LALR (yacc/bison), GLR | handles left recursion, grammar-checked | when a formal grammar is the source of truth |
| PEG / packrat | ordered choice, no ambiguity | DSLs; watch memory and error quality |
| Parser combinators | compact in functional languages | small/medium languages |

Pratt expression parser core:
```python
def parse_expr(self, min_bp=0):
    lhs = self.parse_prefix()                  # literals, identifiers, unary ops, parens
    while True:
        op = self.peek()
        if op.kind not in INFIX: break
        l_bp, r_bp = INFIX[op.kind]            # e.g. '+': (10, 11) left-assoc, '^': (31, 30) right-assoc
        if l_bp < min_bp: break
        self.advance()
        rhs = self.parse_expr(r_bp)
        lhs = Binary(op, lhs, rhs)
    return lhs
```
- Error recovery: synchronise on statement boundaries (`;`, `}`) and keep parsing to report several errors.
- For IDEs, a lossless concrete syntax tree (Roslyn, rust-analyzer's rowan, tree-sitter) enables incremental reparsing and formatting.

## 4. Semantic Analysis
- Name resolution builds scopes (stack of hash maps) and links uses to declarations.
- Type checking: simple languages check bottom-up; ML-style languages use Hindley–Milner unification; modern languages often use bidirectional checking (infer + check modes).
- Desugar after checking so errors refer to user code; keep spans on every node.

## 5. Intermediate Representation
- **SSA**: every value assigned once; φ-nodes merge values at control-flow joins. Simplifies dataflow analyses (constant propagation, GVN, DCE).
- Construct SSA with the dominance-frontier algorithm (Cytron et al.) or, from an AST directly, Braun et al.'s simple SSA construction. LLVM frontends usually emit `alloca`s and let `mem2reg`/SROA promote them.

Example LLVM IR for `int max(int a, int b) { return a > b ? a : b; }`:
```llvm
define i32 @max(i32 %a, i32 %b) {
entry:
  %cmp = icmp sgt i32 %a, %b
  br i1 %cmp, label %then, label %else
then:
  br label %end
else:
  br label %end
end:
  %r = phi i32 [ %a, %then ], [ %b, %else ]
  ret i32 %r
}
```
(After `simplifycfg` this becomes a single `select`.)

## 6. Optimisation Passes
- Analysis passes compute facts (dominator tree, loop info, alias analysis, scalar evolution); transform passes rewrite IR (inlining, SROA, InstCombine, GVN, LICM, loop unrolling/vectorisation, DCE).
- LLVM's **new pass manager** (default since LLVM 13; the legacy PM for the middle-end optimisation pipeline was removed in LLVM 17, while codegen still largely uses it) caches analyses and invalidates them based on the `PreservedAnalyses` each pass returns:
```cpp
struct CountAdds : llvm::PassInfoMixin<CountAdds> {
  llvm::PreservedAnalyses run(llvm::Function &F, llvm::FunctionAnalysisManager &) {
    unsigned n = 0;
    for (auto &BB : F) for (auto &I : BB)
      if (I.getOpcode() == llvm::Instruction::Add) ++n;
    llvm::errs() << F.getName() << ": " << n << " adds\n";
    return llvm::PreservedAnalyses::all();          // analysis-only: nothing changed
  }
};
```
Run with `opt -passes='default<O2>'` or register plugins via `-load-pass-plugin`.
- Biggest wins for a new language: inlining, SROA/mem2reg, constant folding/propagation, DCE, and avoiding redundant bounds/null checks you generate yourself.

## 7. Backend
- Instruction selection: tree/DAG pattern matching (LLVM SelectionDAG, GlobalISel), or macro expansion for simple backends.
- Register allocation: linear scan (fast; common in JITs) vs graph colouring / LLVM's default "greedy" allocator (better code, slower); Cranelift uses the `regalloc2` backtracking allocator. Spill to the stack when out of registers.
- Respect the platform ABI (calling convention, stack alignment, callee-saved registers) or calls into C will break.
- Alternatives to writing a backend: LLVM (best code, slow compile), Cranelift (fast compile, good code; used by Wasmtime and rustc's optional backend), QBE (tiny), emitting C, or targeting WASM/JVM bytecode.

## 8. Interpreters
- Tree-walking: simplest, slowest. Bytecode VM with a compact instruction set (stack or register based) is typically several times faster; add inline caches for dynamic dispatch; JIT only after the VM is solid.

## 9. Testing
- Golden/snapshot tests per phase (tokens, AST dump, IR dump) and end-to-end run tests.
- Differential testing against another implementation; fuzzing the parser (libFuzzer/AFL) and the optimiser (Csmith-style random programs).
- Verify IR after every pass in debug builds (`llvm::verifyFunction`).

## 10. Anti-Patterns
- Throwing away spans → useless error messages.
- Optimising the AST instead of lowering to an IR designed for analysis.
- Writing a custom native backend before the language semantics are stable.
- Undefined behaviour in the source language leaking into IR as LLVM `poison` without intent (e.g. using `nsw` adds for wrapping integers).

## 11. Checklist
- [ ] Each phase has its own data structure and tests
- [ ] Spans preserved through to diagnostics
- [ ] IR in SSA; verifier runs after passes in debug
- [ ] Target ABI followed for FFI
- [ ] Fuzzing of parser and optimiser in CI
