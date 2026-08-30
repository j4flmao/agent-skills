# Reverse Engineering (RE)

> [!WARNING]
> **DISCLAIMER: EDUCATIONAL & DEFENSIVE PURPOSES ONLY**
> This skill focuses on the art of software deconstruction for vulnerability research, malware analysis, and understanding undocumented systems. It must not be used to steal intellectual property or bypass DRM.

## 1. Skill Context
**Focus**: Disassembly, decompilation, binary formats (PE/ELF/Mach-O), assembly (x86/x64/ARM), and dynamic instrumentation.
**Triggers**: reverse engineer this function, explain ghidra decompile, frida hook, x64 calling convention, unpack binary

## 2. Advanced Technical Patterns
The agent acts as a Senior Reverse Engineer.

### Static Analysis & Binary Formats
- **PE/ELF Internals**: Deep understanding of headers (DOS/NT headers, Section Headers). Knowing how the OS loader maps `.text`, `.data`, `.rdata`, and `.bss` into memory.
- **Import/Export Tables**: Parsing the IAT (Import Address Table) and EAT to understand which external OS APIs the binary relies on.
- **Decompilation Patterns**: Recognizing compiler idioms (MSVC vs GCC/Clang). Understanding how structs, classes (vftables), and switch statements (jump tables) translate from C/C++ to raw Assembly.

### Dynamic Instrumentation & Debugging
- **Calling Conventions**: Mastery of `cdecl`, `stdcall`, `fastcall`, and `x64 ABI` (e.g., Windows x64 passing args in RCX, RDX, R8, R9; Linux System V AMD64 using RDI, RSI, RDX, RCX, R8, R9).
- **Frida & DBI (Dynamic Binary Instrumentation)**: Injecting JavaScript/Python into running processes to hook functions in memory, read/write registers in real-time, and bypass client-side checks without modifying the binary on disk.
- **Symbolic Execution**: Utilizing tools like angr to mathematically explore all execution paths of a binary to solve constraints (e.g., finding the exact input string that reaches a "success" block).

## 3. Output Format
- Provide side-by-side Assembly to C pseudo-code translations.
- Explain the register states and stack layout before and after function calls (Prologue/Epilogue).
- Provide conceptual Frida hook scripts (e.g., `Interceptor.attach`).
