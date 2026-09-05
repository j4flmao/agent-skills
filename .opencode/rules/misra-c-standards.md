---
description: "j4flmao/rules — Mandatory MISRA-C and Embedded safety standards"
glob: "*"
---

# Embedded & MISRA-C Safety Standards

Cursor/AI MUST follow these rules when writing C/C++ or Rust code for Embedded Systems or RTOS environments.

## 1. Ban Dynamic Memory Allocation
- **Rule**: NEVER use `malloc()`, `calloc()`, `realloc()`, or `free()` (or the C++ `new` keyword) in embedded C code.
- **Why**: Heap fragmentation will eventually cause `malloc()` to fail or take non-deterministic time, crashing the device.
- **Action**: All memory MUST be statically allocated at compile time (use global arrays, memory pools, or the stack). 

## 2. ISR (Interrupt Service Routine) Restrictions
- **Rule**: NEVER call blocking functions inside an ISR.
- **Action**: Do not use `printf`, do not wait for a `Mutex`, do not use floating-point math inside an ISR. Defer work to a background task using RTOS Queues or Semaphores.

## 3. Infinite Loop Safety
- **Rule**: In bare-metal programming, the `main()` function MUST NEVER return.
- **Action**: Always end `main()` with an infinite loop `while(1) { ... }` or put the CPU into a low-power sleep state `__WFI();`.

## 4. Volatile Keyword
- **Rule**: All pointers mapping to hardware registers MUST be marked as `volatile`.
- **Action**: E.g., `volatile uint32_t * const UART_DR = (uint32_t *)0x40013804;`
