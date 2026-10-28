---
description: "j4flmao/rules — Mandatory MISRA-C and Embedded safety standards"
glob: "*"
---

# Embedded & MISRA-C Safety Standards

Cursor/AI MUST follow these rules when writing C/C++ or Rust code for Embedded Systems or RTOS environments. Reference standard: MISRA C:2012 (with amendments) / MISRA C:2023.

## 1. No Dynamic Memory Allocation at Runtime
- **Rule**: Do not use `malloc()`, `calloc()`, `realloc()`, or `free()` (MISRA C:2012 Rule 21.3), or C++ `new`/`delete`, after initialization.
- **Why**: Heap fragmentation and non-deterministic allocation time eventually cause allocation failures or missed deadlines in long-running devices.
- **Action**: Allocate statically (global/static arrays, fixed-size memory pools, stack). If an RTOS heap is unavoidable, allocate only during startup and never free (e.g. FreeRTOS `heap_1` or static creation APIs like `xTaskCreateStatic`). In Rust, use `#![no_std]` with `heapless` collections.

## 2. ISR (Interrupt Service Routine) Restrictions
- **Rule**: NEVER block inside an ISR. Do not call `printf`, take a mutex, or wait on a queue.
- **Action**: Keep ISRs short. Clear the interrupt source, capture data, and defer the work to a task using ISR-safe APIs (FreeRTOS `xQueueSendFromISR`, `xTaskNotifyFromISR`, then `portYIELD_FROM_ISR`).
- **Floating point**: Avoid it in ISRs unless the FPU context is saved. On Cortex-M4F/M7, lazy stacking makes it correct but adds latency; on cores without an FPU it is slow soft-float.

## 3. main() Never Returns
- **Rule**: In bare-metal programs, `main()` MUST NOT return; there is nothing to return to.
- **Action**: End `main()` with a superloop `for (;;) { ... }` that sleeps with `__WFI()` when idle, or start the RTOS scheduler (which does not return).

## 4. volatile and Shared Data
- **Rule**: Access memory-mapped registers through `volatile` pointers, preferably via the vendor/CMSIS device header rather than hand-written addresses.
  ```c
  /* Example only (STM32F1 USART1->DR); take addresses from the device header */
  volatile uint32_t * const UART_DR = (volatile uint32_t *)0x40013804u;
  ```
- **Rule**: Mark variables shared between an ISR and the main context `volatile`. `volatile` does not make access atomic: protect multi-word or read-modify-write access with a critical section or atomic operations.

## 5. Verification
- **Rule**: Compile with warnings as errors and run a MISRA checker (e.g. cppcheck MISRA addon, PC-lint Plus, Polyspace). Document every deviation with a justification.
