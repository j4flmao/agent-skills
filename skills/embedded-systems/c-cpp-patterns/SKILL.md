---
name: c-cpp-patterns
description: >
  Use this skill when the user says 'embedded C', 'embedded C++', 'firmware', 'register access', 'volatile', 'memory-mapped IO', 'ISR', 'ring buffer', 'struct packing', 'alignment', 'MISRA', 'RAII on microcontroller', 'linker script'. Writes and reviews C/C++ firmware for microcontrollers: safe register access, ISR/main data sharing, static memory, fixed-width types and packing, RAII and zero-cost C++ subsets, and the build/linker setup. Do NOT use for: RTOS task design (use rtos), Rust firmware (use bare-metal-rust), desktop/server C++ (use lang-cpp).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [embedded, c, cpp, firmware, misra, mmio]
---

# Embedded C/C++ Patterns

## Purpose
Firmware bugs come from a short list: wrong register access, data shared with ISRs unsafely, heap fragmentation, undefined behaviour the optimiser exploits, and layout assumptions. This skill gives the patterns that avoid them in C (C11/C17) and in a restricted C++ (C++17/20 without exceptions/RTTI/heap) suitable for MCUs.

## Agent Protocol

### Trigger
"embedded C", "embedded C++", "firmware", "register access", "volatile", "memory-mapped IO", "ISR", "ring buffer", "struct packing", "alignment", "MISRA", "linker script".

### Input Context
- MCU/core and vendor SDK (CMSIS, STM32 HAL/LL, nRF SDK/Zephyr, ESP-IDF, Pico SDK)
- Toolchain (arm-none-eabi-gcc, Clang, IAR, Keil) and language standard
- Coding standard (MISRA C:2012/2023, AUTOSAR C++14, CERT C)

### Output Artifact
C/C++ code, review findings, or build flags. No file unless requested.

### Response Format
```
Target: {MCU, toolchain, -std}
Pattern: {name}
Code: {snippet}
Concurrency: {what can interrupt this and how it is protected}
Checks: {static analysis / MISRA rules touched}
```

## 1. Register Access
- Use the vendor CMSIS device header (`stm32f4xx.h`, `nrf52840.h`): it defines peripheral structs with `volatile` members (`__IO`) at the right addresses. Hand-written addresses only when no header exists:
```c
#define GPIOA_ODR (*(volatile uint32_t *)0x40020014u)   /* STM32F4 example */
```
- Read-modify-write of a register is not atomic. If an ISR touches the same register, protect it or use set/reset registers (`GPIOx->BSRR = (1u << pin);` sets atomically).
- `volatile` prevents the compiler from caching or eliding accesses; it gives no atomicity and no ordering versus other memory. For DMA buffers add `__DMB()` / cache maintenance (`SCB_CleanDCache_by_Addr`) on cores with D-cache (Cortex-M7).

## 2. Sharing Data Between ISR and Main
```c
static volatile uint32_t g_ticks;              /* written in ISR, read in main */

void SysTick_Handler(void) { g_ticks++; }      /* 32-bit aligned store: atomic on Cortex-M */

uint32_t ticks_now(void) { return g_ticks; }   /* single aligned 32-bit read is atomic */

/* Multi-word or read-modify-write: short critical section */
static inline uint32_t irq_save(void) { uint32_t p = __get_PRIMASK(); __disable_irq(); return p; }
static inline void irq_restore(uint32_t p) { __set_PRIMASK(p); }
```
- Prefer C11 `<stdatomic.h>` (`atomic_fetch_add_explicit`) on cores with LDREX/STREX (Cortex-M3 and up); Cortex-M0/M0+ has no exclusive access — use critical sections.
- Save/restore PRIMASK rather than blindly re-enabling interrupts, so nested critical sections work.

### Lock-free single-producer/single-consumer ring buffer
```c
#define RB_SIZE 256u                            /* power of two */
typedef struct {
    uint8_t buf[RB_SIZE];
    volatile uint32_t head;                     /* written only by producer (ISR) */
    volatile uint32_t tail;                     /* written only by consumer (main) */
} ringbuf_t;

static bool rb_put(ringbuf_t *rb, uint8_t b)    /* ISR side */
{
    uint32_t h = rb->head;
    if ((h - rb->tail) == RB_SIZE) return false; /* full */
    rb->buf[h & (RB_SIZE - 1u)] = b;
    __DMB();                                     /* data visible before index */
    rb->head = h + 1u;
    return true;
}

static bool rb_get(ringbuf_t *rb, uint8_t *out) /* main side */
{
    uint32_t t = rb->tail;
    if (rb->head == t) return false;            /* empty */
    *out = rb->buf[t & (RB_SIZE - 1u)];
    __DMB();
    rb->tail = t + 1u;
    return true;
}
```
Free-running unsigned indices wrap correctly because RB_SIZE divides 2^32.

## 3. Memory Discipline
- No `malloc`/`free` after init (MISRA C:2012 Rule 21.3). Use static arrays, fixed-block pools, or allocate once at startup.
- Put large buffers in `static` storage, not on the stack; measure stack with a fill pattern or `-fstack-usage` + call-graph analysis.
- Place data explicitly with sections when needed: `__attribute__((section(".dtcm")))` for tightly coupled RAM, DMA-capable RAM regions on parts where not all RAM is DMA-reachable.

## 4. Types, Layout and Packing
- Use `<stdint.h>` fixed-width types; never assume `int` is 32 bits on 8/16-bit parts.
- Structs get padding so members are naturally aligned; order members largest-first to minimise padding; `_Static_assert(sizeof(hdr_t) == 12, "wire layout");`.
- Do not overlay packed structs on wire buffers and dereference members: `__attribute__((packed))` member access can be unaligned (faults on Cortex-M0, slow elsewhere) and endianness is host-dependent. Serialise with explicit byte shifts or `memcpy`.
- Bit-fields have implementation-defined layout — never use them to model registers or wire formats portably.
- Type punning: use `memcpy` (optimised away) — casting `float*` to `uint32_t*` violates strict aliasing.

## 5. Undefined Behaviour that Bites Firmware
| UB | Example | Fix |
|----|---------|-----|
| Signed overflow | `int32_t t = a + b;` near limits | unsigned arithmetic or checked add |
| Shift >= width | `1 << 32`, `1 << 31` on `int` | `1u << n` with `n < 32` checked |
| Unsequenced modification | `i = i++ + 1;` | split statements |
| Null/misaligned deref | packed struct member pointers | `memcpy` |
| Infinite loop without side effects | `while (!flag);` with non-volatile flag | `volatile` / atomic flag |

Compile with `-Wall -Wextra -Wconversion -Werror` and run cppcheck (with MISRA addon), clang-tidy, or a commercial MISRA checker.

## 6. C++ on Microcontrollers
- Build flags: `-fno-exceptions -fno-rtti -fno-threadsafe-statics`; avoid `<iostream>`; provide no-op `operator new` that traps if heap is forbidden.
- Zero-cost features worth using: `constexpr`, templates for compile-time configuration, `enum class`, `std::array`, `std::span` (C++20), `std::optional`, references, RAII.
- RAII critical section:
```cpp
class CriticalSection {
public:
    CriticalSection() : primask_(__get_PRIMASK()) { __disable_irq(); }
    ~CriticalSection() { __set_PRIMASK(primask_); }
    CriticalSection(const CriticalSection&) = delete;
    CriticalSection& operator=(const CriticalSection&) = delete;
private:
    uint32_t primask_;
};

void enqueue(Event e) {
    CriticalSection cs;          // released on every return path
    queue.push(e);
}
```
- Avoid virtual dispatch in hot ISR paths only when measured; vtables live in flash and are cheap, but they block inlining.
- Static initialisation order across translation units is unspecified — construct drivers explicitly in `main` or use function-local statics with `-fno-threadsafe-statics`.

## 7. Startup, Linker and Build
- Reset handler copies `.data` from flash to RAM, zeroes `.bss`, sets up clocks/FPU (`SCB->CPACR`), then calls `main`. `main` never returns: end with `for (;;) { __WFI(); }` or start the scheduler.
- Linker script defines `MEMORY { FLASH ..., RAM ... }`, stack top, and sections; check the map file (`-Wl,-Map=fw.map`) and `arm-none-eabi-size` in CI.
- Use `-ffunction-sections -fdata-sections -Wl,--gc-sections` and LTO to drop unused code.

## 8. Anti-Patterns
- `volatile` used as a mutex.
- `printf` in ISRs; blocking UART writes from time-critical code.
- Delay loops calibrated by counting iterations (breaks with optimisation level) — use a hardware timer.
- Ignoring HAL return codes.
- Disabling interrupts for long operations (flash erase, big memcpy).

## 9. Checklist
- [ ] Device header used for registers; RMW races analysed
- [ ] Every ISR-shared variable classified (atomic word / critical section / SPSC buffer)
- [ ] No heap after init; stack usage measured
- [ ] Wire formats serialised explicitly; `_Static_assert` on layouts
- [ ] Warnings-as-errors + static analysis (MISRA deviations documented)
- [ ] Map file and size budget checked in CI
