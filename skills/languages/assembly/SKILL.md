---
name: lang-assembly
description: >
  Use this skill when the user says 'assembly', 'asm', 'x86-64', 'ARM64', 'AArch64', 'calling convention', 'System V ABI', 'Windows x64 ABI', 'registers', 'read disassembly', 'objdump', 'Compiler Explorer', 'inline asm', 'stack frame'. Reads and writes x86-64 and AArch64 assembly: calling conventions (System V, Microsoft x64, AAPCS64), stack frames, reading compiler output to explain performance or bugs, writing small hand-tuned routines, and assembler syntax differences. Do NOT use for: microarchitecture tuning theory (use cpu-architecture), compiler implementation (use compiler-design), kernel entry paths in depth (use kernel-development).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [languages, assembly, x86-64, arm64, abi]
---

# Assembly (x86-64 and AArch64)

## Purpose
Most engineers need assembly to *read* compiler output — to confirm vectorisation, find a hidden branch, or understand a crash — and occasionally to write a small routine or ABI glue. This skill gives the calling conventions, frame layouts and syntax needed to do both correctly.

## Agent Protocol

### Trigger
"assembly", "asm", "x86-64", "ARM64", "AArch64", "calling convention", "System V ABI", "Windows x64 ABI", "registers", "disassembly", "objdump", "Compiler Explorer", "inline asm".

### Input Context
- Architecture and OS (ABI differs between Linux/macOS and Windows)
- Assembler/syntax (GAS AT&T, GAS `.intel_syntax`, NASM, MASM, Apple/LLVM AArch64)
- The C/C++/Rust source and compiler flags when reading compiler output

### Output Artifact
Annotated disassembly, an assembly routine with its C prototype, or inline-asm code. No file unless requested.

### Response Format
```
Arch/ABI: {x86-64 SysV | Microsoft x64 | AAPCS64 (Linux/Apple)}
Prototype: {C signature}
Code: {asm with comments}
Register use: {args, return, clobbered, callee-saved preserved}
Verify: {test harness / objdump / gdb steps}
```

## 1. x86-64 System V ABI (Linux, macOS, BSD)
- Integer/pointer args: `rdi, rsi, rdx, rcx, r8, r9`; float/vector args: `xmm0–xmm7`; rest on the stack (right to left).
- Return: `rax` (and `rdx` for 128-bit), floats in `xmm0`.
- Callee-saved: `rbx, rbp, r12–r15` (and `rsp`). Everything else is caller-saved.
- Stack must be 16-byte aligned at the `call` instruction (so `rsp % 16 == 8` on function entry). Misalignment crashes SSE code (`movaps`) in callees.
- 128-byte **red zone** below `rsp` usable by leaf functions (not in kernels or signal-unsafe contexts).
- Variadic calls: `al` = number of vector registers used.

## 2. Microsoft x64 ABI (Windows)
- Args: `rcx, rdx, r8, r9` (floats in `xmm0–xmm3`, positional — the 2nd arg uses `rdx` or `xmm1`), rest on stack.
- Caller reserves 32 bytes of **shadow space** above the return address for every call.
- Callee-saved: `rbx, rbp, rdi, rsi, r12–r15, xmm6–xmm15`.
- No red zone. Functions need unwind info (`.pdata/.xdata`, MASM `PROC FRAME`) for exceptions and stack walking.

## 3. AArch64 AAPCS64 (Linux, Android, Apple)
- Args: `x0–x7` (ints/pointers), `v0–v7` (FP/SIMD); return in `x0` / `v0`.
- Callee-saved: `x19–x28`, frame pointer `x29`, and the low 64 bits of `v8–v15`. `x30` is the link register (return address); `x18` is platform-reserved on Apple and Windows.
- `sp` must stay 16-byte aligned at all times.
- Apple arm64 differences: variadic args always on the stack; frame pointer mandatory.

## 4. Stack Frames
x86-64 with frame pointer:
```asm
my_func:
    push    rbp            ; save caller's frame pointer (rsp now 16-aligned)
    mov     rbp, rsp
    sub     rsp, 32        ; locals, keep multiple of 16
    ; ... body ...
    leave                  ; mov rsp, rbp ; pop rbp
    ret
```
AArch64:
```asm
my_func:
    stp     x29, x30, [sp, #-32]!   // push FP and LR, pre-decrement sp
    mov     x29, sp
    // ... body ...
    ldp     x29, x30, [sp], #32     // restore and pop
    ret
```
Optimised code often omits the frame pointer (`-fomit-frame-pointer`); profilers then need DWARF/ORC unwind info. Many distros now build with frame pointers again for better profiling.

## 5. A Complete Routine (System V, NASM syntax)
```asm
; uint64_t sum_u64(const uint64_t *p, size_t n)
global sum_u64
section .text
sum_u64:
    xor     eax, eax            ; acc = 0 (writing eax zero-extends to rax)
    test    rsi, rsi
    jz      .done
.loop:
    add     rax, [rdi]
    add     rdi, 8
    dec     rsi
    jnz     .loop
.done:
    ret
```
Leaf function: no callee-saved registers touched, no stack use, so no prologue needed. A C compiler at `-O2/-O3` will usually beat this (unrolling, SIMD) — benchmark before hand-writing.

## 6. Reading Compiler Output
- Use Compiler Explorer (godbolt.org) or `objdump -d -M intel --no-show-raw-insn -C binary`, `llvm-objdump`, or `gcc -S -O2 -masm=intel`.
- Look for: vector instructions (`vaddpd ymm`, `fadd v0.2d`) confirming vectorisation; unexpected `call`s (non-inlined helpers, `memcpy`); branches in hot loops (`jcc`) vs `cmov`/`csel`; spills to the stack (`mov [rsp+...]`) signalling register pressure; bounds/overflow checks.
- AT&T vs Intel syntax: AT&T is `op src, dst` with `%reg` and `$imm` and size suffixes (`movq %rdi, %rax`); Intel is `op dst, src` (`mov rax, rdi`).

## 7. Inline Assembly (GCC/Clang)
```c
static inline uint64_t rdtsc(void)
{
    uint32_t lo, hi;
    __asm__ volatile ("rdtsc" : "=a"(lo), "=d"(hi));   /* outputs; no inputs */
    return ((uint64_t)hi << 32) | lo;
}
```
- Declare every output, input and clobber (`"memory"`, `"cc"`, registers) or the optimiser will miscompile around it.
- Prefer compiler intrinsics (`<immintrin.h>`, `<arm_neon.h>`, `__builtin_*`) over inline asm: they are portable across compilers' register allocation and optimisation. MSVC x64 has no inline asm — use intrinsics or separate `.asm` files.

## 8. Context Switching (Kernel Level)
Interrupt/exception entry on x86-64 pushes `ss, rsp, rflags, cs, rip` (and an error code for some exceptions); the handler saves general registers, and a scheduler switches tasks by saving callee-saved registers and `rsp` of the old task, loading the new task's `rsp` (and `cr3` when changing address space), then returning with `ret` or `iretq`. The `pusha` instruction does not exist in 64-bit mode — registers are pushed individually.

## 9. Anti-Patterns
- Forgetting callee-saved registers or stack alignment in hand-written functions.
- Using the red zone in kernel or interrupt code.
- Inline asm without a `"memory"` clobber when it reads or writes memory.
- Hand-written asm that is never re-benchmarked against newer compilers.
- Mixing up AT&T and Intel operand order while porting snippets.

## 10. Checklist
- [ ] ABI chosen for the exact OS; argument and return registers correct
- [ ] Callee-saved registers preserved; stack aligned at calls
- [ ] Unwind/CFI info present (`.cfi_*` directives or MASM frame directives) for anything that can be unwound through
- [ ] Unit test from C comparing against a reference implementation
- [ ] Benchmarked against compiler output with the same flags
